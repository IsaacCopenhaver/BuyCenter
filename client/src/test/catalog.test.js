import { describe, expect, it } from 'vitest'
import {
  CARDS,
  CONDITIONS,
  GAMES,
  PRINTINGS,
  gameFor,
  gradingFor,
  isGraded,
  placeholderFor,
  priceFor,
  priceGrid,
  printingsFor,
  searchCards,
  searchResults,
  setFor,
  stockFor,
  tcgProductIdFor,
} from '@/shared/data/catalog.js'

const raw = CARDS.find((c) => !isGraded(c))
const graded = CARDS.find(isGraded)

describe('catalog honours the model constraints', () => {
  it('makes every card raw xor graded, as Card.js validates', () => {
    expect(CARDS.every((c) => (c.tcgProductId != null) !== (c.gradingId != null))).toBe(true)
  })

  it('points every card at a real set and game', () => {
    expect(CARDS.every((c) => setFor(c) != null && gameFor(c) != null)).toBe(true)
  })

  it('points every graded card at a real grading row', () => {
    expect(CARDS.filter(isGraded).every((c) => gradingFor(c) != null)).toBe(true)
  })

  it('gives every card a printing from its own game vocabulary', () => {
    expect(CARDS.every((c) => PRINTINGS[gameFor(c).id].includes(c.printing))).toBe(true)
  })

  it('keeps every shopifyProductId unique', () => {
    expect(new Set(CARDS.map((c) => c.shopifyProductId)).size).toBe(CARDS.length)
  })

  it('prices every condition of every raw card, below market', () => {
    const rawCards = CARDS.filter((c) => !isGraded(c))
    expect(
      rawCards.every((c) => CONDITIONS.every((cond) => priceFor(c, 'buyPrice', cond.code) != null)),
    ).toBe(true)
    expect(
      CARDS.every((c) => Object.keys(c.buyPrice).every((k) => c.buyPrice[k] < c.marketPrice[k])),
    ).toBe(true)
  })
})

describe('search', () => {
  it('returns nothing for an empty query rather than the whole catalog', () => {
    expect(searchCards('')).toHaveLength(0)
    expect(searchResults('')).toHaveLength(0)
  })

  it('matches name, set, printing and cert number', () => {
    expect(searchCards('charizard').length).toBeGreaterThan(0)
    expect(searchCards('jungle').length).toBeGreaterThan(0)
    expect(searchCards('shadowless').length).toBe(1)
    expect(searchCards('PSA-74120055')).toHaveLength(1)
  })

  it('ignores case', () => {
    expect(searchCards('ChArIzArD').length).toBe(searchCards('charizard').length)
  })

  it('applies the type filter', () => {
    expect(searchCards('charizard', { type: 'graded' }).every(isGraded)).toBe(true)
    expect(searchCards('charizard', { type: 'raw' }).every((c) => !isGraded(c))).toBe(true)
  })

  it('applies the game filter', () => {
    const magic = GAMES.find((g) => g.name.startsWith('Magic'))
    expect(searchCards('a', { gameId: magic.id }).every((c) => gameFor(c).id === magic.id)).toBe(
      true,
    )
  })
})

describe('searchResults collapses printings into one card', () => {
  it('returns one grouped card plus the slab for charizard', () => {
    const results = searchResults('charizard')
    expect(searchCards('charizard')).toHaveLength(4)
    expect(results).toHaveLength(2)
    expect(results.find((g) => !isGraded(g.matched)).printings).toHaveLength(3)
  })

  it('never groups a graded slab with anything', () => {
    expect(
      searchResults('charizard')
        .filter((g) => isGraded(g.matched))
        .every((g) => g.printings.length === 1),
    ).toBe(true)
  })

  it('only ever groups the same card, set and collector number', () => {
    expect(
      searchResults('charizard').every((g) =>
        g.printings.every(
          (p) =>
            p.name === g.matched.name &&
            p.setId === g.matched.setId &&
            p.collectorNumber === g.matched.collectorNumber,
        ),
      ),
    ).toBe(true)
  })

  it('opens the row on the printing the query actually hit', () => {
    const [group] = searchResults('shadowless')
    expect(group.matched.printing).toBe('Shadowless Holofoil')
    expect(group.printings).toHaveLength(3)
  })

  it('keeps group keys unique across a broad search', () => {
    const results = searchResults('a')
    expect(new Set(results.map((g) => g.key)).size).toBe(results.length)
  })
})

