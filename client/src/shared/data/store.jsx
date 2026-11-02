import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { cardById, defaultCondition, isGraded, priceFor } from './catalog.js'

// In-memory stand-in for the carts API. Lives for the life of the tab: a
// refresh resets it, which is the honest behaviour for a dummy layer -- it
// never looks like it saved something it didn't.
//
// Every action below is shaped like the request that will replace it, so the
// swap is one function body each:
//   createCart   -> POST   /api/carts
//   addItem      -> POST   /api/carts/:id/items
//   updateItem   -> PATCH  /api/carts/:id/items/:itemId
//   removeItem   -> DELETE /api/carts/:id/items/:itemId
//   toggleBuyer  -> PUT/DELETE /api/carts/:id/buyers/:userId
//   completeCart -> POST   /api/carts/:id/transaction

const DataContext = createContext(null)

// server/models/Cart.js -- status is a bare STRING, so these two values are a
// convention, not a constraint. The dashboard's tiles already link with
// ?status=in_progress and ?status=completed, so they have to match those.
export const IN_PROGRESS = 'in_progress'
export const COMPLETED = 'completed'

// server/models/BuyTransaction.js -- paymentType is an ENUM, so this list is
// the real constraint and the picker must not offer anything else.
export const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'store_credit', label: 'Store credit' },
]

const SEED_CUSTOMERS = [
  {
    id: 1,
    shopifyCustomerId: 'gid://shopify/Customer/551001',
    firstName: 'Dana',
    lastName: 'Whitfield',
    phoneNumber: '555-0142',
    email: 'dana.whitfield@example.com',
  },
  {
    id: 2,
    shopifyCustomerId: 'gid://shopify/Customer/551002',
    firstName: 'Marcus',
    lastName: 'Reyes',
    phoneNumber: '555-0177',
    email: 'm.reyes@example.com',
  },
  {
    id: 3,
    shopifyCustomerId: 'gid://shopify/Customer/551003',
    firstName: 'Priya',
    lastName: 'Nandakumar',
    phoneNumber: null,
    email: 'priya.n@example.com',
  },
  {
    id: 4,
    shopifyCustomerId: 'gid://shopify/Customer/551004',
    firstName: 'Tom',
    lastName: 'Alvarez',
    phoneNumber: '555-0190',
    email: null,
  },
]

// Staff who can be assigned to a cart. The signed-in user is merged into this
// list at render time, so whoever is logged in is always assignable even
// though this dummy list can't know their id.
const SEED_STAFF = [
  { id: 2, firstName: 'Bryan', lastName: 'Kennedy', email: 'bryan@laytongaming.com' },
  { id: 3, firstName: 'Houston', lastName: 'Thomas', email: 'houston@laytongaming.com' },
  { id: 4, firstName: 'Liam', lastName: 'Culhane', email: 'liam@laytongaming.com' },
  { id: 5, firstName: 'John', lastName: 'Fortnite', email: 'john@laytongaming.com' },
]

