import { useEffect, useState, type SubmitEvent } from 'react'
import { api, COUNTRIES, errorMessage, type Account } from './api'
import { formatCents } from './money'

export function AccountPicker({ onSelect }: { onSelect: (id: number) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [name, setName] = useState('')
  const [country, setCountry] = useState('US')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listAccounts()
      .then(setAccounts)
      .catch((e) => setError(errorMessage(e)))
  }, [])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const account = await api.createAccount({ name, country })
      onSelect(account.id)
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  return (
    <section className="card">
      <h2>Create an account</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </label>
        <label>
          Home country
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {Object.entries(COUNTRIES).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={saving}>
          Create account
        </button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {accounts.length > 0 && (
        <>
          <h2>Or open an existing one</h2>
          <ul className="account-list">
            {accounts.map((account) => (
              <li key={account.id}>
                <button type="button" className="link" onClick={() => onSelect(account.id)}>
                  {account.name}
                </button>
                <span className="muted">
                  {account.country} · {formatCents(account.balanceCents)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
