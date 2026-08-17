# my-app

Vite + React client, Express API, one repo

```
my-app/
├── package.json      # scripts that run both sides
├── client/
│   ├── vite.config.js   # proxies /api -> localhost:3000 in dev
│   ├── index.html
│   └── src/{main.jsx,App.jsx,index.css}
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
