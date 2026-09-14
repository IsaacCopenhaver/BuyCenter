import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import BuysByDayChart from '../components/BuysByDayChart.jsx'
import CardsBoughtBoard from '../components/CardsBoughtBoard.jsx'

// The session only carries what authController puts on it. Name if it's
// there, email as the fallback so the header is never blank.
function fullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ')
}

// A null count means "not loaded", not "zero" -- don't render it as 0.
function count(n) {
  return n == null ? '—' : n
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Hardcoded: there's no Buy or Customer model yet, so there is nothing to
  // count. Swap this for a fetch of the summary once /api/buys exists.
  const summary = { inProgress: null, completed: null, customers: null }

  // Same story for the chart -- null is "not loaded", so it draws its empty
  // state instead of a week of zeros. The shape the endpoint needs to return
  // is { 'YYYY-MM-DD': count } in the viewer's local dates.
  const completedByDay = null

  // And for the leaderboard: [{ id, firstName, lastName, cards }], where
  // `cards` sums individual cards across a user's buys, not buys themselves.
  const cardsBought = null

  const name = fullName(user)

  async function signOut() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <main className="app">
      <header className="app-bar">
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
      </header>

      {/* These destinations have no routes yet, so a click currently lands
          back here. They start working the moment the routes exist. */}
      <section className="tiles">
        <button type="button" className="tile" onClick={() => navigate('/app/buys?status=in_progress')}>
          <span className="tile-figure">{count(summary.inProgress)}</span>
          <span className="tile-label">In-Progress Buys</span>
        </button>

        <button type="button" className="tile" onClick={() => navigate('/app/buys?status=completed')}>
          <span className="tile-figure">{count(summary.completed)}</span>
          <span className="tile-label">Completed Buys</span>
        </button>

        <button type="button" className="tile" onClick={() => navigate('/app/customers')}>
          <span className="tile-figure">{count(summary.customers)}</span>
          <span className="tile-label">Customers</span>
        </button>

        <button type="button" className="tile tile-start" onClick={() => navigate('/app/buys/new')}>
          <span className="tile-figure" aria-hidden="true">
            +
          </span>
          <span className="tile-label">Start a new Buy</span>
        </button>
      </section>

      <BuysByDayChart
        counts={completedByDay}
        onSelectDay={(day) => navigate(`/app/buys?status=completed&day=${day}`)}
      />

      <CardsBoughtBoard
        entries={cardsBought}
        highlightId={user.id}
        onSelectBuyer={(id) => navigate(`/app/buys?buyer=${id}`)}
      />

      <p className="hint muted">
        Counts, the chart, and the leaderboard are placeholders until the buy API is in place.
      </p>
    </main>
  )
}
