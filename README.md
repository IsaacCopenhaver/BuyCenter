# Buy Center

Counter tool for buying trading cards from customers. Vite + React client,
Express API, one repo, one Postgres database.

```
BuyCenter/
├── package.json      # scripts that run both sides
├── .env              # DATABASE_URL + SESSION_SECRET -- not committed
├── client/
│   ├── vite.config.js      # /api proxy, '@' alias, vitest config
│   ├── index.html
│   ├── assets/source/      # the original logo + icon art (NOT served)
│   ├── public/brand/       # generated, committed -- see "Branding"
│   ├── scripts/
│   │   └── generate-assets.mjs
│   └── src/
│       ├── app/App.jsx     # every route lives here
│       ├── features/       # grouped by domain, styles co-located
│       │   ├── auth/       AuthContext, ProtectedRoute, Login
│       │   ├── dashboard/  Dashboard, BuysByDayChart, CardsBoughtBoard
│       │   ├── search/     SearchPage, CardSearch, ResultRow, PriceGrid
│       │   └── carts/      CartsPage, NewCartPage, CartPage, CartLine
│       ├── shared/
│       │   ├── ui/         AppBar, CardImage, NumberField, Panel, Badge
│       │   └── data/       catalog.js, store.jsx  -- see "Dummy data"
│       ├── styles/         tokens, base, layout, utilities
│       └── test/           vitest suites + render helpers
└── server/
    ├── index.js              # app setup, mounts /api, serves client/dist in prod
    ├── routes/
    │   ├── index.js          # API barrel -- mount each resource router here
    │   ├── auth.js           # /api/auth/{login,me,logout}
    │   └── cards.js          # /api/cards
    ├── controllers/          # request handlers + data access
    │   ├── authController.js
    │   └── cardController.js
    ├── middleware/
    │   └── requireAuth.js    # 401s anything without a session
    ├── config/passport.js    # local strategy, serialize/deserialize
    ├── models/               # Sequelize models + their associations
    └── db/
        ├── database.js       # the one shared Sequelize instance
        └── env.js            # loads .env by absolute path
```

## Run it

```bash
npm run setup     # installs root, client, and server deps
npm run dev
```

Client on http://localhost:5173, API on http://localhost:3000.

Tests and formatting:

```bash
npm test                        # vitest, once
npm run test:watch
npm --prefix client run format   # prettier
```

For a production-shaped run, `npm run build` then `npm start`: the build writes
`client/dist`, and `server/index.js` serves it automatically if that folder
exists, so the whole app is one Node process on one port.

## Environment

`.env` goes in the **repo root** and is required before the server will boot:

```
DATABASE_URL=postgres://user:pass@host:5432/dbname
SESSION_SECRET=<openssl rand -hex 32>
```

`PORT` is optional and defaults to 3000.

The two required vars fail differently. The server calls
`sequelize.authenticate()` at startup, so a missing or wrong `DATABASE_URL`
kills the boot outright. A missing `SESSION_SECRET` is quieter and worse: the
app starts fine, then errors on every request that touches the session.

`server/db/env.js` resolves `.env` from its own location rather than from the
current directory, so the server finds it whatever folder `node` is started
from. That also means **the file has to stay at the repo root** -- moving it
means editing that path. `server/index.js` imports `env.js` as its very first
import for the same reason: ES module imports are hoisted and evaluated before
any top-level statement, so a `dotenv.config()` call in the body of `index.js`
would run *after* `database.js` had already read `process.env` and come up
empty.

## Database

One Postgres database, reached through a single Sequelize instance in
`server/db/database.js`. Models live in `server/models/`, and
`models/index.js` declares every association.

**The connection requires SSL** (`dialectOptions.ssl`), which suits a hosted
Postgres like DigitalOcean Managed Databases but will fail against a stock
local Postgres, since that ships with SSL off. Point `DATABASE_URL` at a hosted
database, or make that option conditional.

There are no migrations. `server/index.js` runs `sequelize.sync({ alter: true })`
on every boot, so the schema follows the models automatically in development.
See the gaps below before running that against anything you care about.

### The shape of a buy

```
Customer ──< Cart ──< CartItem >── Card >── CardSet >── Game
               │                     │
               │                     └── Grading   (graded cards only)
               ├──< cart_buyers >── User           (staff credited with the buy)
               └──1 BuyTransaction                 (written at checkout)
```

A **Customer** brings cards to the counter. A **Cart** is opened against that
customer and carries a `status` -- `in_progress` until it is checked out,
`completed` after. Each **CartItem** is one card at one condition, with a
`quantity` and the `offerPrice` actually agreed.

Two details that shape the UI more than they look like they should:

