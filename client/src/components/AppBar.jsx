import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

// The session only carries what authController puts on it. Name if it's
// there, email as the fallback so the header is never blank.
function fullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ')
}

/**
 * Header and primary navigation, shared by every signed-in page.
 *
 * Lifted out of Dashboard once there was more than one page to reach: a nav
 * that only exists on the dashboard means every other page is a dead end you
 * can only leave with the back button.
 */
export default function AppBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const name = fullName(user)

  async function signOut() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="app-bar">
      <div className="app-bar-top">
        <h1>Buy Center</h1>
        <div className="app-bar-user">
          <div className="app-bar-identity">
            <strong>{name || user.email}</strong>
            {name && <span className="muted">{user.email}</span>}
          </div>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      <nav className="app-nav" aria-label="Main">
        {/* `end` so /app only lights up on the dashboard itself, not on every
            route nested beneath it. */}
        <NavLink to="/app" end>
          Dashboard
        </NavLink>
        <NavLink to="/app/search">Search</NavLink>
        <NavLink to="/app/carts">Carts</NavLink>
      </nav>
    </header>
  )
}
