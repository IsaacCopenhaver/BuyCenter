import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppBar from '../components/AppBar.jsx'
import CardSearch from '../components/CardSearch.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import {
  CONDITIONS,
  cardById,
  conditionLabel,
  gradeLabel,
  isGraded,
  money,
  priceFor,
  setFor,
} from '../data/catalog.js'
import {
  COMPLETED,
  PAYMENT_TYPES,
  cartCardCount,
  cartTotal,
  customerName,
  lineTotal,
  staffName,
  useData,
} from '../data/store.jsx'

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
    toggleBuyer,
    completeCart,
  } = useData()

  const [paymentType, setPaymentType] = useState(PAYMENT_TYPES[0].value)
  const cart = carts.find((c) => c.id === cartId)

  if (!cart) {
    return (
      <main className="app">
        <AppBar />
        <section className="panel">
          <p className="board-empty muted">No cart #{id}.</p>
          <Link className="button" to="/app/carts">
            Back to carts
          </Link>
        </section>
      </main>
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

  return (
    <main className="app app-wide">
      <AppBar />

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
          <span className="cart-total">{money(total)}</span>
        </div>

        {cart.items.length === 0 ? (
          <p className="board-empty muted">Nothing in this cart yet. Search below to add a card.</p>
        ) : (
          <ul className="line-list">
            {cart.items.map((item) => {
              const card = cardById(item.cardId)
              const graded = isGraded(card)
              const book = priceFor(card, 'buyPrice', item.condition)

              return (
                <li key={item.id} className="line">
                  <div className="line-main">
                    <span className="line-name">
                      {card.name}
                      {card.collectorNumber && (
                        <span className="muted"> · {card.collectorNumber}</span>
                      )}
                    </span>
                    <span className="muted line-meta">
                      {setFor(card)?.name}
                      {graded && ` · ${gradeLabel(card)}`}
                    </span>
                  </div>

                  <label className="line-control">
                    <span className="muted">Qty</span>
                    <input
                      type="number"
                      min="1"
                      // A graded card is one slab with one cert number, so the
                      // quantity is not a number anyone gets to pick.
                      max={graded ? 1 : undefined}
                      value={item.quantity}
                      disabled={locked || graded}
                      onChange={(e) => updateItem(cart.id, item.id, { quantity: e.target.value })}
                      aria-label={`Quantity of ${card.name}`}
                    />
                  </label>

                  <label className="line-control line-condition">
                    <span className="muted">Condition</span>
                    {graded ? (
                      <input type="text" value={conditionLabel(item.condition)} disabled readOnly />
                    ) : (
                      <select
                        value={item.condition}
                        disabled={locked}
                        onChange={(e) =>
                          updateItem(cart.id, item.id, { condition: e.target.value })
                        }
                        aria-label={`Condition of ${card.name}`}
                      >
                        {CONDITIONS.map((condition) => (
                          <option key={condition.code} value={condition.code}>
                            {condition.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>

                  <label className="line-control">
                    <span className="muted">Offer</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.offerPrice}
                      disabled={locked}
                      onChange={(e) =>
                        updateItem(cart.id, item.id, { offerPrice: Number(e.target.value) })
                      }
                      aria-label={`Offer price for ${card.name}`}
                    />
                  </label>

                  <div className="line-figures">
                    <span className="line-total">{money(lineTotal(item))}</span>
                    {/* Book price is the reference the offer was negotiated
                        against, so it stays visible once the offer moves. */}
                    {book != null && item.offerPrice !== book && (
                      <span className="muted">book {money(book)}</span>
                    )}
                  </div>

                  {!locked && (
                    <button
                      type="button"
                      className="line-remove"
                      onClick={() => removeItem(cart.id, item.id)}
                      aria-label={`Remove ${card.name}`}
                    >
                      &times;
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {!locked && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Add a card</h2>
              <p className="muted">Adds at the book buy price — adjust the offer on the line</p>
            </div>
          </div>

          <CardSearch onAdd={(card) => addItem(cart.id, { cardId: card.shopifyProductId })} />
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

          <div className="complete-row">
            <label className="line-control">
              <span className="muted">Payment</span>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                {PAYMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <span className="cart-total">{money(total)}</span>

            <button
              type="button"
              // BuyTransaction requires a total and at least something to pay
              // for; an empty cart has no transaction to write.
              disabled={cart.items.length === 0 || cart.buyerIds.length === 0}
              onClick={() => completeCart(cart.id, { paymentType, completedById: user.id })}
            >
              Complete buy
            </button>
          </div>

          {(cart.items.length === 0 || cart.buyerIds.length === 0) && (
            <p className="muted fieldset-hint">
              {cart.items.length === 0
                ? 'Add at least one card first.'
                : 'Assign at least one buyer first.'}
            </p>
          )}
        </section>
      ) : (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Transaction</h2>
              <p className="muted">
                {PAYMENT_TYPES.find((t) => t.value === cart.transaction?.paymentType)?.label} ·
                completed {when(cart.transaction.completedAt)} by{' '}
                {nameOf(cart.transaction.completedById)}
              </p>
            </div>
            <span className="cart-total">{money(cart.transaction.totalPrice)}</span>
          </div>
        </section>
      )}

      <p className="hint muted">
        Dummy data — nothing here is saved to the server yet.
      </p>
    </main>
  )
}