const SEED_CARTS = [
  {
    id: 1,
    customerId: 1,
    status: IN_PROGRESS,
    buyerIds: [2],
    createdAt: '2026-10-19T14:10:00Z',
    transaction: null,
    priceHistory: [],
    items: [
      {
        id: 1,
        cardId: 'gid://shopify/Product/8841001',
        quantity: 1,
        condition: 'LP',
        offerPrice: 205,
      },
      {
        id: 2,
        cardId: 'gid://shopify/Product/8841004',
        quantity: 4,
        condition: 'NM',
        offerPrice: 9,
      },
    ],
  },
  {
    id: 2,
    customerId: 3,
    status: IN_PROGRESS,
    buyerIds: [3, 4],
    createdAt: '2026-10-19T15:02:00Z',
    transaction: null,
    priceHistory: [],
    items: [
      {
        id: 3,
        cardId: 'gid://shopify/Product/8843003',
        quantity: 1,
        condition: 'GRADED',
        offerPrice: 780,
      },
    ],
  },
  {
    id: 3,
    customerId: 2,
    status: COMPLETED,
    priceHistory: [],
    buyerIds: [2, 3],
    createdAt: '2026-10-18T11:30:00Z',
    transaction: {
      id: 1,
      paymentType: 'store_credit',
      // Only the allocation is stored; the payout is derived from it by
      // payoutFor at render time, so the bonus rate lives in exactly one
      // place and old transactions cannot disagree with the function.
      allocation: { cash: 0, check: 0, store_credit: 117 },
      totalPrice: 117,
      completedById: 3,
      completedAt: '2026-10-18T12:05:00Z',
    },
    items: [
      {
        id: 4,
        cardId: 'gid://shopify/Product/8841005',
        quantity: 2,
        condition: 'NM',
        offerPrice: 34,
      },
      {
        id: 5,
        cardId: 'gid://shopify/Product/8842003',
        quantity: 1,
        condition: 'LP',
        offerPrice: 9.6,
      },
      {
        id: 6,
        cardId: 'gid://shopify/Product/8842005',
        quantity: 12,
        condition: 'NM',
        offerPrice: 3.1,
      },
    ],
  },
]

// A graded card is one physical slab with one cert number, so a line can
// never hold more than one of it. Raw cards are fungible and can stack.
export function maxQuantity(card) {
  return card && isGraded(card) ? 1 : Infinity
}

export function clampQuantity(card, n) {
  const whole = Math.floor(Number(n))
  if (!Number.isFinite(whole) || whole < 1) return 1
  return Math.min(whole, maxQuantity(card))
}

// Both totals go through cents and back. Multiplying dollars directly makes
// 3 x $2.45 come out as 7.350000000000001, and summing those across a cart
// compounds it -- money arithmetic has no business carrying that.
export function lineTotal(item) {
  return Math.round(item.quantity * item.offerPrice * 100) / 100
}

// Offers are DECIMAL(10,2) on CartItem, so a cent is the smallest unit there
// is. Distribution happens in integer cents and converts back at the end --
// splitting a total in floating-point dollars drifts, and the lines have to
// add back up to exactly the number the buyer typed.
const toCents = (n) => Math.round(n * 100)
const toDollars = (n) => n / 100

/**
 * Re-price a cart to hit `targetTotal`, **weighted by what each line is
 * already worth**. A $5 card, a $10 card and a $5 card retotalled to $25
 * take 25% / 50% / 25% of the change, landing at $6.25 / $12.50 / $6.25.
 *
 * In other words every offer is scaled by the same factor, which keeps the
 * relative value of the cards intact. An even split would quietly destroy
 * that: +$5 spread evenly over those three cards pays $6.67 for a $5 common
 * and $11.67 for a card worth twice as much.
 *
 * Pure: returns the new per-card offers rather than touching the cart, so it
 * can be used for a preview as readily as for the write.
 *
 * Two wrinkles:
 *
 *  - **Cents do not divide evenly.** Each offer is floored, then the
 *    remainder goes out one cent at a time, biggest fractional part first,
 *    so the lines that were closest to rounding up are the ones that do.
 *  - **A cart already at zero has no weights to scale.** Nothing is worth
 *    anything relative to anything else, so that one case falls back to an
 *    even split per card.
 *
 * Exactness is not always reachable: a single line of 3 cards can only make
 * totals that are multiples of 3 cents. `exact` reports whether the target
 * was actually hit, so the caller can say so rather than quietly rounding.
 */
