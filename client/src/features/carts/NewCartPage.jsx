import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppBar from '@/shared/ui/AppBar.jsx'
import { useAuth } from '@/features/auth/AuthContext.jsx'
import { customerName, staffName, useData } from '@/shared/data/store.jsx'
import './NewCustomerForm.css'
import './BuyerPicker.css'

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
  const { customers, staff, createCart, addCustomer } = useData()

  const [customerId, setCustomerId] = useState('')
  const [buyerIds, setBuyerIds] = useState([user.id])
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ firstName: '', lastName: '', phoneNumber: '', email: '' })
  const contactId = useId()

  function changeDraft(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  function startAdding() {
    setDraft({ firstName: '', lastName: '', phoneNumber: '', email: '' })
    setAdding(true)
    setError('')
  }

  function saveCustomer() {
    // firstName and lastName are NOT NULL on the Customer model, so neither
    // is optional here.
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setError('A customer needs a first and last name.')
      return
    }
    // Either contact method satisfies the rule, which is why this is checked
    // here rather than by marking both fields required: a customer with no
    // way to reach them is the thing being prevented, not a blank field.
    if (!draft.phoneNumber.trim() && !draft.email.trim()) {
      setError('A customer needs a phone number or an email address — either will do.')
      return
    }
    // Select them straight away -- making a customer and then having to find
    // them in the list again is a pointless second step.
    setCustomerId(String(addCustomer(draft)))
    setAdding(false)
  }

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
    <>
      <AppBar />
      <main className="app">
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

            {/* A walk-in who has never sold here before has no record to pick,
                and sending the buyer off to a separate page to make one would
                lose the cart they are halfway through starting. */}
            {adding ? (
              <fieldset className="fieldset new-customer">
                <legend>New customer</legend>

                <div className="field-row">
                  <label>
                    <span>First name</span>
                    <input
                      value={draft.firstName}
                      onChange={(e) => changeDraft('firstName', e.target.value)}
                      autoFocus
                    />
                  </label>
                  <label>
                    <span>Last name</span>
                    <input
                      value={draft.lastName}
                      onChange={(e) => changeDraft('lastName', e.target.value)}
                    />
                  </label>
                </div>

                {/* Grouped and labelled together, because the requirement is
                    on the pair rather than on either field. Marking both
                    "optional" would be wrong and marking both "required" would
                    be worse. */}
                <fieldset className="field-group">
                  <legend className="muted">
                    Contact — a phone number or an email, at least one
                  </legend>
                  <div className="field-row">
                    <label>
                      <span>Phone</span>
                      <input
                        type="tel"
                        value={draft.phoneNumber}
                        onChange={(e) => changeDraft('phoneNumber', e.target.value)}
                        aria-describedby={contactId}
                      />
                    </label>
                    <label>
                      <span>Email</span>
                      <input
                        type="email"
                        value={draft.email}
                        onChange={(e) => changeDraft('email', e.target.value)}
                        aria-describedby={contactId}
                      />
                    </label>
                  </div>
                  <p id={contactId} className="muted fieldset-hint">
                    Filling in either one is enough.
                  </p>
                </fieldset>

                <div className="field-actions">
                  {/* type="button": this sits inside the cart form, and a bare
                      button would submit that instead of saving the customer. */}
                  <button type="button" onClick={saveCustomer}>
                    Save customer
                  </button>
                  <button type="button" className="panel-toggle" onClick={() => setAdding(false)}>
                    Cancel
                  </button>
                </div>
              </fieldset>
            ) : (
              <button type="button" className="panel-toggle add-customer" onClick={startAdding}>
                + New customer
              </button>
            )}

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

            <button type="submit" className="button-primary">
              Create cart
            </button>
          </form>
        </section>

        <p className="hint muted">
          Customers are dummy records. A real one comes from the Shopify customer mirror.
        </p>
      </main>
    </>
  )
}
