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
          <div className="dashboard-login-badge">
            <span>A</span>
            <p>Dashboard Access</p>
          </div>

          <a className="dashboard-login-close" href="/" aria-label="Close login page">
            ×
          </a>

          <div className="dashboard-login-copy">
            <p className="dashboard-login-kicker">Protected</p>
            <h1>Enter the dashboard</h1>
            <p>The dashboard is private right now. Use the access password to continue.</p>
          </div>

          <form className="dashboard-login-form" onSubmit={handleSubmit}>
            <label className="dashboard-login-field">
              <span>Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Optional"
                autoComplete="username"
              />
            </label>

            <label className="dashboard-login-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </label>

            {error ? <p className="dashboard-login-error">{error}</p> : null}

            <div className="dashboard-login-actions">
              <a className="dashboard-login-ghost" href="/">
                Back home
              </a>
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
