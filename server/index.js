import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import apiRoutes from './routes/index.js'

const app = express()
app.use(express.json())

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
