import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage, type Account, type Transaction } from './api'
import { formatCents } from './money'
import { PaymentForm } from './PaymentForm'
import { TransactionList } from './TransactionList'

const CREDIT_PRESETS = [1_000, 10_000, 50_000]

export function AccountDashboard({ accountId, onSwitch }: { accountId: number; onSwitch: () => void }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [addingCredits, setAddingCredits] = useState(false)

  const refresh = useCallback(async () => {
    const [nextAccount, nextTransactions] = await Promise.all([
      api.getAccount(accountId),
      api.transactions(accountId),
    ])
    setAccount(nextAccount)
    setTransactions(nextTransactions)
  }, [accountId])

  useEffect(() => {
    refresh().catch((e) => setError(errorMessage(e)))
  }, [refresh])

  async function addCredits(amountCents: number) {
    setAddingCredits(true)
    setError(null)
    try {
      await api.addCredits(accountId, amountCents)
      await refresh()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setAddingCredits(false)
    }
  }

  if (!account) {
    return error ? (
      <p role="alert" className="error">
        {error}
      </p>
    ) : (
      <p className="muted">Loading account…</p>
    )
  }

  return (
    <>
      <section className="card summary">
        <div>
          <h2>{account.name}</h2>
          <p className="muted">
            Account #{account.id} · based in {account.country} ·{' '}
            <button type="button" className="link" onClick={onSwitch}>
              switch account
            </button>
          </p>
        </div>
        <div className="balance">
          <span className="muted">Balance</span>
          <strong>{formatCents(account.balanceCents)}</strong>
        </div>
      </section>

      <div className="columns">
        <section className="card">
          <h2>Add mock credits</h2>
          <p className="muted">No real money moves; this only raises the balance.</p>
          <div className="button-row">
            {CREDIT_PRESETS.map((cents) => (
              <button key={cents} type="button" disabled={addingCredits} onClick={() => addCredits(cents)}>
                +{formatCents(cents)}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </section>

        <PaymentForm account={account} onPaid={refresh} />
      </div>

      <TransactionList transactions={transactions} />
    </>
  )
}
