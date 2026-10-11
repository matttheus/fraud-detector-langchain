import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Account, Transaction } from './api'

type Routes = Record<string, (body: unknown) => unknown>

function mockApi(routes: Routes) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`
    const handler = routes[key]
    if (!handler) throw new Error(`Unexpected request: ${key}`)
    const result = await handler(init?.body ? JSON.parse(String(init.body)) : undefined)
    return result instanceof Response ? result : Response.json(result)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const ana: Account = { id: 1, name: 'Ana', country: 'BR', balanceCents: 50_000, createdAt: '2026-10-10T12:00:00Z' }

const declined: Transaction = {
  id: 2,
  accountId: 1,
  type: 'payment',
  amountCents: 45_000,
  merchant: 'GiftCardMall',
  category: 'gift_cards',
  country: 'NG',
  status: 'declined',
  riskScore: 92,
  fraudReasons: ['Fresh credits drained into gift cards abroad'],
  reviewedBy: 'llm',
  createdAt: '2026-10-10T12:05:00Z',
}

async function openAnasAccount() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Ana' }))
  await screen.findByRole('heading', { name: 'Ana' })
  return user
}

describe('App', () => {
  it('shows the project disclaimer', async () => {
    mockApi({ 'GET /api/accounts': () => [] })
    render(<App />)

    const disclaimer = screen.getByRole('complementary', { name: 'Disclaimer' })
    expect(disclaimer).toHaveTextContent('this is a didactic project')
    expect(disclaimer).toHaveTextContent('Why the model used here is not recommended for production')
    expect(disclaimer).toHaveTextContent('Not specialized:')
    expect(disclaimer).toHaveTextContent('I just want to explore the use of LangChain.')
    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })

  it('creates an account and opens its dashboard', async () => {
    const created = { ...ana, balanceCents: 0 }
    const fetchMock = mockApi({
      'GET /api/accounts': () => [],
      'POST /api/accounts': () => created,
      'GET /api/accounts/1': () => created,
      'GET /api/accounts/1/transactions': () => [],
    })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Name'), 'Ana')
    await user.selectOptions(screen.getByLabelText('Home country'), 'BR')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Ana' })).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    const createCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({ name: 'Ana', country: 'BR' })
  })

  it('shows the fraud check running, then why the payment was declined', async () => {
    let releasePayment = () => {}
    let paid = false
    const payments: unknown[] = []
    mockApi({
      'GET /api/accounts': () => [ana],
      'GET /api/accounts/1': () => ana,
      'GET /api/accounts/1/transactions': () => (paid ? [declined] : []),
      'POST /api/accounts/1/payments': async (body) => {
        payments.push(body)
        await new Promise<void>((resolve) => (releasePayment = resolve))
        paid = true
        return { transaction: declined, account: ana }
      },
    })
    const user = await openAnasAccount()

    await user.click(screen.getByRole('button', { name: 'Suspicious purchase' }))
    await user.click(screen.getByRole('button', { name: 'Pay' }))

    expect(await screen.findByRole('button', { name: 'Running fraud check…' })).toBeDisabled()
    releasePayment()

    const result = await screen.findByRole('status')
    expect(result).toHaveTextContent('Payment declined')
    expect(result).toHaveTextContent('Risk 92/100 · reviewed by Claude')
    expect(result).toHaveTextContent('Fresh credits drained into gift cards abroad')
    expect(payments).toEqual([{ amountCents: 45_000, merchant: 'GiftCardMall', category: 'gift_cards', country: 'NG' }])
    expect(await screen.findByText("Claude's reasons")).toBeInTheDocument()
  })

  it('shows errors from the API', async () => {
    mockApi({
      'GET /api/accounts': () => [ana],
      'GET /api/accounts/1': () => ana,
      'GET /api/accounts/1/transactions': () => [],
      'POST /api/accounts/1/payments': () => Response.json({ message: 'Insufficient balance' }, { status: 400 }),
    })
    const user = await openAnasAccount()

    await user.type(screen.getByLabelText('Amount (USD)'), '9999')
    await user.type(screen.getByLabelText('Merchant'), 'Apple Store')
    await user.click(screen.getByRole('button', { name: 'Pay' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient balance')
  })
})