export function distributeTotal(items, targetTotal) {
  const target = Math.max(0, toCents(targetTotal))
  if (items.length === 0) return { offers: [], achieved: 0, exact: target === 0 }

  const qty = items.map((i) => i.quantity)
  const current = items.reduce((sum, i) => sum + toCents(i.offerPrice) * i.quantity, 0)

  // Floor first, then hand out the shortfall -- flooring can only undershoot,
  // so the remainder is always non-negative and no offer can go below zero.
  const exactUnits = items.map((item) =>
    current === 0
      ? target / qty.reduce((n, q) => n + q, 0)
      : (toCents(item.offerPrice) * target) / current,
  )
  const units = exactUnits.map((u) => Math.floor(u))
  const totalOf = () => units.reduce((sum, unit, i) => sum + unit * qty[i], 0)

  // Lines that were closest to rounding up get the spare cents. Bumping a
  // line by one cent moves the total by its quantity, so a line can only
  // take a cent when its quantity still fits in what is left.
  const byFraction = units
    .map((_, i) => i)
    .sort((a, b) => exactUnits[b] - units[b] - (exactUnits[a] - units[a]))

  let moved = true
  while (moved) {
    const left = target - totalOf()
    if (left <= 0) break
    moved = false
    for (const i of byFraction) {
      if (qty[i] > target - totalOf()) continue
      units[i] += 1
      moved = true
      if (totalOf() === target) break
    }
  }

  const achieved = totalOf()
  return { offers: units.map(toDollars), achieved: toDollars(achieved), exact: achieved === target }
}

// Store credit is worth more to the shop than cash is, so the customer is
// offered more of it. Applied to the credit portion only: the cart total is
// the cash value, and whatever slice of it they take as credit is grossed up.
export const STORE_CREDIT_BONUS = 0.15

/**
 * Turn an allocation of the cart's cash value into what is actually handed
 * over. `allocation` is { cash, check, store_credit } in cash-value dollars.
 *
 * Only the store credit line is grossed up -- $60 of cash value taken as
 * credit becomes $69 of credit.
 */
export function payoutFor(allocation) {
  const cash = Number(allocation.cash) || 0
  const check = Number(allocation.check) || 0
  const credit = Number(allocation.store_credit) || 0
  const creditValue = toDollars(toCents(credit * (1 + STORE_CREDIT_BONUS)))

  return {
    cash,
    check,
    credit,
    creditValue,
    bonus: toDollars(toCents(creditValue - credit)),
    allocated: toDollars(toCents(cash + check + credit)),
    handedOver: toDollars(toCents(cash + check + creditValue)),
  }
}

export function cartTotal(cart) {
  const cents = cart.items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.offerPrice * 100),
    0,
  )
  return cents / 100
}

// Individual cards, not lines -- the dashboard leaderboard counts the same
// way, so a 12-card line counts as 12.
export function cartCardCount(cart) {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}

const HISTORY_LIMIT = 25

// Undo records only the fields that carry a price -- not the whole line. A
// quantity typed after a price edit must survive the undo of that edit, so
// restoring a wholesale copy of the items array is the wrong move.
export function priceSnapshot(items) {
  return items.map(({ id, cardId, condition, offerPrice }) => ({
    id,
    cardId,
    condition,
    offerPrice,
  }))
}

export function restorePrices(items, snapshot) {
  const was = new Map(snapshot.map((s) => [s.id, s]))
  return items.map((item) => {
    const old = was.get(item.id)
    // Lines added since the snapshot have no entry and are left alone.
    return old
      ? { ...item, cardId: old.cardId, condition: old.condition, offerPrice: old.offerPrice }
      : item
  })
}

// Consecutive edits sharing a key collapse into one entry, so typing "2" then
// "25" into an offer field is a single undo step rather than two.
function pushHistory(cart, key) {
  const top = cart.priceHistory[cart.priceHistory.length - 1]
  if (top && top.key === key) return cart.priceHistory
  return [...cart.priceHistory, { key, items: priceSnapshot(cart.items) }].slice(-HISTORY_LIMIT)
}