describe('printings', () => {
  it('orders a card best printing first', () => {
    const charizard = CARDS.find(
      (c) => c.name === 'Charizard' && c.printing === 'Holofoil' && !isGraded(c),
    )
    expect(printingsFor(charizard).map((c) => c.printing)).toEqual([
      '1st Edition Holofoil',
      'Shadowless Holofoil',
      'Holofoil',
    ])
  })

  it('gives a graded card no siblings to switch between', () => {
    expect(printingsFor(graded)).toEqual([graded])
  })

  it('is symmetric — every member sees the same group', () => {
    const rawCards = CARDS.filter((c) => !isGraded(c))
    expect(
      rawCards.every((c) => {
        const group = printingsFor(c)
          .map((s) => s.shopifyProductId)
          .sort()
        return printingsFor(c).every(
          (s) =>
            JSON.stringify(
              printingsFor(s)
                .map((y) => y.shopifyProductId)
                .sort(),
            ) === JSON.stringify(group),
        )
      }),
    ).toBe(true)
  })

  it('prices a premium printing above the plain one', () => {
    const charizard = CARDS.find(
      (c) => c.name === 'Charizard' && c.printing === 'Holofoil' && !isGraded(c),
    )
    const firstEd = printingsFor(charizard).find((c) => c.printing === '1st Edition Holofoil')
    expect(priceFor(firstEd, 'buyPrice', 'NM')).toBeGreaterThan(
      priceFor(charizard, 'buyPrice', 'NM'),
    )
  })
})

describe('stock is per printing and condition', () => {
  it('sums across conditions when none is given', () => {
    const total = CONDITIONS.reduce((n, c) => n + stockFor(raw, c.code), 0)
    expect(stockFor(raw)).toBe(total)
  })

  it('is stable across calls rather than random per render', () => {
    expect(stockFor(raw, 'NM')).toBe(stockFor(raw, 'NM'))
  })

  it('respects the per-condition ceilings', () => {
    const rawCards = CARDS.filter((c) => !isGraded(c))
    expect(rawCards.every((c) => stockFor(c, 'NM') <= 4 && stockFor(c, 'DMG') <= 1)).toBe(true)
  })

  it('treats a graded slab as nought or one', () => {
    expect(CARDS.filter(isGraded).every((c) => stockFor(c) <= 1)).toBe(true)
  })
})

describe('price grid', () => {
  it('has a row per printing and a cell per condition', () => {
    const { conditions, rows } = priceGrid(raw)
    expect(conditions).toHaveLength(5)
    expect(rows).toHaveLength(printingsFor(raw).length)
    expect(rows.every((r) => r.cells.length === 5)).toBe(true)
  })

  it('matches stockFor in every cell', () => {
    const { rows } = priceGrid(raw)
    expect(rows.every((r) => r.cells.every((c) => c.stock === stockFor(r.card, c.condition)))).toBe(
      true,
    )
  })

  it('collapses a graded card to a single cell', () => {
    const { conditions, rows } = priceGrid(graded)
    expect(rows).toHaveLength(1)
    expect(conditions).toHaveLength(1)
    expect(rows[0].cells[0].condition).toBe('GRADED')
  })
})

describe('card images', () => {
  it('keys a raw card on its TCGPlayer product id', () => {
    expect(tcgProductIdFor(raw)).toBe(raw.tcgProductId)
  })

  it('lends a graded slab the scan of its matching raw printing', () => {
    const borrowed = tcgProductIdFor(graded)
    expect(borrowed).not.toBeNull()
    const source = CARDS.find((c) => c.tcgProductId === borrowed)
    expect(source).toMatchObject({
      name: graded.name,
      setId: graded.setId,
      collectorNumber: graded.collectorNumber,
      printing: graded.printing,
    })
  })

  it('falls back to a self-contained placeholder', () => {
    expect(placeholderFor(raw).startsWith('data:image/svg+xml,')).toBe(true)
    expect(placeholderFor(raw)).not.toContain('<')
  })
})
