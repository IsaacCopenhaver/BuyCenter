# Buy Center

Vite + React client, Express API, one repo

```
BuyCenter/
├── package.json      # scripts that run both sides
├── client/
│   ├── vite.config.js   # proxies /api -> localhost:3000 in dev
│   ├── index.html
│   └── src/
│       ├── App.jsx          # routes: / is login, /app is behind the guard
│       ├── auth/AuthContext.jsx   # who's signed in -- stubbed, see below
│       ├── routes/ProtectedRoute.jsx
│       └── pages/{Login.jsx,Dashboard.jsx}
└── server/
    ├── index.js              # app setup, mounts /api, serves client/dist in prod
    ├── routes/
    │   ├── index.js          # API barrel -- mount each resource router here
    │   └── todos.js          # /api/todos
    ├── controllers/
    │   └── todosController.js  # request handlers + data access
    └── middleware/
```

Adding an endpoint: create `server/routes/<thing>.js`, add its handlers in
`server/controllers/`, then mount the router in `server/routes/index.js`.

## Run it

```bash
npm run setup
npm run dev
```

Client on http://localhost:5173, API on http://localhost:3000

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

> **The API is not protected.** There is no auth middleware, so
> `curl localhost:3000/api/todos` still answers any caller. `/app` is guarded
> on the client only, which stops a browser but not a request.

Sessions use the default `express-session` MemoryStore, so every server
restart signs everyone out. `connect-pg-simple` over the existing Postgres
connection is the fix.
