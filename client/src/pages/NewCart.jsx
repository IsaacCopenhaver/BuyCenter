import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppBar from '../components/AppBar.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { customerName, staffName, useData } from '../data/store.jsx'

/**
 * Start a cart.
 *
 * server/models/Cart.js makes customerId NOT NULL, so a customer is required
 * before a cart can exist -- it is not something to fill in later. Buyers go
 * through the cart_buyers join (User.belongsToMany(Cart)), so a cart can have
 * several, and the person starting it is pre-assigned because they are almost
 * always one of them.
 */
export default function NewCart() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { customers, staff, createCart } = useData()

  const [customerId, setCustomerId] = useState('')
  const [buyerIds, setBuyerIds] = useState([user.id])
  const [error, setError] = useState('')

  // The signed-in user is always assignable, even though the dummy staff list
  // can't know who they are.
  const assignable = [user, ...staff.filter((s) => s.id !== user.id)]

  function toggleBuyer(id) {
    setBuyerIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  function submit(e) {
    e.preventDefault()
    if (!customerId) {
      setError('Pick a customer — a cart belongs to one.')
      return
    }
    const id = createCart({ customerId, buyerIds })
    navigate(`/app/carts/${id}`, { replace: true })
  }

  return (
    <main className="app">
      <AppBar />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>New cart</h2>
            <p className="muted">Who are you buying from?</p>
          </div>
          <Link className="button" to="/app/carts">
            Cancel
          </Link>
        </div>

        <form className="stack" onSubmit={submit}>
          <label>
            <span>Customer</span>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value)
                setError('')
              }}
              autoFocus
            >
              <option value="">Select a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customerName(customer)}
                  {customer.phoneNumber ? ` — ${customer.phoneNumber}` : ''}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="fieldset">
            <legend>Buyers</legend>
            <p className="muted fieldset-hint">
              Staff credited with this buy. More than one can work a single cart.
            </p>
            <div className="check-list">
              {assignable.map((person) => (
                <label key={person.id} className="check">
                  <input
                    type="checkbox"
                    checked={buyerIds.includes(person.id)}
                    onChange={() => toggleBuyer(person.id)}
                  />
                  <span>
                    {staffName(person)}
                    {person.id === user.id && <span className="muted"> (you)</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit">Create cart</button>
        </form>
      </section>

      <p className="hint muted">
        Customers are dummy records. A real one comes from the Shopify customer mirror.
      </p>
    </main>
  )
}
