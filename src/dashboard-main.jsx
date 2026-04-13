import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './DashboardPage.css'
import DashboardPage from './DashboardPage.jsx'

const DASHBOARD_PASSWORD_ENABLED = import.meta.env.VITE_DASHBOARD_PASSWORD_ENABLED === 'true'
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD ?? ''
const DASHBOARD_PASSWORD_HINT = import.meta.env.VITE_DASHBOARD_PASSWORD_HINT ?? ''
const DASHBOARD_ACCESS_KEY = 'ayni_dashboard_access'

function DashboardPasswordGate() {
  const storedAccess =
    typeof window !== 'undefined' ? window.sessionStorage.getItem(DASHBOARD_ACCESS_KEY) === '1' : false
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [hasAccess, setHasAccess] = useState(storedAccess || !DASHBOARD_PASSWORD_ENABLED || !DASHBOARD_PASSWORD)

  function handleSubmit(event) {
    event.preventDefault()

    if (password === DASHBOARD_PASSWORD) {
      window.sessionStorage.setItem(DASHBOARD_ACCESS_KEY, '1')
      setHasAccess(true)
      setError('')
      return
    }

    setError('Wrong password.')
  }

  if (hasAccess) {
    return <DashboardPage />
  }

  return (
    <main className="dashboard-page dashboard-lock-screen">
      <div className="dashboard-lock-card">
        <p className="dashboard-lock-kicker">Protected</p>
        <h1>Enter dashboard password</h1>
        <p className="dashboard-lock-copy">This dashboard is locked until the correct access password is entered.</p>
        <form className="dashboard-lock-form" onSubmit={handleSubmit}>
          <input
            className="dashboard-lock-input"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (error) setError('')
            }}
            placeholder={DASHBOARD_PASSWORD_HINT || 'Password'}
            autoComplete="current-password"
          />
          <button type="submit" className="dashboard-button dashboard-button-primary">
            Enter dashboard
          </button>
        </form>
        {error ? <p className="dashboard-status dashboard-status-warning">{error}</p> : null}
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DashboardPasswordGate />
  </StrictMode>,
)
