export type TransactionStatus = 'approved' | 'review' | 'declined'

export type Account = {
  id: number
  name: string
  country: string
  balanceCents: number
  createdAt: string
}

export type Transaction = {
  id: number
  accountId: number
  type: 'credit' | 'payment'
  amountCents: number
  merchant: string | null
  category: string | null
  country: string | null
  status: TransactionStatus
  riskScore: number | null
  fraudReasons: string[]
  reviewedBy: 'rules' | 'llm' | null
  createdAt: string
}

export type PaymentInput = {
  amountCents: number
  merchant: string
  category: string
  country: string
}

export const CATEGORIES = [
  'groceries',
  'restaurants',
  'fuel',
  'electronics',
  'travel',
  'gaming',
  'streaming',
  'gift_cards',
  'crypto',
  'wire_transfer',
]

export const COUNTRIES: Record<string, string> = {
  US: 'United States',
  BR: 'Brazil',
  PT: 'Portugal',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IN: 'India',
  CN: 'China',
  NG: 'Nigeria',
  RU: 'Russia',
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message
    throw new Error(message ?? `Request failed with status ${response.status}`)
  }
  return data as T
}

export const api = {
  listAccounts: () => request<Account[]>('/accounts'),
  createAccount: (input: { name: string; country: string }) => request<Account>('/accounts', input),
  getAccount: (id: number) => request<Account>(`/accounts/${id}`),
  addCredits: (id: number, amountCents: number) => request<Account>(`/accounts/${id}/credits`, { amountCents }),
  transactions: (id: number) => request<Transaction[]>(`/accounts/${id}/transactions`),
  pay: (id: number, payment: PaymentInput) =>
    request<{ transaction: Transaction; account: Account }>(`/accounts/${id}/payments`, payment),
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong')