- **A cart has many buyers.** `User.belongsToMany(Cart)` through `cart_buyers`,
  so more than one staff member can work a single buy and all of them are
  credited. Buyer assignment is a checkbox list, never a dropdown.
- **A card is raw or graded, never both.** `Card` validates that exactly one of
  `tcgProductId` and `gradingId` is set. Raw cards have a condition and can
  stack; a graded card is one slab with one cert number, so its quantity is
  always 1 and its "condition" is its grade.

Checkout writes a **BuyTransaction** against the cart -- one per cart, enforced
by a unique `cartId` -- recording `totalPrice`, `paymentType` (`cash`, `check`,
or `store_credit`), and the `completedById` user.

## API

Everything is mounted under `/api`.

| Route | Auth | Notes |
| --- | --- | --- |
| `POST /api/auth/login` | public | email + password, sets the session cookie |
| `GET /api/auth/me` | session | 401 is the normal "not signed in" answer |
| `POST /api/auth/logout` | public | idempotent on purpose |
| `GET /api/cards` | session | paginated: `?page=1&limit=10`, max limit 100 |

Carts, customers, and transactions have models but no endpoints yet -- the
client side of those is still running on dummy data.

## Client

### How the front end is organised

Grouped by feature, not by file type. Everything one part of the app needs
sits together — the page, the components it renders, and their stylesheets:

```
features/carts/
  CartPage.jsx      CartPage orchestrates
  CartLine.jsx      one line renders itself
  CartLine.css      its styles, next to it
  PaymentSplit.css
```

Imports follow one rule: **relative means "my own feature", `@/` means
"somewhere else"**. `@` is aliased to `src/` in `vite.config.js`, so moving a
file does not mean recounting `../../..` chains, and a relative import is a
visible signal that you have not crossed a boundary.

Styling is plain CSS co-located with each component. The global layer is four
files, imported in cascade order by `styles/index.css`:

| File | Holds |
| --- | --- |
| `tokens.css` | every colour, space, radius, type size and duration |
| `base.css` | unclassed elements, form controls, focus, reduced-motion |
| `layout.css` | the page column and its width modifiers |
| `utilities.css` | small classes several features share |

**No component stylesheet hard-codes a value** — they resolve to tokens. That
is `SKILL.md`'s css-first rule ("design tokens only, no arbitrary values")
applied through custom properties, since there is no Tailwind here.

### Branding

Layton Gaming. The brand colour is **`#204199`**, measured from the source
art, where it is 99.8% of all chromatic pixels.

The app bar is that colour in both themes, with the logo on a light chip. The
chip is deliberate: the artwork is blue line-art on a pale field, so placed
directly on the bar its frame and outlines would vanish into the background
and leave the letterforms floating.

`#204199` clears 9.2:1 against white but only 2.1:1 against the dark surface,
so the **interactive accent** moves up the ramp to `--brand-400` in dark mode
while the bar keeps the true brand colour. Charts keep a separate teal series
colour — if the chrome and the data share a hue, bars read as decoration
rather than as values.

Brand assets are generated, never hand-cut:

```bash
npm run assets   # from client/
```

The originals are 20834x20834 (434 megapixels, ~3MB each) and live in
`client/assets/source/`, deliberately **outside** `public/` — anything in
there is copied verbatim into the build, and a browser needs roughly 1.6GB of
memory to decode one. The script derives `logo-32/64/128` and
`icon-32/180/512` into `public/brand/`, all between 1.7 and 18 kB.

### Responsive

Designed for **desktop and tablet** (roughly 768px up). Phone is not a target;
it degrades sanely but is not designed for.

Layout is driven by **container queries, not viewport breakpoints**. Each
`.panel` declares itself a query container, so a row reflows against the width
it was actually given. That matters because the same `CardSearch` renders both
full-width on the search page and inside a narrower panel on a cart — a
viewport query would get the second case wrong.

Also per css-first: `:has()` instead of state the component would have to
calculate and pass down, logical properties throughout (`margin-inline`,
`inset-inline-start`), and `content-visibility: auto` on the result and cart
lists so off-screen rows are not laid out — list virtualization without the
JavaScript.

### Pages

| Path | Page | What it does |
| --- | --- | --- |
| `/` | Login | the index is the sign-in form |
| `/app` | Dashboard | tiles, buys-per-day chart, cards-bought leaderboard |
| `/app/search` | Search | catalog lookup, no cart required |
| `/app/carts` | Carts | cart list, filtered by `?status=` |
| `/app/carts/new` | NewCart | pick a customer, assign buyers |
| `/app/carts/:id` | Cart | edit lines, search and add cards, complete the buy |

Everything under `/app` is nested inside `ProtectedRoute`, so it requires a
signed-in user. `AppBar` carries the navigation and appears on every signed-in
page.

### Working a buy

The counter workflow the cart page is built around, in the order it happens:

1. **Open a cart** against a customer. A walk-in with no record can be created
   inline on that form -- leaving the page would lose the half-started cart.
   A new customer needs a first and last name, plus a phone number or an
   email (either alone is fine) -- enforced in the form only; the Customer
   model does not check it yet.
   Assign the staff working it; the person starting it is pre-assigned.
2. **Find each card.** Search matches name, collector number, set, printing,
   rarity, and cert number. Rows carry a thumbnail (hover or focus it for a
   readable scan), the on-hand count, and the suggested buy price.
3. **Add it.** One search result per card, with **printing** and
   **condition** pickers plus a quantity, so a playset goes in as one
   action. The catalog stores each printing as its own row, but a search for
   "charizard" returning three near-identical lines reads badly -- so
   `searchResults()` groups them into one result and the picker chooses
   between them. Searching a printing by name ("shadowless") opens the row on
   that printing. Add with the button or a double-click anywhere on the row.

   The **All prices** grid is printings down and conditions across, and every
   cell shows the buy price over the on-hand count for that exact
   combination. Clicking a cell adds the row quantity at that printing and
   condition -- including a printing other than the one the row is for --
   rather than making you add the default and correct it twice. Every add names what went in,
   flashes the row and the new cart line, then returns focus to the search box
   with the query selected, so the next card is one keystroke away.
4. **Adjust the line** -- printing, condition, quantity, offer. Changing the
   printing or condition re-prices the line, but only if the offer was still
   sitting at the suggested price; a hand-typed number is treated as
   negotiated and survives. **Undo price change** steps back through price
   edits, and leaves quantities alone.
5. **Negotiate on the pile** with **Set cart total**. See below.
6. **Pay out.** Split the cart's cash value across cash, check, and store
   credit in any combination. Checkout is blocked until the allocation adds up
   to the cart total.

#### Re-pricing a whole cart

`Set cart total` scales every offer by the same factor, so the change lands
**weighted by what each line is already worth**: a $5 card, a $10 card and a
$5 card retotalled to $25 take 25% / 50% / 25% of it, landing at $6.25 /
$12.50 / $6.25. An even split would pay $6.67 for the $5 common and $11.67 for
the card worth twice as much.

`distributeTotal()` in `store.jsx` does this in integer cents, so the lines
always add back up to the number that was typed. Two cases it has to handle:
a cart already at $0 has no weights to scale and falls back to an even split,
and some totals are simply unreachable -- a single line of 3 cards can only
make multiples of 3 cents -- in which case the UI names the closest total it
could reach instead of silently rounding.

#### Store credit and split payments

Store credit is worth **15%** more than cash (`STORE_CREDIT_BONUS`). The cart
total is the *cash value*, and the bonus applies **to the credit portion
only**. So a $100 buy split $40 check / $60 credit hands over $40 plus $69 of
credit -- $109 of value.

`payoutFor()` is the single place that arithmetic lives, and transactions
store only the allocation, never the computed payout. A change to the bonus
rate therefore cannot leave an old transaction showing arithmetic that no
longer adds up.

### Dummy data

**The cart and catalog UI is not wired to the server.** `client/src/data/`
holds both stand-ins:

- `catalog.js` -- a fixed card catalog plus `searchCards()`, standing in for
  `GET /api/cards`. Every shape matches the Sequelize models, so swapping it
  for a fetch is a change to that one function.
- `store.jsx` -- carts, customers, and staff in React state, with the actions
  a real API would expose. Each one is named after the request that will
  replace it (`createCart` -> `POST /api/carts`, and so on).

It lives for the life of the tab: a refresh resets it. That is deliberate --
dummy state that survived a reload would look like it had saved something.

Shapes the models do not pin down, all assumed by the dummy data:

- **Prices.** `sellPrice`, `buyPrice`, and `marketPrice` are bare JSONB
  columns. The dummy data assumes a map keyed by condition code, with graded
  cards storing their single price under `GRADED`. `priceFor()` in
  `catalog.js` is the only place that assumption lives.
- **Printings.** `Card` has no `printing` column at all. The dummy catalog
  adds one, treating each printing as its own row with its own
  `tcgProductId` and its own prices -- which is how TCGPlayer models it, and
  the reason a 1st Edition Charizard can sit beside an Unlimited one at
  eighteen times the price. Changing a cart line's printing repoints it at a
  sibling row; `printingsFor()` finds the siblings by matching set, name, and
  collector number, and `searchResults()` groups them behind one search
  result. A graded card has no siblings and never groups: the slab is one
  physical copy with its own cert number, so two of them are two results.
- **On-hand counts.** No stock column exists anywhere; real counts belong to
  Shopify inventory. `stockFor(card, condition)` invents one per printing
  *and* condition -- the grain inventory actually has, since a NM copy and a
  HP copy are different things on the shelf. Derived from the product id and
  condition so it is stable across renders rather than flickering on every
  keystroke.

