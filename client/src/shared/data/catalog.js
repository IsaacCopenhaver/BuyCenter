// Dummy card catalog. Nothing here talks to the API yet.
//
// Shapes mirror the Sequelize models exactly (server/models/Card.js, CardSet,
// Game, Grading) so swapping this for a fetch is a change to `searchCards`
// and nothing else.
//
// Two shapes the models do NOT pin down:
//
//  1. sellPrice, buyPrice, and marketPrice are bare JSONB columns. The
//     assumption here is a map keyed by condition code, because a raw card's
//     buy price genuinely differs by condition. A graded card has exactly one
//     price, stored under the GRADED key. `priceFor` is the only place that
//     assumption lives.
//
//  2. `printing` has no column on Card at all yet. See PRINTINGS below.

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

// Printing vocabulary per game, listed best-to-worst within a game so a
// printing picker reads in a predictable order.
export const PRINTINGS = {
  1: [
    '1st Edition Holofoil',
    'Shadowless Holofoil',
    'Holofoil',
    'Reverse Holofoil',
    '1st Edition',
    'Normal',
  ],
  2: ['Etched Foil', 'Foil', 'Normal'],
}

// A raw card carries tcgProductId and no gradingId; a graded one is the
// reverse. Card.js enforces exactly one of the two, so every row below picks
// a side -- `isGraded` is the whole distinction the UI cares about.
//
// A printing is its own row, not a field on a shared row: TCGPlayer issues a
// separate tcgProductId per printing, and a 1st Edition Charizard is a
// different product at a wildly different price from an Unlimited one. So
// "change the printing" means pointing the cart line at a sibling card --
// see `printingsFor`.
export const CARDS = [
  // --- Base Set, Pokémon ---
  {
    shopifyProductId: 'gid://shopify/Product/8841001',
    setId: 101,
    name: 'Charizard',
    collectorNumber: '4/102',
    rarity: 'Holo Rare',
    printing: 'Holofoil',
    tcgProductId: 42445,
    gradingId: null,
    buyPrice: { NM: 260, LP: 205, MP: 150, HP: 95, DMG: 48 },
    sellPrice: { NM: 430, LP: 345, MP: 255, HP: 165, DMG: 82 },
    marketPrice: { NM: 412, LP: 330, MP: 244, HP: 158, DMG: 79 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841011',
    setId: 101,
    name: 'Charizard',
    collectorNumber: '4/102',
    rarity: 'Holo Rare',
    printing: '1st Edition Holofoil',
    tcgProductId: 42449,
    gradingId: null,
    buyPrice: { NM: 4800, LP: 3840, MP: 2840, HP: 1830, DMG: 915 },
    sellPrice: { NM: 8000, LP: 6400, MP: 4740, HP: 3050, DMG: 1525 },
    marketPrice: { NM: 7600, LP: 6080, MP: 4500, HP: 2900, DMG: 1450 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841012',
    setId: 101,
    name: 'Charizard',
    collectorNumber: '4/102',
    rarity: 'Holo Rare',
    printing: 'Shadowless Holofoil',
    tcgProductId: 42450,
    gradingId: null,
    buyPrice: { NM: 900, LP: 720, MP: 532, HP: 343, DMG: 171 },
    sellPrice: { NM: 1500, LP: 1200, MP: 888, HP: 572, DMG: 286 },
    marketPrice: { NM: 1425, LP: 1140, MP: 844, HP: 544, DMG: 272 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841002',
    setId: 101,
    name: 'Blastoise',
    collectorNumber: '2/102',
    rarity: 'Holo Rare',
    printing: 'Holofoil',
    tcgProductId: 42446,
    gradingId: null,
    buyPrice: { NM: 88, LP: 70, MP: 52, HP: 33, DMG: 16 },
    sellPrice: { NM: 148, LP: 118, MP: 88, HP: 56, DMG: 28 },
    marketPrice: { NM: 141, LP: 113, MP: 84, HP: 54, DMG: 27 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841013',
    setId: 101,
    name: 'Blastoise',
    collectorNumber: '2/102',
    rarity: 'Holo Rare',
    printing: '1st Edition Holofoil',
    tcgProductId: 42451,
    gradingId: null,
    buyPrice: { NM: 1500, LP: 1200, MP: 888, HP: 572, DMG: 286 },
    sellPrice: { NM: 2500, LP: 2000, MP: 1480, HP: 953, DMG: 477 },
    marketPrice: { NM: 2375, LP: 1900, MP: 1406, HP: 906, DMG: 453 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841003',
    setId: 101,
    name: 'Venusaur',
    collectorNumber: '15/102',
    rarity: 'Holo Rare',
    printing: 'Holofoil',
    tcgProductId: 42447,
    gradingId: null,
    buyPrice: { NM: 72, LP: 57, MP: 42, HP: 27, DMG: 13 },
    sellPrice: { NM: 120, LP: 96, MP: 71, HP: 46, DMG: 23 },
    marketPrice: { NM: 115, LP: 92, MP: 68, HP: 44, DMG: 22 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841004',
    setId: 101,
    name: 'Pikachu',
    collectorNumber: '58/102',
    rarity: 'Common',
    printing: 'Normal',
    tcgProductId: 42448,
    gradingId: null,
    buyPrice: { NM: 9, LP: 7, MP: 5.25, HP: 3.4, DMG: 1.7 },
    sellPrice: { NM: 16, LP: 12.8, MP: 9.5, HP: 6.1, DMG: 3.05 },
    marketPrice: { NM: 15.2, LP: 12.15, MP: 9, HP: 5.8, DMG: 2.9 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841014',
    setId: 101,
    name: 'Pikachu',
    collectorNumber: '58/102',
    rarity: 'Common',
    printing: '1st Edition',
    tcgProductId: 42452,
    gradingId: null,
    buyPrice: { NM: 48, LP: 38.4, MP: 28.4, HP: 18.3, DMG: 9.15 },
    sellPrice: { NM: 80, LP: 64, MP: 47.4, HP: 30.5, DMG: 15.25 },
    marketPrice: { NM: 76, LP: 60.8, MP: 45, HP: 29, DMG: 14.5 },
  },

  // --- Jungle, Pokémon ---
  {
    shopifyProductId: 'gid://shopify/Product/8841005',
    setId: 102,
    name: 'Flareon',
    collectorNumber: '3/64',
    rarity: 'Holo Rare',
    printing: 'Holofoil',
    tcgProductId: 43101,
    gradingId: null,
    buyPrice: { NM: 34, LP: 27, MP: 20, HP: 13, DMG: 6.4 },
    sellPrice: { NM: 57, LP: 45.5, MP: 33.75, HP: 21.75, DMG: 10.85 },
    marketPrice: { NM: 54, LP: 43.2, MP: 32, HP: 20.6, DMG: 10.3 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841006',
    setId: 102,
    name: 'Snorlax',
    collectorNumber: '11/64',
    rarity: 'Holo Rare',
    printing: 'Holofoil',
    tcgProductId: 43102,
    gradingId: null,
    buyPrice: { NM: 28, LP: 22, MP: 16.5, HP: 10.6, DMG: 5.3 },
    sellPrice: { NM: 47, LP: 37.5, MP: 27.8, HP: 17.9, DMG: 8.95 },
    marketPrice: { NM: 44.5, LP: 35.6, MP: 26.4, HP: 17, DMG: 8.5 },
  },

  // --- Evolving Skies, Pokémon ---
  {
    shopifyProductId: 'gid://shopify/Product/8841007',
    setId: 103,
    name: 'Umbreon VMAX',
    collectorNumber: '215/203',
    rarity: 'Secret Rare',
    printing: 'Normal',
    tcgProductId: 44810,
    gradingId: null,
    buyPrice: { NM: 310, LP: 248, MP: 183, HP: 118, DMG: 59 },
    sellPrice: { NM: 520, LP: 416, MP: 308, HP: 198, DMG: 99 },
    marketPrice: { NM: 495, LP: 396, MP: 293, HP: 189, DMG: 94 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841008',
    setId: 103,
    name: 'Rayquaza VMAX',
    collectorNumber: '218/203',
    rarity: 'Secret Rare',
    printing: 'Normal',
    tcgProductId: 44811,
    gradingId: null,
    buyPrice: { NM: 96, LP: 77, MP: 57, HP: 36.5, DMG: 18.25 },
    sellPrice: { NM: 161, LP: 129, MP: 95.5, HP: 61.5, DMG: 30.75 },
    marketPrice: { NM: 153, LP: 122, MP: 90.5, HP: 58.5, DMG: 29.25 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841009',
    setId: 103,
    name: 'Sylveon V',
    collectorNumber: '074/203',
    rarity: 'Ultra Rare',
    printing: 'Normal',
    tcgProductId: 44812,
    gradingId: null,
    buyPrice: { NM: 7.5, LP: 6, MP: 4.4, HP: 2.85, DMG: 1.4 },
    sellPrice: { NM: 12.6, LP: 10.1, MP: 7.45, HP: 4.8, DMG: 2.4 },
    marketPrice: { NM: 12, LP: 9.6, MP: 7.1, HP: 4.55, DMG: 2.3 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8841015',
    setId: 103,
    name: 'Sylveon V',
    collectorNumber: '074/203',
    rarity: 'Ultra Rare',
    printing: 'Reverse Holofoil',
    tcgProductId: 44813,
    gradingId: null,
    buyPrice: { NM: 11, LP: 8.8, MP: 6.5, HP: 4.2, DMG: 2.1 },
    sellPrice: { NM: 18.4, LP: 14.7, MP: 10.9, HP: 7, DMG: 3.5 },
    marketPrice: { NM: 17.5, LP: 14, MP: 10.35, HP: 6.65, DMG: 3.35 },
  },

  // --- Modern Horizons 3, Magic ---
  {
    shopifyProductId: 'gid://shopify/Product/8842001',
    setId: 201,
    name: 'Ajani, Nacatl Pariah',
    collectorNumber: '0188',
    rarity: 'Mythic Rare',
    printing: 'Normal',
    tcgProductId: 51220,
    gradingId: null,
    buyPrice: { NM: 21, LP: 16.8, MP: 12.4, HP: 8, DMG: 4 },
    sellPrice: { NM: 35, LP: 28, MP: 20.75, HP: 13.4, DMG: 6.7 },
    marketPrice: { NM: 33.4, LP: 26.7, MP: 19.8, HP: 12.75, DMG: 6.4 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842011',
    setId: 201,
    name: 'Ajani, Nacatl Pariah',
    collectorNumber: '0188',
    rarity: 'Mythic Rare',
    printing: 'Foil',
    tcgProductId: 51223,
    gradingId: null,
    buyPrice: { NM: 29, LP: 23.2, MP: 17.2, HP: 11.1, DMG: 5.5 },
    sellPrice: { NM: 48.4, LP: 38.7, MP: 28.7, HP: 18.5, DMG: 9.2 },
    marketPrice: { NM: 46, LP: 36.8, MP: 27.25, HP: 17.55, DMG: 8.75 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842002',
    setId: 201,
    name: 'Phlage, Titan of Fires Fury',
    collectorNumber: '0222',
    rarity: 'Mythic Rare',
    printing: 'Normal',
    tcgProductId: 51221,
    gradingId: null,
    buyPrice: { NM: 29, LP: 23.2, MP: 17.1, HP: 11, DMG: 5.5 },
    sellPrice: { NM: 48.5, LP: 38.8, MP: 28.7, HP: 18.5, DMG: 9.25 },
    marketPrice: { NM: 46, LP: 36.8, MP: 27.2, HP: 17.5, DMG: 8.8 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842012',
    setId: 201,
    name: 'Phlage, Titan of Fires Fury',
    collectorNumber: '0222',
    rarity: 'Mythic Rare',
    printing: 'Etched Foil',
    tcgProductId: 51224,
    gradingId: null,
    buyPrice: { NM: 44, LP: 35.2, MP: 26, HP: 16.8, DMG: 8.4 },
    sellPrice: { NM: 73.5, LP: 58.8, MP: 43.5, HP: 28, DMG: 14 },
    marketPrice: { NM: 70, LP: 56, MP: 41.4, HP: 26.6, DMG: 13.3 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842003',
    setId: 201,
    name: 'Flare of Denial',
    collectorNumber: '0059',
    rarity: 'Rare',
    printing: 'Normal',
    tcgProductId: 51222,
    gradingId: null,
    buyPrice: { NM: 12, LP: 9.6, MP: 7.1, HP: 4.6, DMG: 2.3 },
    sellPrice: { NM: 20, LP: 16, MP: 11.85, HP: 7.65, DMG: 3.8 },
    marketPrice: { NM: 19, LP: 15.2, MP: 11.25, HP: 7.25, DMG: 3.6 },
  },

  // --- The Brothers War, Magic ---
  {
    shopifyProductId: 'gid://shopify/Product/8842004',
    setId: 202,
    name: 'Urza, Lord Protector',
    collectorNumber: '0225',
    rarity: 'Mythic Rare',
    printing: 'Normal',
    tcgProductId: 50440,
    gradingId: null,
    buyPrice: { NM: 6.4, LP: 5.1, MP: 3.8, HP: 2.45, DMG: 1.2 },
    sellPrice: { NM: 10.7, LP: 8.55, MP: 6.3, HP: 4.1, DMG: 2.05 },
    marketPrice: { NM: 10.2, LP: 8.15, MP: 6.05, HP: 3.9, DMG: 1.95 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842013',
    setId: 202,
    name: 'Urza, Lord Protector',
    collectorNumber: '0225',
    rarity: 'Mythic Rare',
    printing: 'Foil',
    tcgProductId: 50442,
    gradingId: null,
    buyPrice: { NM: 9.8, LP: 7.85, MP: 5.8, HP: 3.75, DMG: 1.85 },
    sellPrice: { NM: 16.4, LP: 13.1, MP: 9.7, HP: 6.25, DMG: 3.1 },
    marketPrice: { NM: 15.6, LP: 12.5, MP: 9.25, HP: 5.95, DMG: 2.95 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8842005',
    setId: 202,
    name: 'Haywire Mite',
    collectorNumber: '0170',
    rarity: 'Uncommon',
    printing: 'Normal',
    tcgProductId: 50441,
    gradingId: null,
    buyPrice: { NM: 3.1, LP: 2.45, MP: 1.8, HP: 1.15, DMG: 0.6 },
    sellPrice: { NM: 5.2, LP: 4.15, MP: 3.05, HP: 1.95, DMG: 1 },
    marketPrice: { NM: 4.95, LP: 3.95, MP: 2.9, HP: 1.9, DMG: 0.95 },
  },

  // --- graded: gradingId set, tcgProductId null ---
  // The slab fixes the printing along with everything else, so these have no
  // siblings to switch between.
  {
    shopifyProductId: 'gid://shopify/Product/8843001',
    setId: 101,
    name: 'Charizard',
    collectorNumber: '4/102',
    rarity: 'Holo Rare',
    printing: 'Holofoil',
    tcgProductId: null,
    gradingId: 'PSA-74120055',
    buyPrice: { GRADED: 3400 },
    sellPrice: { GRADED: 5600 },
    marketPrice: { GRADED: 5300 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8843002',
    setId: 101,
    name: 'Blastoise',
    collectorNumber: '2/102',
    rarity: 'Holo Rare',
    printing: 'Holofoil',
    tcgProductId: null,
    gradingId: 'PSA-74120061',
    buyPrice: { GRADED: 2150 },
    sellPrice: { GRADED: 3550 },
    marketPrice: { GRADED: 3380 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8843003',
    setId: 103,
    name: 'Umbreon VMAX',
    collectorNumber: '215/203',
    rarity: 'Secret Rare',
    printing: 'Normal',
    tcgProductId: null,
    gradingId: 'BGS-0019244',
    buyPrice: { GRADED: 780 },
    sellPrice: { GRADED: 1290 },
    marketPrice: { GRADED: 1225 },
  },
  {
    shopifyProductId: 'gid://shopify/Product/8843004',
    setId: 201,
    name: 'Ajani, Nacatl Pariah',
    collectorNumber: '0188',
    rarity: 'Mythic Rare',
    printing: 'Foil',
    tcgProductId: null,
    gradingId: 'CGC-5581902',
    buyPrice: { GRADED: 64 },
    sellPrice: { GRADED: 106 },
    marketPrice: { GRADED: 101 },
  },
]

const setsById = new Map(SETS.map((s) => [s.id, s]))
const gamesById = new Map(GAMES.map((g) => [g.id, g]))
const gradingsById = new Map(GRADINGS.map((g) => [g.certNumber, g]))
const cardsById = new Map(CARDS.map((c) => [c.shopifyProductId, c]))

// A graded card has no tcgProductId of its own: Card.js makes it carry a
// gradingId instead. The card inside the slab is still an ordinary TCGPlayer
// product though, so its scan is the raw row with the same identity and
// printing. Declared up here with the other indexes because the loop that
// fills it runs further down the file.
const rawProductIds = new Map()

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
  return set ? (gamesById.get(set.gameId) ?? null) : null
}

export function gradingFor(card) {
  return card.gradingId ? (gradingsById.get(card.gradingId) ?? null) : null
}

// What makes two rows the same physical card in different printings: same
// card, same set, same number. Rarity is not part of it -- it follows from
// the card, and including it would split siblings on a data-entry typo.
function identityOf(card) {
  return `${card.setId}|${card.name}|${card.collectorNumber}`
}

// Every raw printing of the same card, in PRINTINGS order for its game.
//
// Graded cards return just themselves: a slab is one specific printing of one
// specific copy, so there is nothing to switch to.
const siblings = new Map()
for (const card of CARDS) {
  if (isGraded(card)) continue
  const key = identityOf(card)
  if (!siblings.has(key)) siblings.set(key, [])
  siblings.get(key).push(card)
}
for (const [key, group] of siblings) {
  const order = PRINTINGS[gameFor(group[0])?.id] ?? []
  siblings.set(
    key,
    [...group].sort((a, b) => order.indexOf(a.printing) - order.indexOf(b.printing)),
  )
}

export function printingsFor(card) {
  if (!card || isGraded(card)) return card ? [card] : []
  return siblings.get(identityOf(card)) ?? [card]
}

// Built once so a graded card can borrow the scan of the raw printing it is
// a slabbed copy of.
for (const card of CARDS) {
  if (card.tcgProductId != null) {
    rawProductIds.set(`${identityOf(card)}|${card.printing}`, card.tcgProductId)
  }
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

// --- stand-ins for data the catalog mirror will carry but the model doesn't ---

const GAME_TINT = { 1: '#c9792b', 2: '#3f6bbf' }

// Scans are keyed on the TCGPlayer product id, which Card already carries.
// No image column is needed -- the id is the image.
const TCG_IMAGE = (productId) =>
  `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg`

/**
 * The TCGPlayer product id whose scan represents this card, or null when
 * nothing in the catalog can supply one.
 */
export function tcgProductIdFor(card) {
  if (card.tcgProductId != null) return card.tcgProductId
  return rawProductIds.get(`${identityOf(card)}|${card.printing}`) ?? null
}

/**
 * Real card art from the TCGPlayer CDN, falling back to a generated
 * placeholder when there is no product id to key it on.
 *
 * Callers should still handle a load failure -- `placeholderFor` is exported
 * for exactly that. The fixture product ids in this file are invented, so
 * most of them will 404 until the catalog mirror supplies real ones.
 */
export function imageFor(card) {
  const productId = tcgProductIdFor(card)
  return productId == null ? placeholderFor(card) : TCG_IMAGE(productId)
}

/**
 * Generated stand-in art, as an inline SVG data URI.
 *
 * Used when a card has no product id, and as the fallback when a real scan
 * fails to load. Being a data URI it never 404s itself, so the fallback can
 * never fail in turn.
 */
export function placeholderFor(card) {
  const tint = GAME_TINT[gameFor(card)?.id] ?? '#777'
  const initial = (card.name[0] ?? '?').toUpperCase()
  const set = setFor(card)?.name ?? ''
  // Big initial so a 40px thumbnail is still distinguishable; the text below
  // only resolves at preview size, which is the point of the preview.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 336" role="img">
<rect width="240" height="336" rx="14" fill="${tint}"/>
<rect x="10" y="10" width="220" height="316" rx="9" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
<rect x="22" y="54" width="196" height="150" rx="6" fill="rgba(0,0,0,.18)"/>
<text x="120" y="155" font-family="system-ui,sans-serif" font-size="92" font-weight="700" fill="rgba(255,255,255,.85)" text-anchor="middle">${initial}</text>
<text x="120" y="240" font-family="system-ui,sans-serif" font-size="15" font-weight="600" fill="#fff" text-anchor="middle">${escapeXml(trim(card.name, 22))}</text>
<text x="120" y="263" font-family="system-ui,sans-serif" font-size="12" fill="rgba(255,255,255,.8)" text-anchor="middle">${escapeXml(trim(set, 26))}</text>
<text x="120" y="286" font-family="system-ui,sans-serif" font-size="12" fill="rgba(255,255,255,.8)" text-anchor="middle">${escapeXml(trim(card.printing, 26))}</text>
<text x="120" y="310" font-family="system-ui,sans-serif" font-size="11" fill="rgba(255,255,255,.65)" text-anchor="middle">${escapeXml(card.collectorNumber ?? '')}</text>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function trim(text, max) {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function escapeXml(text) {
  return String(text).replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[ch])
}

function hashOf(text) {
  let hash = 0
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash
}

// Rough ceiling on how many of a condition a shop keeps. Near Mint moves and
// restocks; nobody holds a deep shelf of Damaged.
const STOCK_CEILING = { NM: 4, LP: 3, MP: 2, HP: 1, DMG: 1 }

/**
 * On-hand count for one printing at one condition -- which is the grain
 * inventory actually has, since a NM copy and a HP copy of the same card are
 * different things on the shelf.
 *
 * Omit `condition` for the card's total across every condition.
 *
 * Dummy and deterministic: derived from the product id and condition so it
 * is stable across renders rather than flickering on every keystroke. There
 * is no stock column anywhere yet -- real counts belong to Shopify
 * inventory, which the mirror would carry alongside the price.
 */
export function stockFor(card, condition) {
  // A graded slab is a single copy with one condition: you have it or don't.
  if (isGraded(card)) return hashOf(card.shopifyProductId) % 2

  if (condition == null || condition === GRADED) {
    return CONDITIONS.reduce((total, c) => total + stockFor(card, c.code), 0)
  }

  const ceiling = STOCK_CEILING[condition] ?? 1
  return hashOf(`${card.shopifyProductId}|${condition}`) % (ceiling + 1)
}

/**
 * Buy prices as printings down, conditions across -- the grid a buyer scans
 * to find the row and column the card in their hand actually sits in.
 *
 * Graded cards collapse to one cell, because the slab fixes both axes.
 */
export function priceGrid(card) {
  const conditions = isGraded(card) ? [{ code: GRADED, label: conditionLabel(GRADED) }] : CONDITIONS

  return {
    conditions,
    rows: printingsFor(card).map((printing) => ({
      card: printing,
      cells: conditions.map((c) => ({
        condition: c.code,
        price: priceFor(printing, 'buyPrice', c.code),
        stock: stockFor(printing, c.code),
      })),
    })),
  }
}

/**
 * Stand-in for GET /api/cards?q=...
 *
 * Matches name, collector number, rarity, set name, printing, and cert
 * number, because a buyer at the counter is as likely to read a cert off a
 * slab as to type a name. Returns [] for an empty query rather than the whole
 * catalog -- the real endpoint is paginated and an unfiltered dump is not a
 * useful default.
 */
/**
 * Search, collapsed to one result per card.
 *
 * `searchCards` returns catalog rows, and every printing is its own row --
 * so a search for "charizard" comes back with three near-identical lines
 * differing only in one word. That is faithful to the data and poor to read.
 * This groups those rows into a single result carrying all of its printings,
 * for a UI that offers printing as a picker rather than as duplicate rows.
 *
 * Graded cards never group: a slab is one physical copy with its own cert
 * number, so two of them are genuinely two results.
 *
 * Each group carries every printing of the card, not only the ones that
 * matched, since the picker should offer all of them -- but `matched` is the
 * printing the query actually hit, so searching "shadowless" opens on the
 * Shadowless printing rather than on the default.
 */
export function searchResults(query, options = {}) {
  const groups = new Map()

  for (const card of searchCards(query, options)) {
    const key = isGraded(card) ? card.shopifyProductId : identityOf(card)
    if (groups.has(key)) continue
    groups.set(key, {
      key,
      matched: card,
      printings: isGraded(card) ? [card] : printingsFor(card),
    })
  }

  return [...groups.values()]
}

export function searchCards(query, { gameId = '', setId = '', type = '' } = {}) {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return CARDS.filter((card) => {
    if (type === 'graded' && !isGraded(card)) return false
    if (type === 'raw' && isGraded(card)) return false

    const set = setFor(card)
    if (setId && card.setId !== Number(setId)) return false
    if (gameId && set?.gameId !== Number(gameId)) return false

    const haystack = [
      card.name,
      card.collectorNumber,
      card.rarity,
      card.printing,
      set?.name,
      card.gradingId,
    ]
    return haystack.some((field) => field && String(field).toLowerCase().includes(q))
  })
}