// BuyTransaction.paymentType is a single ENUM, so a split has no honest value
// to put there. The largest slice stands in; `allocation` on the transaction
// is what actually describes the payment.
function dominantPayment(allocation) {
  return (
    Object.entries(allocation)
      .filter(([, amount]) => Number(amount) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? 'cash'
  )
}

export function DataProvider({ children }) {
  const [carts, setCarts] = useState(SEED_CARTS)
  const [customers, setCustomers] = useState(SEED_CUSTOMERS)

  // Refs, not state. Postgres would be issuing these ids; nothing renders
  // from them, and a ref can be read and bumped inside a setCarts updater
  // without making that updater impure or going stale between two calls in
  // the same tick.
  const nextCartId = useRef(4)
  const nextItemId = useRef(7)
  const nextCustomerId = useRef(5)

  const createCart = useCallback(({ customerId, buyerIds = [] }) => {
    const id = nextCartId.current++
    setCarts((prev) => [
      ...prev,
      {
        id,
        customerId: Number(customerId),
        status: IN_PROGRESS,
        buyerIds: [...buyerIds],
        createdAt: new Date().toISOString(),
        transaction: null,
        priceHistory: [],
        items: [],
      },
    ])
    return id
  }, [])

  const addItem = useCallback((cartId, { cardId, condition, quantity = 1, offerPrice }) => {
    const card = cardById(cardId)
    const cond = condition ?? defaultCondition(card)
    // Allocated up front so the updater below stays pure. If the add stacks
    // onto an existing line this id goes unused, which only leaves a gap.
    const itemId = nextItemId.current++

    setCarts((prev) =>
      prev.map((cart) => {
        if (cart.id !== cartId) return cart

        // Same card at the same condition stacks onto the existing line
        // rather than opening a second one -- except graded, which can't.
        const existing = cart.items.find((i) => i.cardId === cardId && i.condition === cond)
        if (existing && !isGraded(card)) {
          return {
            ...cart,
            items: cart.items.map((i) =>
              i === existing ? { ...i, quantity: clampQuantity(card, i.quantity + quantity) } : i,
            ),
          }
        }
        if (existing) return cart

        const price = offerPrice ?? priceFor(card, 'buyPrice', cond) ?? 0
        const item = {
          id: itemId,
          cardId,
          condition: cond,
          quantity: clampQuantity(card, quantity),
          offerPrice: price,
        }
        return { ...cart, items: [...cart.items, item] }
      }),
    )
  }, [])

  const updateItem = useCallback((cartId, itemId, patch) => {
    // Quantity is not a price, so it does not open an undo step. Each of the
    // three that are get their own key, so changing the condition and then
    // the offer are two separate undos rather than one lumped step.
    const priceKey =
      patch.offerPrice !== undefined
        ? `offer:${itemId}`
        : patch.condition !== undefined
          ? `condition:${itemId}`
          : patch.cardId !== undefined
            ? `printing:${itemId}`
            : null

    setCarts((prev) =>
      prev.map((cart) =>
        cart.id !== cartId
          ? cart
          : {
              ...cart,
              priceHistory: priceKey ? pushHistory(cart, priceKey) : cart.priceHistory,
              items: cart.items.map((item) => {
                if (item.id !== itemId) return item
                const next = { ...item, ...patch }
                const wasCard = cardById(item.cardId)
                const nowCard = cardById(next.cardId)

                // Switching the printing swaps which card the line points at,
                // because each printing is its own catalog row. Both that and
                // a condition change move the suggested price, so re-price --
                // but only if the offer was still sitting at the old
                // suggested price.
                // A hand-typed offer is a negotiated number and survives.
                const repriced = next.cardId !== item.cardId || next.condition !== item.condition
                if (repriced) {
                  const was = priceFor(wasCard, 'buyPrice', item.condition)
                  if (was != null && item.offerPrice === was) {
                    next.offerPrice =
                      priceFor(nowCard, 'buyPrice', next.condition) ?? item.offerPrice
                  }
                }

                next.quantity = clampQuantity(nowCard, next.quantity)
                return next
              }),
            },
      ),
    )
  }, [])

  const removeItem = useCallback((cartId, itemId) => {
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id !== cartId ? cart : { ...cart, items: cart.items.filter((i) => i.id !== itemId) },
      ),
    )
  }, [])

  // Negotiating on the whole pile rather than card by card: "I'll give you
  // $500 for the lot." Replaces every offer at once -- which is why it does
  // not go through updateItem, whose re-pricing rule would fight it.
  const setCartTotal = useCallback((cartId, targetTotal) => {
    setCarts((prev) =>
      prev.map((cart) => {
        if (cart.id !== cartId) return cart
        const { offers } = distributeTotal(cart.items, targetTotal)
        return {
          ...cart,
          // One undo step per retotal, never coalesced: each is a deliberate
          // act, unlike the keystrokes inside a single offer field.
          priceHistory: [
            ...cart.priceHistory,
            { key: `total:${Date.now()}`, items: priceSnapshot(cart.items) },
          ].slice(-HISTORY_LIMIT),
          items: cart.items.map((item, i) => ({ ...item, offerPrice: offers[i] })),
        }
      }),
    )
  }, [])

  const undoPrice = useCallback((cartId) => {
    setCarts((prev) =>
      prev.map((cart) => {
        if (cart.id !== cartId || cart.priceHistory.length === 0) return cart
        const previous = cart.priceHistory[cart.priceHistory.length - 1]
        return {
          ...cart,
          priceHistory: cart.priceHistory.slice(0, -1),
          items: restorePrices(cart.items, previous.items),
        }
      }),
    )
  }, [])

  // Walk-ins who have never sold to the shop before. shopifyCustomerId is
  // NOT NULL and unique on the model, but a real one only exists once
  // Shopify has been told about the customer -- so this mints a local
  // placeholder and flags it for the sync that does not exist yet.
  const addCustomer = useCallback(({ firstName, lastName, phoneNumber, email }) => {
    const id = nextCustomerId.current++
    setCustomers((prev) => [
      ...prev,
      {
        id,
        shopifyCustomerId: `local:pending/${id}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber?.trim() || null,
        email: email?.trim() || null,
      },
    ])
    return id
  }, [])

  const toggleBuyer = useCallback((cartId, userId) => {
    setCarts((prev) =>
      prev.map((cart) => {
        if (cart.id !== cartId) return cart
        const assigned = cart.buyerIds.includes(userId)
        return {
          ...cart,
          buyerIds: assigned
            ? cart.buyerIds.filter((id) => id !== userId)
            : [...cart.buyerIds, userId],
        }
      }),
    )
  }, [])

  const completeCart = useCallback((cartId, { allocation, completedById }) => {
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id !== cartId
          ? cart
          : {
              ...cart,
              status: COMPLETED,
              transaction: {
                id: cart.id,
                allocation: { ...allocation },
                // Kept so the existing ENUM column still has something to
                // take. It is lossy for a split -- `allocation` is the truth.
                paymentType: dominantPayment(allocation),
                completedById,
                totalPrice: cartTotal(cart),
                completedAt: new Date().toISOString(),
              },
            },
      ),
    )
  }, [])

  const value = useMemo(
    () => ({
      carts,
      customers,
      staff: SEED_STAFF,
      createCart,
      addItem,
      updateItem,
      removeItem,
      setCartTotal,
      undoPrice,
      addCustomer,
      toggleBuyer,
      completeCart,
    }),
    [
      carts,
      customers,
      createCart,
      addItem,
      updateItem,
      removeItem,
      setCartTotal,
      undoPrice,
      addCustomer,
      toggleBuyer,
      completeCart,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}

export function customerName(customer) {
  if (!customer) return 'Unknown customer'
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ')
}

export function staffName(person) {
  if (!person) return 'Unknown'
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email
}
