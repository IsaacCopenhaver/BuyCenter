import { createContext, useContext, useEffect, useState } from 'react'

// Everything the app knows about "who is signed in" comes from here, so
// swapping the stub below for Passport is a one-file change. Components only
// ever see { user, loading, login, logout }.
const AuthContext = createContext(null)

// Stand-in for the session cookie Passport will issue. Session storage (not
// local) so closing the tab signs you out, which is closer to the real thing.
const STORAGE_KEY = 'buycenter.user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Covers the "am I already signed in?" check on load. It's instant against
  // storage, but becomes a real round-trip to GET /api/auth/me later -- the
  // routes wait on it from day one so that swap doesn't cause a redirect flash.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO(passport): fetch('/api/auth/me') -> setUser(res.ok ? await res.json() : null)
    const stored = sessionStorage.getItem(STORAGE_KEY)
    setUser(stored ? JSON.parse(stored) : null)
    setLoading(false)
  }, [])

  async function login({ username, password }) {
    // TODO(passport): POST /api/auth/login and let the local strategy check
    // the credentials against Postgres. Throwing on a bad response keeps the
    // shape the login form already handles.
    if (!username.trim() || !password) throw new Error('Enter a username and password.')

    const signedIn = { id: 'stub-user', username: username.trim() }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(signedIn))
    setUser(signedIn)
    return signedIn
  }

  async function logout() {
    // TODO(passport): POST /api/auth/logout to destroy the server session.
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
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
