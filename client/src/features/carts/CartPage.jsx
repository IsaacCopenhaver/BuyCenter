import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppBar from '@/shared/ui/AppBar.jsx'
import CardSearch from '@/features/search/CardSearch.jsx'
import { useAuth } from '@/features/auth/AuthContext.jsx'
import {
  CONDITIONS,
  cardById,
  conditionLabel,
  gradeLabel,
  isGraded,
  money,
  priceFor,
  printingsFor,
  setFor,
} from '@/shared/data/catalog.js'
import {
  COMPLETED,
  PAYMENT_TYPES,
  STORE_CREDIT_BONUS,
  cartCardCount,
  cartTotal,
  distributeTotal,
  customerName,
  payoutFor,
  lineTotal,
  staffName,
  useData,
} from '@/shared/data/store.jsx'
import CartLine from './CartLine.jsx'
import './BuyerPicker.css'
import './PaymentSplit.css'
import './CartRetotal.css'

function when(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Cart() {
  const { id } = useParams()
  const cartId = Number(id)
  const { user } = useAuth()
  const {
    carts,
    customers,
    staff,
    addItem,
    updateItem,
    removeItem,
    setCartTotal,
    undoPrice,
    toggleBuyer,
    completeCart,
  } = useData()

  // Cash-value dollars per method, as typed. Empty rather than pre-filled
  // with the total: the total moves as cards go in, and a figure that
  // silently goes stale is worse than one you have to ask for.
  const [allocation, setAllocation] = useState({ cash: '', check: '', store_credit: '' })
  const [lastTouched, setLastTouched] = useState('cash')
  // Carries a timestamp as well as the id, so adding the same card twice
  // retriggers the highlight instead of looking like nothing happened.
  const [flash, setFlashState] = useState(null)
  const [targetTotal, setTargetTotal] = useState('')
  // Set only when a requested total could not be hit exactly, so the note
  // appears for that one apply rather than lingering.
  const [missed, setMissed] = useState(null)

  // Clears itself; without the timer the highlight would mark a line as
  // "just added" indefinitely.
  useEffect(() => {
    if (!flash) return undefined
    const timer = setTimeout(() => setFlashState(null), 2600)
    return () => clearTimeout(timer)
  }, [flash])

  const cart = carts.find((c) => c.id === cartId)

  if (!cart) {
    return (
      <>
        <AppBar />
        <main className="app">
          <section className="panel">
            <div className="empty">
              <p className="empty-title">No cart #{id}</p>
              <p className="muted">It may have been completed already, or the link may be wrong.</p>
              <Link className="button" to="/app/carts">
                Back to carts
              </Link>
            </div>
          </section>
        </main>
      </>
    )
  }

  const customer = customers.find((c) => c.id === cart.customerId)
  const assignable = [user, ...staff.filter((s) => s.id !== user.id)]
  const nameOf = (userId) => staffName(assignable.find((p) => p.id === userId))

  // A completed cart has a BuyTransaction against it and is a historical
  // record -- editing it would silently contradict the transaction total.
  // Both conditions, not just the status: a cart marked completed with no
  // transaction row is malformed, and the panel below reads straight off it.
  const locked = cart.status === COMPLETED && cart.transaction != null
  const total = cartTotal(cart)
  const count = cartCardCount(cart)

  const payout = payoutFor(allocation)
  // Compared in cents: the cart total is a sum of floats and will not reach
  // zero against the allocation otherwise.
  const unallocated = (Math.round(total * 100) - Math.round(payout.allocated * 100)) / 100

  function changeAllocation(method, value) {
    setAllocation((prev) => ({ ...prev, [method]: value }))
    setLastTouched(method)
  }

  function fillRemainder() {
    const current = Number(allocation[lastTouched]) || 0
    const next = Math.max(0, Math.round((current + unallocated) * 100) / 100)
    setAllocation((prev) => ({ ...prev, [lastTouched]: String(next) }))
  }

  function setFlash(cardId) {
    setFlashState({ cardId, at: Date.now() })
  }

  function changeTarget(value) {
    setTargetTotal(value)
    setMissed(null)
  }

  function applyTotal() {
    const target = Number(targetTotal)
    if (!Number.isFinite(target) || target < 0) return

    // Run the distribution first to find out whether the target is actually
    // reachable, then write it. Same pure function either way, so the preview
    // and the write can never disagree.
    const { achieved, exact } = distributeTotal(cart.items, target)
    setCartTotal(cart.id, target)
    setMissed(exact ? null : { achieved, target })
    setTargetTotal('')
  }

  return (
    <>
      <AppBar />
      <main className="app app-wide">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{customerName(customer)}</h2>
              <p className="muted">
                Cart #{cart.id} · opened {when(cart.createdAt)}
                {customer?.phoneNumber && ` · ${customer.phoneNumber}`}
              </p>
            </div>
            <span className={`badge badge-${cart.status}`}>
              {locked ? 'Completed' : 'In progress'}
            </span>
          </div>

          <h3 className="subhead">Buyers</h3>
          <p className="muted fieldset-hint">
            Staff credited with this buy — the <code>cart_buyers</code> join allows more than one.
          </p>
          <div className="check-list">
            {assignable.map((person) => (
              <label key={person.id} className={`check${locked ? ' is-locked' : ''}`}>
                <input
                  type="checkbox"
                  checked={cart.buyerIds.includes(person.id)}
                  onChange={() => toggleBuyer(cart.id, person.id)}
                  disabled={locked}
                />
                <span>
                  {staffName(person)}
                  {person.id === user.id && <span className="muted"> (you)</span>}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Cards</h2>
              <p className="muted">
                {count} card{count === 1 ? '' : 's'} across {cart.items.length} line
                {cart.items.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="panel-actions">
              {!locked && (
                <button
                  type="button"
                  className="panel-toggle"
                  disabled={cart.priceHistory.length === 0}
                  onClick={() => undoPrice(cart.id)}
                >
                  Undo price change
                </button>
              )}
              <span className="cart-total">{money(total)}</span>
            </div>
          </div>

          {!locked && cart.items.length > 0 && (
            <div className="retotal">
              <label className="line-control">
                <span className="muted">Set cart total</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetTotal}
                  placeholder={total.toFixed(2)}
                  onChange={(e) => changeTarget(e.target.value)}
                  aria-label="New total for the whole cart"
                />
              </label>

              <button type="button" disabled={targetTotal === ''} onClick={applyTotal}>
                Spread across {count} card{count === 1 ? '' : 's'}
              </button>

              {/* Only shown when the target could not be hit exactly, which
                  happens when no combination of whole-cent offers adds up to
                  it -- a single line of 3 cards can only make multiples of 3
                  cents. Saying so beats silently landing a cent off. */}
              {missed != null && (
                <p className="muted retotal-note" role="status">
                  Closest reachable total was {money(missed.achieved)}, not {money(missed.target)} —
                  whole-cent offers across {count} card
                  {count === 1 ? '' : 's'} cannot land exactly there.
                </p>
              )}
            </div>
          )}

          {cart.items.length === 0 ? (
            <p className="board-empty muted">
              Nothing in this cart yet. Search below to add a card.
            </p>
          ) : (
            <ul className="line-list">
              {cart.items.map((item) => (
                <CartLine
                  key={item.id}
                  item={item}
                  cartId={cart.id}
                  locked={locked}
                  flashed={flash?.cardId === item.cardId}
                  updateItem={updateItem}
                  removeItem={removeItem}
                />
              ))}
            </ul>
          )}
        </section>

        {!locked && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Add a card</h2>
                <p className="muted">Adds at the suggested price — adjust the offer on the line</p>
              </div>
            </div>

            <CardSearch
              onAdd={(card, options = {}) => {
                addItem(cart.id, {
                  cardId: card.shopifyProductId,
                  condition: options.condition,
                  quantity: options.quantity ?? 1,
                })
                setFlash(card.shopifyProductId)
              }}
            />
          </section>
        )}

        {!locked ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Complete buy</h2>
                <p className="muted">Writes the transaction and closes the cart</p>
              </div>
            </div>

            <p className="muted fieldset-hint">
              Split the {money(total)} cash value across however many methods the customer wants.
              Store credit is worth {Math.round(STORE_CREDIT_BONUS * 100)}% more, so that portion
              pays out above its cash value.
            </p>

            <div className="pay-split">
              {PAYMENT_TYPES.map((type) => (
                <label key={type.value} className="line-control">
                  <span className="muted">{type.label}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={allocation[type.value]}
                    onChange={(e) => changeAllocation(type.value, e.target.value)}
                    aria-label={`Amount paid by ${type.label}`}
                  />
                </label>
              ))}

              <button type="button" className="pay-fill" onClick={fillRemainder}>
                Put the rest on {PAYMENT_TYPES.find((t) => t.value === lastTouched)?.label}
              </button>
            </div>

            <dl className="payout">
              <div>
                <dt className="muted">Allocated</dt>
                <dd className={unallocated === 0 ? '' : 'is-off'}>
                  {money(payout.allocated)} of {money(total)}
                </dd>
              </div>
              {payout.bonus > 0 && (
                <div>
                  <dt className="muted">Store credit bonus</dt>
                  <dd>
                    {money(payout.credit)} → {money(payout.creditValue)} (+{money(payout.bonus)})
                  </dd>
                </div>
              )}
              <div>
                <dt className="muted">Customer receives</dt>
                <dd className="cart-total">{money(payout.handedOver)}</dd>
              </div>
            </dl>

            <div className="complete-row">
              <button
                type="button"
                className="button-primary"
                // BuyTransaction requires a total and at least something to pay
                // for; an empty cart has no transaction to write. The allocation
                // also has to actually add up -- paying out more or less than
                // the cart is worth is a mistake, not a rounding choice.
                disabled={
                  cart.items.length === 0 || cart.buyerIds.length === 0 || unallocated !== 0
                }
                onClick={() => completeCart(cart.id, { allocation, completedById: user.id })}
              >
                Complete buy
              </button>
            </div>

            {(cart.items.length === 0 || cart.buyerIds.length === 0 || unallocated !== 0) && (
              <p className="muted fieldset-hint">
                {cart.items.length === 0
                  ? 'Add at least one card first.'
                  : cart.buyerIds.length === 0
                    ? 'Assign at least one buyer first.'
                    : unallocated > 0
                      ? `${money(unallocated)} still to allocate.`
                      : `${money(-unallocated)} over the cart total.`}
              </p>
            )}
          </section>
        ) : (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Transaction</h2>
                <p className="muted">
                  Completed {when(cart.transaction.completedAt)} by{' '}
                  {nameOf(cart.transaction.completedById)}
                </p>
              </div>
              <span className="cart-total">{money(cart.transaction.totalPrice)}</span>
            </div>

            {/* Derived from the stored allocation rather than read back from a
                stored payout, so a change to the bonus rate can never leave an
                old transaction showing arithmetic that no longer adds up. */}
            <dl className="payout">
              {PAYMENT_TYPES.filter(
                (type) => Number(cart.transaction.allocation?.[type.value]) > 0,
              ).map((type) => {
                const amount = Number(cart.transaction.allocation[type.value])
                const paid = payoutFor(cart.transaction.allocation)
                return (
                  <div key={type.value}>
                    <dt className="muted">{type.label}</dt>
                    <dd>
                      {money(amount)}
                      {type.value === 'store_credit' && paid.bonus > 0 && (
                        <span className="muted"> → {money(paid.creditValue)} credit</span>
                      )}
                    </dd>
                  </div>
                )
              })}
              <div>
                <dt className="muted">Customer received</dt>
                <dd>{money(payoutFor(cart.transaction.allocation ?? {}).handedOver)}</dd>
              </div>
            </dl>
          </section>
        )}

        <p className="hint muted">Dummy data — nothing here is saved to the server yet.</p>
      </main>
    </>
  )
}
