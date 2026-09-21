# Buy Center

Vite + React client, Express API, one repo.

```
BuyCenter/
├── package.json      # scripts that run both sides
├── .env              # DATABASE_URL + SESSION_SECRET -- not committed
├── client/
│   ├── vite.config.js   # proxies /api -> localhost:3000 in dev
│   ├── index.html
│   └── src/
│       ├── App.jsx          # routes: / is login, /app is behind the guard
│       ├── auth/AuthContext.jsx   # the only file that talks to /api/auth
│       ├── routes/ProtectedRoute.jsx
│       ├── components/{BuysByDayChart.jsx,CardsBoughtBoard.jsx}
│       └── pages/{Login.jsx,Dashboard.jsx}
└── server/
    ├── index.js              # app setup, mounts /api, serves client/dist in prod
    ├── routes/
    │   ├── index.js          # API barrel -- mount each resource router here
    │   └── auth.js           # /api/auth/{login,me,logout}
    ├── controllers/
    │   └── authController.js   # request handlers + data access
    ├── middleware/
    │   └── requireAuth.js    # 401s anything without a session
    ├── config/passport.js    # local strategy, serialize/deserialize
    ├── models/               # Sequelize models + their associations
    └── db/database.js        # the one shared Sequelize instance
```

## Run it

```bash
npm run setup     # installs root, client, and server deps
npm run dev
```

Client on http://localhost:5173, API on http://localhost:3000.

You need a `.env` in the repo root before the server will boot:

```
DATABASE_URL=postgres://user:pass@host:5432/dbname
SESSION_SECRET=<openssl rand -hex 32>
```

Both are required, and they fail differently. The server calls
`sequelize.authenticate()` at startup, so a missing or wrong `DATABASE_URL`
kills the boot outright. A missing `SESSION_SECRET` is quieter and worse: the
app starts fine, then errors on every request that touches the session.
`PORT` is optional and defaults to 3000.

For a production-shaped run, `npm run build` then `npm start`: the build writes
`client/dist`, and `server/index.js` serves it automatically if that folder
exists, so the whole app is one Node process on one port.

## Database

One Postgres database, reached through a single Sequelize instance in
`server/db/database.js`. Models live in `server/models/`; `models/index.js`
declares the associations (a game has many sets, a set has many cards, a card
has one grading).

**The connection requires SSL** (`dialectOptions.ssl`), which suits a hosted
Postgres like DigitalOcean Managed Databases but will fail against a stock
local Postgres, since that ships with SSL off. Point `DATABASE_URL` at a hosted
database, or make that option conditional.

There are no migrations. `server/index.js` runs `sequelize.sync({ alter: true })`
on every boot, so the schema follows the models automatically in development.
See the gaps below before running that against anything you care about.

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

- **Sessions are in-memory.** `express-session` uses its default MemoryStore,
  so every server restart signs everyone out, and it leaks memory under real
  use. `connect-pg-simple` over the existing Postgres connection is the fix.
- **`sync({ alter: true })` runs on every boot.** Fine in development; against
  a production database it means Sequelize issues `ALTER`s at startup to match
  the models. Gate it behind `NODE_ENV` or adopt migrations before deploying.
- **No buy or customer models yet.** The dashboard's tiles, chart, and
  leaderboard render real UI against hardcoded `null`s, and `/app/buys`,
  `/app/buys/new`, and `/app/customers` are not registered in `App.jsx` yet.
- **Dead npm scripts.** `db:sync`, `db:sync:alter`, `db:sync:force`, and
  `db:users` point at `server/db/sync.js` and `server/db/showUsers.js`, neither
  of which exists.
