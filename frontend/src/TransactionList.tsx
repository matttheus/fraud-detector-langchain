import type { Transaction, TransactionStatus } from './api'
import { formatCents } from './money'

export const categoryLabel = (category: string) => category.replaceAll('_', ' ')

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return (
    <section className="card">
      <h2>History</h2>
      {transactions.length === 0 ? (
        <p className="muted">No transactions yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Description</th>
              <th className="num">Amount</th>
              <th>Status</th>
              <th className="num">Risk</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.createdAt).toLocaleTimeString()}</td>
                <td>
                  {t.type === 'credit' ? 'Credits added' : `${t.merchant} · ${categoryLabel(t.category ?? '')} · ${t.country}`}
                  {t.type === 'payment' && t.fraudReasons.length > 0 && (
                    <details>
                      <summary>{t.reviewedBy === 'llm' ? "Claude's reasons" : 'Rule signals'}</summary>
                      <ul>
                        {t.fraudReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
                <td className="num">
                  {t.type === 'credit' ? '+' : '−'}
                  {formatCents(t.amountCents)}
                </td>
                <td>
                  <StatusBadge status={t.status} />
                </td>
                <td className="num">{t.riskScore ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
