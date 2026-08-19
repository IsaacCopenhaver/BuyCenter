import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Where ProtectedRoute wanted to send them, or the app root by default.
  const destination = location.state?.from?.pathname || '/app'

  if (loading) return null
  // Already signed in? Skip the form.
  if (user) return <Navigate to={destination} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ username, password })
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="login">
      <div className="card">
        <header className="card-head">
          <h1>Buy Center</h1>
          <p className="muted">Sign in to continue.</p>
        </header>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <input
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>

          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="muted hint">
          Auth isn&apos;t wired up yet -- any username and password gets you in.
        </p>
      </div>
    </main>
  )
}
