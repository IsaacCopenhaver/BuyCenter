import { Link, useSearchParams } from 'react-router-dom'
import AppBar from '@/shared/ui/AppBar.jsx'
import { money } from '@/shared/data/catalog.js'
import {
  COMPLETED,
  IN_PROGRESS,
  cartCardCount,
  cartTotal,
  customerName,
  staffName,
  useData,
} from '@/shared/data/store.jsx'
import { useAuth } from '@/features/auth/AuthContext.jsx'
import './CartsPage.css'

const FILTERS = [
  { value: '', label: 'All' },
  { value: IN_PROGRESS, label: 'In progress' },
  { value: COMPLETED, label: 'Completed' },
]

function when(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Carts() {
  // Status lives in the URL so the dashboard tiles can deep-link straight to a
  // filtered list, and so a filtered view is shareable and survives a refresh.
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const buyerFilter = params.get('buyer')

  const { carts, customers, staff } = useData()
  const { user } = useAuth()

  // The signed-in user won't be in the dummy staff list, so merge them in for
  // name lookups rather than rendering "Unknown" against their own carts.
  const people = [...staff.filter((s) => s.id !== user.id), user]
  const nameOf = (id) => staffName(people.find((p) => p.id === id))
  const customerOf = (id) => customers.find((c) => c.id === id)

  const visible = carts.filter((cart) => {
    if (status && cart.status !== status) return false
    if (buyerFilter && !cart.buyerIds.includes(Number(buyerFilter))) return false
    return true
  })

  function setStatus(next) {
    const nextParams = new URLSearchParams(params)
    if (next) nextParams.set('status', next)
    else nextParams.delete('status')
    setParams(nextParams, { replace: true })
  }

  return (
    <>
      <AppBar />
      <main className="app app-wide">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Carts</h2>
              <p className="muted">
                {visible.length} cart{visible.length === 1 ? '' : 's'}
                {buyerFilter && ` assigned to ${nameOf(Number(buyerFilter))}`}
              </p>
            </div>
            <Link className="button button-primary" to="/app/carts/new">
              New cart
            </Link>
          </div>

          <div className="filter-row" role="group" aria-label="Filter by status">
            {FILTERS.map((filter) => (
              <button
                key={filter.value || 'all'}
                type="button"
                className={`chip${status === filter.value ? ' is-on' : ''}`}
                aria-pressed={status === filter.value}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="board-empty muted">No carts match this filter.</p>
          ) : (
            <ul className="cart-list">
              {visible.map((cart) => {
                const customer = customerOf(cart.customerId)
                const count = cartCardCount(cart)

                return (
                  <li key={cart.id}>
                    <Link className="cart-row" to={`/app/carts/${cart.id}`}>
                      <span className="cart-row-main">
                        <span className="cart-row-name">{customerName(customer)}</span>
                        <span className="muted cart-row-meta">
                          #{cart.id} · {when(cart.createdAt)} ·{' '}
                          {cart.buyerIds.length > 0
                            ? cart.buyerIds.map(nameOf).join(', ')
                            : 'No buyer assigned'}
                        </span>
                      </span>

                      <span className={`badge badge-${cart.status}`}>
                        {cart.status === COMPLETED ? 'Completed' : 'In progress'}
                      </span>

                      <span className="cart-row-figures">
                        <span className="cart-row-total">{money(cartTotal(cart))}</span>
                        <span className="muted">
                          {count} card{count === 1 ? '' : 's'}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <p className="hint muted">
          Carts live in memory for this tab only — a refresh resets them.
        </p>
      </main>
    </>
  )
}
