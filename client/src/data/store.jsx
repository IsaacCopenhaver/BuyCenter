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
  { id: 1, shopifyCustomerId: 'gid://shopify/Customer/551001', firstName: 'Dana', lastName: 'Whitfield', phoneNumber: '555-0142', email: 'dana.whitfield@example.com' },
  { id: 2, shopifyCustomerId: 'gid://shopify/Customer/551002', firstName: 'Marcus', lastName: 'Reyes', phoneNumber: '555-0177', email: 'm.reyes@example.com' },
  { id: 3, shopifyCustomerId: 'gid://shopify/Customer/551003', firstName: 'Priya', lastName: 'Nandakumar', phoneNumber: null, email: 'priya.n@example.com' },
  { id: 4, shopifyCustomerId: 'gid://shopify/Customer/551004', firstName: 'Tom', lastName: 'Alvarez', phoneNumber: '555-0190', email: null },
]

// Staff who can be assigned to a cart. The signed-in user is merged into this
// list at render time, so whoever is logged in is always assignable even
// though this dummy list can't know their id.
const SEED_STAFF = [
  { id: 2, firstName: 'Jordan', lastName: 'Lee', email: 'jordan@laytongaming.com' },
  { id: 3, firstName: 'Sam', lastName: 'Okafor', email: 'sam@laytongaming.com' },
  { id: 4, firstName: 'Riley', lastName: 'Chen', email: 'riley@laytongaming.com' },
]

const SEED_CARTS = [
  {
    id: 1,
    customerId: 1,
    status: IN_PROGRESS,
    buyerIds: [2],
    createdAt: '2026-10-19T14:10:00Z',
    transaction: null,
    items: [
      { id: 1, cardId: 'gid://shopify/Product/8841001', quantity: 1, condition: 'LP', offerPrice: 205 },
      { id: 2, cardId: 'gid://shopify/Product/8841004', quantity: 4, condition: 'NM', offerPrice: 9 },
    ],
  },
  {
    id: 2,
    customerId: 3,
    status: IN_PROGRESS,
    buyerIds: [3, 4],
    createdAt: '2026-10-19T15:02:00Z',
    transaction: null,
    items: [
      { id: 3, cardId: 'gid://shopify/Product/8843003', quantity: 1, condition: 'GRADED', offerPrice: 780 },
    ],
  },
  {
    id: 3,
    customerId: 2,
    status: COMPLETED,
    buyerIds: [2, 3],
    createdAt: '2026-10-18T11:30:00Z',
    transaction: { id: 1, paymentType: 'store_credit', totalPrice: 117, completedById: 3, completedAt: '2026-10-18T12:05:00Z' },
    items: [
      { id: 4, cardId: 'gid://shopify/Product/8841005', quantity: 2, condition: 'NM', offerPrice: 34 },
      { id: 5, cardId: 'gid://shopify/Product/8842003', quantity: 1, condition: 'LP', offerPrice: 9.6 },
      { id: 6, cardId: 'gid://shopify/Product/8842005', quantity: 12, condition: 'NM', offerPrice: 3.1 },
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

export function lineTotal(item) {
  return item.quantity * item.offerPrice
}

export function cartTotal(cart) {
  return cart.items.reduce((sum, item) => sum + lineTotal(item), 0)
}

// Individual cards, not lines -- the dashboard leaderboard counts the same
// way, so a 12-card line counts as 12.
export function cartCardCount(cart) {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}

export function DataProvider({ children }) {
  const [carts, setCarts] = useState(SEED_CARTS)

  // Refs, not state. Postgres would be issuing these ids; nothing renders
  // from them, and a ref can be read and bumped inside a setCarts updater
  // without making that updater impure or going stale between two calls in
  // the same tick.
  const nextCartId = useRef(4)
  const nextItemId = useRef(7)

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
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id !== cartId
          ? cart
          : {
              ...cart,
              items: cart.items.map((item) => {
                if (item.id !== itemId) return item
                const next = { ...item, ...patch }
                const card = cardById(item.cardId)

                // Re-price when the condition changes, but only if the offer
                // was still sitting at the old condition's book price. A
                // hand-typed offer is a negotiated number and survives.
                if (patch.condition && patch.condition !== item.condition) {
                  const was = priceFor(card, 'buyPrice', item.condition)
                  if (was != null && item.offerPrice === was) {
                    next.offerPrice = priceFor(card, 'buyPrice', patch.condition) ?? item.offerPrice
                  }
                }

                next.quantity = clampQuantity(card, next.quantity)
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

  const completeCart = useCallback((cartId, { paymentType, completedById }) => {
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id !== cartId
          ? cart
          : {
              ...cart,
              status: COMPLETED,
              transaction: {
                id: cart.id,
                paymentType,
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
      customers: SEED_CUSTOMERS,
      staff: SEED_STAFF,
      createCart,
      addItem,
      updateItem,
      removeItem,
      toggleBuyer,
      completeCart,
    }),
    [carts, createCart, addItem, updateItem, removeItem, toggleBuyer, completeCart],
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
