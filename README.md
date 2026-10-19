# Buy Center

Counter tool for buying trading cards from customers. Vite + React client,
Express API, one repo, one Postgres database.

```
BuyCenter/
├── package.json      # scripts that run both sides
├── .env              # DATABASE_URL + SESSION_SECRET -- not committed
├── client/
│   ├── vite.config.js   # proxies /api -> localhost:3000 in dev
│   ├── index.html
│   └── src/
│       ├── App.jsx          # every route lives here
│       ├── auth/AuthContext.jsx   # the only file that talks to /api/auth
│       ├── routes/ProtectedRoute.jsx
│       ├── data/            # dummy carts and catalog -- see "Dummy data"
│       │   ├── catalog.js   # stand-in for the card catalog + search
│       │   └── store.jsx    # stand-in for the carts API
│       ├── components/
│       │   ├── AppBar.jsx           # header + nav, on every signed-in page
│       │   ├── CardSearch.jsx       # search box, used standalone and in a cart
│       │   ├── BuysByDayChart.jsx
│       │   └── CardsBoughtBoard.jsx
│       └── pages/{Login,Dashboard,Search,Carts,NewCart,Cart}.jsx
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

One shape the models do not pin down: `sellPrice`, `buyPrice`, and
`marketPrice` are bare JSONB columns. The dummy data assumes a map keyed by
condition code, with graded cards storing their single price under `GRADED`.
`priceFor()` in `catalog.js` is the only place that assumption lives.

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
- **No customers page.** Customers can be chosen when opening a cart but not
  created, so a walk-in you have never bought from cannot be added yet. The
  dashboard's Customers tile currently lands on the cart list.
- **No test runner.** There is no test script and no framework installed.
- **Dead npm scripts.** `db:sync`, `db:sync:alter`, `db:sync:force`, and
  `db:users` point at `server/db/sync.js` and `server/db/showUsers.js`, neither
  of which exists.
