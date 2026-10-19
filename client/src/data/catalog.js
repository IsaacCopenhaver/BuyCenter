// Dummy card catalog. Nothing here talks to the API yet.
//
// Shapes mirror the Sequelize models exactly (server/models/Card.js, CardSet,
// Game, Grading) so swapping this for a fetch is a change to `searchCards`
// and nothing else.
//
// One shape the model does NOT pin down: sellPrice, buyPrice, and marketPrice
// are bare JSONB columns. The assumption here is a map keyed by condition
// code, because a raw card's buy price genuinely differs by condition. A
// graded card has exactly one price, stored under the GRADED key. If the
// Shopify mirror ends up writing a different shape, `priceFor` below is the
// only place that has to change.

export const GAMES = [
  { id: 1, name: 'Pokémon' },
  { id: 2, name: 'Magic: The Gathering' },
]

export const SETS = [
  { id: 101, gameId: 1, name: 'Base Set' },
  { id: 102, gameId: 1, name: 'Jungle' },
  { id: 103, gameId: 1, name: 'Evolving Skies' },
  { id: 201, gameId: 2, name: 'Modern Horizons 3' },
  { id: 202, gameId: 2, name: 'The Brothers War' },
]

// server/models/Grading.js -- certNumber is the primary key, which is why
// Card.gradingId is a STRING while every other id here is an INTEGER.
export const GRADINGS = [
  { certNumber: 'PSA-74120055', grader: 'PSA', grade: 9 },
  { certNumber: 'PSA-74120061', grader: 'PSA', grade: 10 },
  { certNumber: 'BGS-0019244', grader: 'BGS', grade: 9.5 },
  { certNumber: 'CGC-5581902', grader: 'CGC', grade: 8.5 },
]

// Order matters: this is the order the condition picker lists them in, best
// first. GRADED is not a user-selectable condition -- it's the key a graded
// card's single price lives under.
export const CONDITIONS = [
  { code: 'NM', label: 'Near Mint' },
  { code: 'LP', label: 'Lightly Played' },
  { code: 'MP', label: 'Moderately Played' },
  { code: 'HP', label: 'Heavily Played' },
  { code: 'DMG', label: 'Damaged' },
]

export const GRADED = 'GRADED'

