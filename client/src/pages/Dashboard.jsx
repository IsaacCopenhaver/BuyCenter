import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import AppBar from '../components/AppBar.jsx'
import BuysByDayChart from '../components/BuysByDayChart.jsx'
import CardsBoughtBoard from '../components/CardsBoughtBoard.jsx'
import { COMPLETED, IN_PROGRESS, cartCardCount, staffName, useData } from '../data/store.jsx'

// A null count means "not loaded", not "zero" -- don't render it as 0.
function count(n) {
  return n == null ? '—' : n
}

// Must match BuysByDayChart's own key format: the viewer's local calendar
// date, not toISOString(), which would shift the day west of UTC.
function dayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { carts, customers, staff } = useData()

  const summary = {
    inProgress: carts.filter((c) => c.status === IN_PROGRESS).length,
    completed: carts.filter((c) => c.status === COMPLETED).length,
    customers: customers.length,
  }

  const completed = useMemo(
    () => carts.filter((c) => c.status === COMPLETED && c.transaction),
    [carts],
  )

  const completedByDay = useMemo(() => {
    const counts = {}
    for (const cart of completed) {
      const key = dayKey(new Date(cart.transaction.completedAt))
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [completed])

  const cardsBought = useMemo(() => {
    // Every assigned buyer is credited with the whole cart. Two people who
    // worked one 40-card buy each get 40 -- the cart_buyers join records that
    // they worked it, not what fraction each handled.
    const totals = new Map()
    for (const cart of completed) {
      const cards = cartCardCount(cart)
      for (const buyerId of cart.buyerIds) {
        totals.set(buyerId, (totals.get(buyerId) ?? 0) + cards)
      }
    }

    const people = [user, ...staff.filter((s) => s.id !== user.id)]
    return [...totals].map(([id, cards]) => {
      const person = people.find((p) => p.id === id)
      return {
        id,
        firstName: person?.firstName,
        lastName: person?.lastName,
        email: person?.email ?? staffName(person),
        cards,
      }
    })
  }, [completed, staff, user])

  return (
    <main className="app">
      <AppBar />

      <section className="tiles">
        <button
          type="button"
          className="tile"
          onClick={() => navigate(`/app/carts?status=${IN_PROGRESS}`)}
        >
          <span className="tile-figure">{count(summary.inProgress)}</span>
          <span className="tile-label">In-Progress Buys</span>
        </button>

        <button
          type="button"
          className="tile"
          onClick={() => navigate(`/app/carts?status=${COMPLETED}`)}
        >
          <span className="tile-figure">{count(summary.completed)}</span>
          <span className="tile-label">Completed Buys</span>
        </button>

        {/* No customers page yet, so this lands on the cart list rather than
            on the catch-all redirect back to login. */}
        <button type="button" className="tile" onClick={() => navigate('/app/carts')}>
          <span className="tile-figure">{count(summary.customers)}</span>
          <span className="tile-label">Customers</span>
        </button>

        <button
          type="button"
          className="tile tile-start"
          onClick={() => navigate('/app/carts/new')}
        >
          <span className="tile-figure" aria-hidden="true">
            +
          </span>
          <span className="tile-label">Start a new Buy</span>
        </button>
      </section>

      <BuysByDayChart
        counts={completedByDay}
        onSelectDay={(day) => navigate(`/app/carts?status=${COMPLETED}&day=${day}`)}
      />

      <CardsBoughtBoard
        entries={cardsBought}
        highlightId={user.id}
        onSelectBuyer={(id) => navigate(`/app/carts?buyer=${id}`)}
      />

      <p className="hint muted">
        Counts, the chart, and the leaderboard read the dummy cart store — not the server.
      </p>
    </main>
  )
}