### Card images

Scans come from the TCGPlayer CDN, keyed on the `tcgProductId` the `Card`
model already carries -- so no image column is needed:

```
https://tcgplayer-cdn.tcgplayer.com/product/{tcgProductId}_in_1000x1000.jpg
```

A graded card has no `tcgProductId` of its own (the model makes it carry a
`gradingId` instead), so `tcgProductIdFor()` borrows the id of the raw row
with the same set, name, collector number, and printing -- the card inside
the slab is an ordinary TCGPlayer product.

`CardImage` falls back to a generated SVG placeholder when a scan fails to
load. That fallback matters: **the `tcgProductId` values in the dummy catalog
are invented.** Most return 403 and show the placeholder; the few that
collide with a real product will load a real scan of some unrelated card.
Both resolve themselves once the catalog mirror supplies true ids.

One size is fetched for both the thumbnail and the hover preview. If the CDN
publishes smaller variants, the thumbnail should use one rather than scaling
a 1000px image down to 34px.

## Auth

Sign-in is real: `POST /api/auth/login` runs the Passport local strategy
against Postgres (bcrypt-compared), and the session rides in a cookie.
`client/src/auth/AuthContext.jsx` is the only file that talks to the auth
endpoints -- it calls `GET /api/auth/me` on load, `POST /api/auth/login`, and
`POST /api/auth/logout`. Nothing else in the client reads auth state directly.

The API and the app are same-origin -- Vite proxies `/api` to Express in dev,
Express serves `client/dist` in prod -- so `fetch` sends the session cookie
with no CORS or `credentials` setup.

Credentials are **email + password**, not username: the local strategy is
configured with `usernameField: 'email'` in `server/config/passport.js`.

Accounts are provisioned directly in the `users` table -- insert a row with a
bcrypt `passwordHash`. That's deliberate: buyers are staff, not self-service
signups, so there is no registration route and none is planned.

The API is guarded server-side. `server/routes/index.js` mounts the auth router
first, then `requireAuth` -- so every router mounted *below* that line requires
a session and answers an anonymous caller with 401.

`/api/auth/login` and `/api/auth/logout` stay public by necessity: you need to
be able to sign in, and signing out with an already-dead session should still
succeed rather than error.

## Adding an endpoint

Create `server/routes/<thing>.js`, add its handlers in `server/controllers/`,
then mount the router in `server/routes/index.js` **below the `requireAuth`
line**. Routers mounted there are guarded by default; a new one only reaches an
anonymous caller if someone deliberately moves it above the guard.

## Known gaps

- **No cart API.** `Cart`, `CartItem`, `Customer`, and `BuyTransaction` have
  models and associations but no routes or controllers, so the entire cart
  flow in the client runs on the dummy store described above.
- **Sessions are in-memory.** `express-session` uses its default MemoryStore,
  so every server restart signs everyone out, and it leaks memory under real
  use. `connect-pg-simple` over the existing Postgres connection is the fix.
- **`sync({ alter: true })` runs on every boot.** Fine in development; against
  a production database it means Sequelize issues `ALTER`s at startup to match
  the models. Gate it behind `NODE_ENV` or adopt migrations before deploying.
- **`Card` has no `printing` column.** The client can switch a line between
  printings, but the server model cannot store which one, and `CartItem`
  records only `cardId` -- so that choice has nowhere to land until `Card`
  gains the column and the catalog mirror populates it.
- **`paymentType` cannot hold a split.** It is a single `ENUM` on
  `BuyTransaction`, but the UI lets a buy be paid across cash, check, and
  store credit at once. The dummy transaction stores an `allocation` object
  and writes the largest slice into the ENUM so the column still has a valid
  value -- lossy, and flagged in the code. A related `payments` table is the
  real fix, and it would also give the store-credit bonus somewhere to live.
- **New customers have a placeholder Shopify id.** `shopifyCustomerId` is
  `NOT NULL` and unique, but a real one only exists once Shopify has been
  told about the customer. Customers created at the counter get a
  `local:pending/<id>` value and need a sync that does not exist yet.
- **No customers page.** Customers can be created inline when opening a cart,
  but there is nowhere to list, search, or edit them afterwards. The
  dashboard's Customers tile lands on the cart list.
- **jsdom is pinned to v26.** v30 pulls undici 8, which calls a zlib API
  that does not exist before Node 22.15; the test worker crashes on 22.14.
  Unpin once everyone is on a newer Node.
- **Dead npm scripts.** `db:sync`, `db:sync:alter`, `db:sync:force`, and
  `db:users` point at `server/db/sync.js` and `server/db/showUsers.js`, neither
  of which exists.