// A raw card carries tcgProductId and no gradingId; a graded one is the
// reverse. Card.js enforces exactly one of the two, so every row below picks
// a side -- `isGraded` is the whole distinction the UI cares about.
export const CARDS = [
  {
    shopifyProductId: 'gid://shopify/Product/8841001',
    setId: 101, name: 'Charizard', collectorNumber: '4/102', rarity: 'Holo Rare',
    tcgProductId: 42445, gradingId: null,
    buyPrice: { NM: 260, LP: 205, MP: 150, HP: 95, DMG: 48 },
    sellPrice: { NM: 430, LP: 345, MP: 255, HP: 165, DMG: 82 },
    marketPrice: { NM: 412, LP: 330, MP: 244, HP: 158, DMG: 79 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841002',
    setId: 101, name: 'Blastoise', collectorNumber: '2/102', rarity: 'Holo Rare',
    tcgProductId: 42446, gradingId: null,
    buyPrice: { NM: 88, LP: 70, MP: 52, HP: 33, DMG: 16 },
    sellPrice: { NM: 148, LP: 118, MP: 88, HP: 56, DMG: 28 },
    marketPrice: { NM: 141, LP: 113, MP: 84, HP: 54, DMG: 27 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841003',
    setId: 101, name: 'Venusaur', collectorNumber: '15/102', rarity: 'Holo Rare',
    tcgProductId: 42447, gradingId: null,
    buyPrice: { NM: 72, LP: 57, MP: 42, HP: 27, DMG: 13 },
    sellPrice: { NM: 120, LP: 96, MP: 71, HP: 46, DMG: 23 },
    marketPrice: { NM: 115, LP: 92, MP: 68, HP: 44, DMG: 22 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841004',
    setId: 101, name: 'Pikachu', collectorNumber: '58/102', rarity: 'Common',
    tcgProductId: 42448, gradingId: null,
    buyPrice: { NM: 9, LP: 7, MP: 5.25, HP: 3.4, DMG: 1.7 },
    sellPrice: { NM: 16, LP: 12.8, MP: 9.5, HP: 6.1, DMG: 3.05 },
    marketPrice: { NM: 15.2, LP: 12.15, MP: 9, HP: 5.8, DMG: 2.9 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841005',
    setId: 102, name: 'Flareon', collectorNumber: '3/64', rarity: 'Holo Rare',
    tcgProductId: 43101, gradingId: null,
    buyPrice: { NM: 34, LP: 27, MP: 20, HP: 13, DMG: 6.4 },
    sellPrice: { NM: 57, LP: 45.5, MP: 33.75, HP: 21.75, DMG: 10.85 },
    marketPrice: { NM: 54, LP: 43.2, MP: 32, HP: 20.6, DMG: 10.3 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841006',
    setId: 102, name: 'Snorlax', collectorNumber: '11/64', rarity: 'Holo Rare',
    tcgProductId: 43102, gradingId: null,
    buyPrice: { NM: 28, LP: 22, MP: 16.5, HP: 10.6, DMG: 5.3 },
    sellPrice: { NM: 47, LP: 37.5, MP: 27.8, HP: 17.9, DMG: 8.95 },
    marketPrice: { NM: 44.5, LP: 35.6, MP: 26.4, HP: 17, DMG: 8.5 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841007',
    setId: 103, name: 'Umbreon VMAX', collectorNumber: '215/203', rarity: 'Secret Rare',
    tcgProductId: 44810, gradingId: null,
    buyPrice: { NM: 310, LP: 248, MP: 183, HP: 118, DMG: 59 },
    sellPrice: { NM: 520, LP: 416, MP: 308, HP: 198, DMG: 99 },
    marketPrice: { NM: 495, LP: 396, MP: 293, HP: 189, DMG: 94 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841008',
    setId: 103, name: 'Rayquaza VMAX', collectorNumber: '218/203', rarity: 'Secret Rare',
    tcgProductId: 44811, gradingId: null,
    buyPrice: { NM: 96, LP: 77, MP: 57, HP: 36.5, DMG: 18.25 },
    sellPrice: { NM: 161, LP: 129, MP: 95.5, HP: 61.5, DMG: 30.75 },
    marketPrice: { NM: 153, LP: 122, MP: 90.5, HP: 58.5, DMG: 29.25 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841009',
    setId: 103, name: 'Sylveon V', collectorNumber: '074/203', rarity: 'Ultra Rare',
    tcgProductId: 44812, gradingId: null,
    buyPrice: { NM: 7.5, LP: 6, MP: 4.4, HP: 2.85, DMG: 1.4 },
    sellPrice: { NM: 12.6, LP: 10.1, MP: 7.45, HP: 4.8, DMG: 2.4 },
    marketPrice: { NM: 12, LP: 9.6, MP: 7.1, HP: 4.55, DMG: 2.3 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842001',
    setId: 201, name: 'Ajani, Nacatl Pariah', collectorNumber: '0188', rarity: 'Mythic Rare',
    tcgProductId: 51220, gradingId: null,
    buyPrice: { NM: 21, LP: 16.8, MP: 12.4, HP: 8, DMG: 4 },
    sellPrice: { NM: 35, LP: 28, MP: 20.75, HP: 13.4, DMG: 6.7 },
    marketPrice: { NM: 33.4, LP: 26.7, MP: 19.8, HP: 12.75, DMG: 6.4 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842002',
    setId: 201, name: 'Phlage, Titan of Fires Fury', collectorNumber: '0222', rarity: 'Mythic Rare',
    tcgProductId: 51221, gradingId: null,
    buyPrice: { NM: 29, LP: 23.2, MP: 17.1, HP: 11, DMG: 5.5 },
    sellPrice: { NM: 48.5, LP: 38.8, MP: 28.7, HP: 18.5, DMG: 9.25 },
    marketPrice: { NM: 46, LP: 36.8, MP: 27.2, HP: 17.5, DMG: 8.8 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842003',
    setId: 201, name: 'Flare of Denial', collectorNumber: '0059', rarity: 'Rare',
    tcgProductId: 51222, gradingId: null,
    buyPrice: { NM: 12, LP: 9.6, MP: 7.1, HP: 4.6, DMG: 2.3 },
    sellPrice: { NM: 20, LP: 16, MP: 11.85, HP: 7.65, DMG: 3.8 },
    marketPrice: { NM: 19, LP: 15.2, MP: 11.25, HP: 7.25, DMG: 3.6 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842004',
    setId: 202, name: 'Urza, Lord Protector', collectorNumber: '0225', rarity: 'Mythic Rare',
    tcgProductId: 50440, gradingId: null,
    buyPrice: { NM: 6.4, LP: 5.1, MP: 3.8, HP: 2.45, DMG: 1.2 },
    sellPrice: { NM: 10.7, LP: 8.55, MP: 6.3, HP: 4.1, DMG: 2.05 },
    marketPrice: { NM: 10.2, LP: 8.15, MP: 6.05, HP: 3.9, DMG: 1.95 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842005',
    setId: 202, name: 'Haywire Mite', collectorNumber: '0170', rarity: 'Uncommon',
    tcgProductId: 50441, gradingId: null,
    buyPrice: { NM: 3.1, LP: 2.45, MP: 1.8, HP: 1.15, DMG: 0.6 },
    sellPrice: { NM: 5.2, LP: 4.15, MP: 3.05, HP: 1.95, DMG: 1 },
    marketPrice: { NM: 4.95, LP: 3.95, MP: 2.9, HP: 1.9, DMG: 0.95 },
  },

  // --- graded: gradingId set, tcgProductId null ---
  {
    shopifyProductId: 'gid://shopify/Product/8843001',
    setId: 101, name: 'Charizard', collectorNumber: '4/102', rarity: 'Holo Rare',
    tcgProductId: null, gradingId: 'PSA-74120055',
    buyPrice: { GRADED: 3400 }, sellPrice: { GRADED: 5600 }, marketPrice: { GRADED: 5300 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8843002',
    setId: 101, name: 'Blastoise', collectorNumber: '2/102', rarity: 'Holo Rare',
    tcgProductId: null, gradingId: 'PSA-74120061',
    buyPrice: { GRADED: 2150 }, sellPrice: { GRADED: 3550 }, marketPrice: { GRADED: 3380 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8843003',
    setId: 103, name: 'Umbreon VMAX', collectorNumber: '215/203', rarity: 'Secret Rare',
    tcgProductId: null, gradingId: 'BGS-0019244',
    buyPrice: { GRADED: 780 }, sellPrice: { GRADED: 1290 }, marketPrice: { GRADED: 1225 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8843004',
    setId: 201, name: 'Ajani, Nacatl Pariah', collectorNumber: '0188', rarity: 'Mythic Rare',
    tcgProductId: null, gradingId: 'CGC-5581902',
    buyPrice: { GRADED: 64 }, sellPrice: { GRADED: 106 }, marketPrice: { GRADED: 101 },
  },
]

const setsById = new Map(SETS.map((s) => [s.id, s]))
const gamesById = new Map(GAMES.map((g) => [g.id, g]))
const gradingsById = new Map(GRADINGS.map((g) => [g.certNumber, g]))
const cardsById = new Map(CARDS.map((c) => [c.shopifyProductId, c]))

export function isGraded(card) {
  return card.gradingId != null
}

export function cardById(id) {
  return cardsById.get(id) ?? null
}

export function setFor(card) {
  return setsById.get(card.setId) ?? null
}

export function gameFor(card) {
  const set = setFor(card)
  return set ? gamesById.get(set.gameId) ?? null : null
}

export function gradingFor(card) {
  return card.gradingId ? gradingsById.get(card.gradingId) ?? null : null
}

// The condition a card is priced at by default: graded cards have exactly one
// price and no condition to choose.
export function defaultCondition(card) {
  return isGraded(card) ? GRADED : 'NM'
}

// Single accessor for every price lookup, so the JSONB shape assumption lives
// in one place. Returns null rather than 0 when a price is missing -- a card
// we have no buy price for is not a card we will pay nothing for.
export function priceFor(card, kind, condition) {
  const prices = card[kind]
  if (!prices) return null
  const value = prices[condition ?? defaultCondition(card)]
  return typeof value === 'number' ? value : null
}

export function conditionLabel(code) {
  if (code === GRADED) return 'Graded'
  return CONDITIONS.find((c) => c.code === code)?.label ?? code
}

export function money(n) {
  if (n == null) return '—'
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

// How a graded card is described in one line: "PSA 10", "BGS 9.5".
export function gradeLabel(card) {
  const grading = gradingFor(card)
  if (!grading) return null
  return `${grading.grader} ${grading.grade}`
}

/**
 * Stand-in for GET /api/cards?q=...
 *
 * Matches name, collector number, rarity, set name, and cert number, because
 * a buyer at the counter is as likely to read a cert off a slab as to type a
 * name. Returns [] for an empty query rather than the whole catalog -- the
 * real endpoint is paginated and an unfiltered dump is not a useful default.
 */
export function searchCards(query, { gameId = '', setId = '', type = '' } = {}) {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return CARDS.filter((card) => {
    if (type === 'graded' && !isGraded(card)) return false
    if (type === 'raw' && isGraded(card)) return false

    const set = setFor(card)
    if (setId && card.setId !== Number(setId)) return false
    if (gameId && set?.gameId !== Number(gameId)) return false

    const haystack = [card.name, card.collectorNumber, card.rarity, set?.name, card.gradingId]
    return haystack.some((field) => field && String(field).toLowerCase().includes(q))
  })
}
