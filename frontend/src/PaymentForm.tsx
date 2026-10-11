import { useState, type SubmitEvent } from 'react'
import { api, CATEGORIES, COUNTRIES, errorMessage, type Account, type Transaction } from './api'
import { parseDollars } from './money'
import { categoryLabel, StatusBadge } from './TransactionList'

const RESULT_TITLE = {
  approved: 'Payment approved',
  review: 'Held for manual review',
  declined: 'Payment declined',
}

type Draft = {
  amount: string
  merchant: string
  category: string
  country: string
}

export function PaymentForm({ account, onPaid }: { account: Account; onPaid: () => Promise<void> }) {
  const [draft, setDraft] = useState<Draft>({ amount: '', merchant: '', category: 'groceries', country: account.country })
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<Transaction | null>(null)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }))

  const scenarios: { label: string; draft: Draft }[] = [
    {
      label: 'Everyday purchase',
      draft: { amount: '42.50', merchant: 'Whole Foods', category: 'groceries', country: account.country },
    },
    {
      label: 'Suspicious purchase',
      draft: {
        amount: (Math.max(account.balanceCents * 0.9, 100) / 100).toFixed(2),
        merchant: 'GiftCardMall',
        category: 'gift_cards',
        country: account.country === 'NG' ? 'RU' : 'NG',
      },
    },
  ]

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const { amount, ...payment } = draft
    const amountCents = parseDollars(amount)
    if (amountCents === null) {
      setError('Enter an amount like 12.50')
      return
    }
    setChecking(true)
    setError(null)
    setResult(null)
    try {
      const { transaction } = await api.pay(account.id, { ...payment, amountCents })
      setResult(transaction)
      await onPaid()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setChecking(false)
    }
  }

  return (
    <section className="card">
      <h2>Make a payment</h2>
      <div className="button-row">
        {scenarios.map((scenario) => (
          <button key={scenario.label} type="button" className="secondary" onClick={() => setDraft(scenario.draft)}>
            {scenario.label}
          </button>
        ))}
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Amount (USD)
          <input value={draft.amount} onChange={update('amount')} inputMode="decimal" placeholder="0.00" required />
        </label>
        <label>
          Merchant
          <input value={draft.merchant} onChange={update('merchant')} required maxLength={100} />
        </label>
        <label>
          Category
          <select value={draft.category} onChange={update('category')}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Country
          <select value={draft.country} onChange={update('country')}>
            {Object.entries(COUNTRIES).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={checking}>
          {checking ? 'Running fraud check…' : 'Pay'}
        </button>
        {checking && <p className="muted">Flagged payments are reviewed by Claude, which takes a few seconds.</p>}
      </form>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && (
        <div role="status" className={`result result-${result.status}`}>
          <p>
            <strong>{RESULT_TITLE[result.status]}</strong> <StatusBadge status={result.status} />
          </p>
          <p className="muted">
            Risk {result.riskScore}/100 · {result.reviewedBy === 'llm' ? 'reviewed by Claude' : 'checked by rules only'}
          </p>
          <ul>
            {result.fraudReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
