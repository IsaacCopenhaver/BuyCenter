import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import apiRoutes from './routes/index.js'
import session from 'express-session'
import passport from 'passport'
import { initializePassport } from './config/passport.js'
import sequelize from './db/database.js'
import './db/models/index.js'

await sequelize.authenticate()
await sequelize.sync({ alter: true })

const sess = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}

initializePassport(passport)

const app = express()
app.use(express.json())
app.use(session(sess))
app.use(passport.initialize())
app.use(passport.session())

app.use('/api', apiRoutes)

// --- production: serve the built client from this same server ---
// No NODE_ENV needed -- if you've run `npm run build`, this kicks in.
// In dev you use the Vite server on :5173, so this just sits idle.
const dist = path.resolve(import.meta.dirname, '../client/dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`http://localhost:${port}`))

