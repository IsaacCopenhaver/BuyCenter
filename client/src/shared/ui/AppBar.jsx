import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext.jsx'
import './AppBar.css'

// The session only carries what authController puts on it. Name if it's
// there, email as the fallback so the header is never blank.
function fullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ')
}

// Just the initials for the small round avatar; the full name sits beside it
// at anything wider than a tablet.
function initials(user) {
  const letters = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('')
  return (letters || user.email[0]).toUpperCase()
}

const LINKS = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/search', label: 'Search' },
  { to: '/app/carts', label: 'Carts' },
]

/**
 * Header and primary navigation, shared by every signed-in page.
 *
 * The bar is the brand colour in both themes. The logo is blue line-art on a
 * pale field, so it sits on a light chip rather than directly on the bar --
 * placed straight onto #204199 its frame and outlines would vanish into the
 * background and leave the letterforms floating.
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
      <div className="app-bar-inner">
        <div className="app-bar-brand">
          <span className="app-bar-logo">
            <img
              src="/brand/logo-64.png"
              srcSet="/brand/logo-32.png 1x, /brand/logo-64.png 2x"
              alt="Layton Gaming"
              width="96"
              height="32"
            />
          </span>
          {/* The one h1 on every page, as it was before: the product name.
              Panels below carry h2s beneath it. */}
          <h1 className="app-bar-product">Buy&nbsp;Center</h1>
        </div>

        <nav className="app-nav" aria-label="Main">
          {LINKS.map((link) => (
            // `end` on the dashboard so /app only lights up there, not on
            // every route nested beneath it.
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-bar-user">
          <span className="app-bar-avatar" aria-hidden="true">
            {initials(user)}
          </span>
          <span className="app-bar-identity">
            <strong>{name || user.email}</strong>
            {name && <span>{user.email}</span>}
          </span>
          <button type="button" className="app-bar-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
