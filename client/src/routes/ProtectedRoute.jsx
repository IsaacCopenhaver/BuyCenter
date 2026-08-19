import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

// Wrap any route that requires a signed-in user. Nest routes inside this one
// in App.jsx and they inherit the guard.
export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Don't decide anything until the session check finishes -- otherwise a
  // refresh on a protected page bounces a signed-in user to the login screen.
  if (loading) return null

  // `from` lets the login page send them on to where they were actually going.
  if (!user) return <Navigate to="/" replace state={{ from: location }} />

  return <Outlet />
}
