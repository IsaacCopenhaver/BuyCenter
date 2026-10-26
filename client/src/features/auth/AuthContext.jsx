import { createContext, useContext, useEffect, useState } from 'react'

// Everything the app knows about "who is signed in" comes from here. The
// server owns the session -- a cookie issued by Passport -- so this file only
// reflects it. Components only ever see { user, loading, login, logout }.
const AuthContext = createContext(null)

// The API and the app are same-origin (Vite proxies /api to Express in dev,
// Express serves the built client in prod), so fetch sends the session cookie
// on its own and no CORS or credentials setup is needed.

// Pulls the server's { error } message off a failed response so the login form
// can show it. Falls back to something generic if the body isn't JSON.
async function errorFrom(res, fallback) {
  try {
    const body = await res.json()
    if (body?.error) return body.error
  } catch {
    // no JSON body -- use the fallback
  }
  return fallback
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Covers the "am I already signed in?" check on load. The routes wait on it
  // so a refresh on a protected page doesn't flash the login screen.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const res = await fetch('/api/auth/me')
        // 401 is the normal "not signed in" answer, not a failure.
        const signedIn = res.ok ? await res.json() : null
        if (!cancelled) setUser(signedIn)
      } catch {
        // API unreachable -- treat as signed out rather than hanging on the
        // loading state forever.
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSession()
    return () => {
      cancelled = true
    }
  }, [])

  async function login({ email, password }) {
    // Cheap guard for a nicer message than the server's blanket 401.
    if (!email.trim() || !password) throw new Error('Enter an email and password.')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The local strategy is configured with usernameField: 'email'.
      body: JSON.stringify({ email: email.trim(), password }),
    })

    if (!res.ok) throw new Error(await errorFrom(res, 'Could not sign in.'))

    const signedIn = await res.json()
    setUser(signedIn)
    return signedIn
  }

  async function logout() {
    // Destroys the server session. Clear locally either way -- if the request
    // failed there's nothing useful the user can do with a stale user object.
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
