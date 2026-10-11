import { useState } from 'react'
import { AccountDashboard } from './AccountDashboard'
import { AccountPicker } from './AccountPicker'
import { Disclaimer } from './Disclaimer'

function App() {
  const [accountId, setAccountId] = useState<number | null>(null)

  return (
    <main className="app">
      <header className="app-header">
        <h1>Fraud Detector Langchain</h1>
        <p className="muted">
          Create an account, add mock credits, then spend them. Every payment is scored against the account's
          history, and suspicious ones are reviewed by Claude through LangChain.
        </p>
      </header>
      <Disclaimer />
      {accountId === null ? (
        <AccountPicker onSelect={setAccountId} />
      ) : (
        <AccountDashboard accountId={accountId} onSwitch={() => setAccountId(null)} />
      )}
    </main>
  )
}

export default App
