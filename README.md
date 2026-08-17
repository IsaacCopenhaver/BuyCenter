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
    └── index.js
```

## Run it

```bash
npm run setup
npm run dev
```

Client on http://localhost:5173, API on http://localhost:3000