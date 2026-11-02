import { describe, expect, it } from 'vitest'
import {
  STORE_CREDIT_BONUS,
  cartCardCount,
  cartTotal,
  clampQuantity,
  distributeTotal,
  lineTotal,
  payoutFor,
  priceSnapshot,
  restorePrices,
} from '@/shared/data/store.jsx'
import { CARDS, isGraded } from '@/shared/data/catalog.js'

const raw = CARDS.find((c) => !isGraded(c))
const graded = CARDS.find(isGraded)
const cents = (n) => Math.round(n * 100)
const items = (...pairs) => pairs.map(([quantity, offerPrice]) => ({ quantity, offerPrice }))
const sumOf = (its, offers) => its.reduce((s, it, i) => s + cents(offers[i]) * it.quantity, 0)

describe('line and cart totals', () => {
  // These go through integer cents; multiplying dollars gives 7.350000000000001.
  it('multiplies a line without float drift', () => {
    expect(lineTotal({ quantity: 3, offerPrice: 2.45 })).toBe(7.35)
    expect(lineTotal({ quantity: 7, offerPrice: 0.1 })).toBe(0.7)
  })

  it('sums a cart without float drift', () => {
    const cart = { items: items([3, 2.45], [1, 0.1], [1, 0.2]) }
    expect(cartTotal(cart)).toBe(7.65)
  })

  it('does not accumulate error over a long cart', () => {
    const cart = {
      items: Array.from({ length: 60 }, (_, i) => ({
        quantity: (i % 7) + 1,
        offerPrice: 0.01 * ((i % 13) + 1),
      })),
    }
    expect(Number.isInteger(cents(cartTotal(cart)))).toBe(true)
  })

  it('counts cards rather than lines', () => {
    expect(cartCardCount({ items: items([3, 1], [4, 1]) })).toBe(7)
  })

  it('totals an empty cart at zero', () => {
    expect(cartTotal({ items: [] })).toBe(0)
  })
})

describe('quantity rules', () => {
  it('caps a graded slab at one', () => {
    expect(clampQuantity(graded, 5)).toBe(1)
  })

  it('leaves raw quantities alone', () => {
    expect(clampQuantity(raw, 5)).toBe(5)
  })

  it('floors nonsense to one', () => {
    expect(clampQuantity(raw, 0)).toBe(1)
    expect(clampQuantity(raw, -3)).toBe(1)
    expect(clampQuantity(raw, 'abc')).toBe(1)
    expect(clampQuantity(raw, 2.9)).toBe(2)
  })
})

describe('distributeTotal weights by line value', () => {
  it('splits the change 25/50/25 across a $5, $10 and $5 card', () => {
    const { offers, exact } = distributeTotal(items([1, 5], [1, 10], [1, 5]), 25)
    expect(offers).toEqual([6.25, 12.5, 6.25])
    expect(exact).toBe(true)
  })

  it('scales every offer by the same factor', () => {
    expect(distributeTotal(items([1, 10], [1, 20]), 60).offers).toEqual([20, 40])
    expect(distributeTotal(items([1, 10], [1, 20]), 15).offers).toEqual([5, 10])
  })

  it('gives a line of four, four times the weight of a line of one', () => {
    expect(distributeTotal(items([4, 10], [1, 10]), 100).offers).toEqual([20, 20])
  })

  it('falls back to an even split when the cart is worth nothing', () => {
    const { offers } = distributeTotal(items([1, 0], [1, 0]), 50)
    expect(offers).toEqual([25, 25])
  })

  it('leaves a free card free when the rest is scaled', () => {
    expect(distributeTotal(items([1, 0], [1, 10]), 20).offers[0]).toBe(0)
  })

  it('zeroes every line for a target of zero', () => {
    expect(distributeTotal(items([2, 5], [3, 7]), 0).offers).toEqual([0, 0])
  })

  it('clamps a negative target to zero', () => {
    expect(distributeTotal(items([1, 5]), -10).offers).toEqual([0])
  })

  it('reports inexact rather than silently rounding', () => {
    // One line of three cards can only make multiples of three cents.
    const { exact, achieved } = distributeTotal(items([3, 1]), 3.01)
    expect(exact).toBe(false)
    expect(Math.abs(cents(achieved) - 301)).toBeLessThanOrEqual(2)
  })

  it('holds its invariants across 2000 random carts', () => {
    for (let n = 0; n < 2000; n++) {
      const its = Array.from({ length: 1 + Math.floor(Math.random() * 5) }, () => ({
        quantity: 1 + Math.floor(Math.random() * 12),
        offerPrice: Math.round(Math.random() * 30000) / 100,
      }))
      const target = Math.round(Math.random() * 120000) / 100
      const { offers, achieved, exact } = distributeTotal(its, target)

      expect(offers.every((o) => o >= 0)).toBe(true)
      expect(sumOf(its, offers)).toBe(cents(achieved))
      if (exact) expect(cents(achieved)).toBe(cents(target))
    }
  })
})

describe('payout applies the bonus to the credit portion only', () => {
  it('grosses up $60 of credit to $69', () => {
    const p = payoutFor({ cash: 0, check: 40, store_credit: 60 })
    expect(p.allocated).toBe(100)
    expect(p.creditValue).toBe(69)
    expect(p.bonus).toBe(9)
    expect(p.handedOver).toBe(109)
  })

  it('pays cash at face value', () => {
    const p = payoutFor({ cash: 100, check: 0, store_credit: 0 })
    expect(p.handedOver).toBe(100)
    expect(p.bonus).toBe(0)
  })

  it('pays $115 on a $100 buy taken entirely as credit', () => {
    expect(payoutFor({ cash: 0, check: 0, store_credit: 100 }).handedOver).toBe(115)
  })

  it('rounds the uplift to whole cents', () => {
    expect(cents(payoutFor({ store_credit: 33.33 }).creditValue)).toBe(Math.round(3333 * 1.15))
  })

  it('pays nothing for an empty allocation', () => {
    expect(payoutFor({}).handedOver).toBe(0)
  })

  it('uses a 15% bonus', () => {
    expect(STORE_CREDIT_BONUS).toBe(0.15)
  })
})

describe('undo restores prices without disturbing anything else', () => {
  const before = [
    { id: 1, cardId: 'A', condition: 'NM', offerPrice: 10, quantity: 1 },
    { id: 2, cardId: 'B', condition: 'LP', offerPrice: 20, quantity: 3 },
  ]
  const snapshot = priceSnapshot(before)

  it('records only the price-bearing fields', () => {
    expect(Object.keys(snapshot[0]).sort()).toEqual(['cardId', 'condition', 'id', 'offerPrice'])
  })

  it('leaves a quantity typed after the price edit alone', () => {
    const after = [{ ...before[0], offerPrice: 99, quantity: 7 }]
    const [line] = restorePrices(after, snapshot)
    expect(line.offerPrice).toBe(10)
    expect(line.quantity).toBe(7)
  })

  it('reverts a printing switch and its re-price together', () => {
    const [line] = restorePrices([{ ...before[0], cardId: 'A-foil', offerPrice: 31 }], snapshot)
    expect(line).toMatchObject({ cardId: 'A', offerPrice: 10 })
  })

  it('ignores lines added since the snapshot', () => {
    const added = { id: 9, cardId: 'C', condition: 'NM', offerPrice: 5, quantity: 2 }
    const result = restorePrices([...before, added], snapshot)
    expect(result).toHaveLength(3)
    expect(result[2].offerPrice).toBe(5)
  })

  it('does not resurrect a line removed since', () => {
    expect(restorePrices([before[0]], snapshot)).toHaveLength(1)
  })
})
