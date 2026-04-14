import { useMemo, useState } from 'react'
import './DashboardLoginPage.css'

function readNextPath() {
  if (typeof window === 'undefined') return '/dashboard/'

  const next = new URLSearchParams(window.location.search).get('next')
  if (!next || !next.startsWith('/')) return '/dashboard/'
  return next
}

export default function DashboardLoginPage() {
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const nextPath = useMemo(() => readNextPath(), [])
  const destinationLabel = nextPath.startsWith('/solver') ? 'Provider dashboard' : 'Borrower dashboard'

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/dashboard-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          next: nextPath,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload?.error || 'Unable to unlock dashboard.')
        return
      }

      window.location.assign(payload?.redirectTo || nextPath)
    } catch {
      setError('Unable to unlock dashboard.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="dashboard-login-page">
      <div className="dashboard-login-shell">
        <section className="dashboard-login-card">
          <header className="dashboard-login-head">
            <div className="dashboard-login-badge">
              <span>◈</span>
              <p>Protected access</p>
            </div>

            <a className="dashboard-login-close" href="/" aria-label="Close login page">
              Back home
            </a>
          </header>

          <div className="dashboard-login-hero">
            <div className="dashboard-login-copy">
              <p className="dashboard-login-kicker">Private dashboard</p>
              <h1>Unlock {destinationLabel}</h1>
              <p>Use the team access password to continue with the same lending flow.</p>
            </div>

            <div className="dashboard-login-summary">
              <span>Destination</span>
              <strong>{destinationLabel}</strong>
              <small>{nextPath}</small>
            </div>
          </div>

          <form className="dashboard-login-form" onSubmit={handleSubmit}>
            <div className="dashboard-login-field-row">
              <label className="dashboard-login-field dashboard-login-field-primary">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </label>

              <label className="dashboard-login-field dashboard-login-field-secondary">
                <span>Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Optional"
                  autoComplete="username"
                />
              </label>
            </div>

            <div className="dashboard-login-note">
              <span>Borrower and provider dashboards use the same access gate.</span>
            </div>

            {error ? <p className="dashboard-login-error">{error}</p> : null}

            <div className="dashboard-login-actions">
              <button type="submit" className="dashboard-login-submit" disabled={isSubmitting}>
                {isSubmitting ? 'Unlocking...' : 'Unlock dashboard'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
