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

> **The API is not protected.** There is no session handling, no auth
> middleware, and no Passport wiring on the server yet -- every `/api` route
> answers any caller. `curl localhost:3000/api/todos` returns data whether or
> not you signed in. The login screen is a UI shell only; treat nothing behind
> it as access-controlled until the server side lands.

On the client, `/` is the login page and `/app` sits behind `ProtectedRoute`.
Sign-in is stubbed in `client/src/auth/AuthContext.jsx`: any non-empty username
and password is accepted, and the "session" is a `sessionStorage` entry, so it
survives a refresh but not closing the tab.

Wiring up Passport (local strategy + Postgres) means replacing the three
`TODO(passport)` bodies in that file with calls to `GET /api/auth/me`,
`POST /api/auth/login`, and `POST /api/auth/logout`, then adding the matching
routes plus an authorization guard on the server. Nothing else in the client
reads auth state directly, so no other component has to change.
