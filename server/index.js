import express from 'express'
import path from 'node:path'
import fs from 'node:fs'

const app = express()
app.use(express.json())

// --- API routes: everything under /api ---
let todos = [{ id: 1, title: 'Try it out', done: false }]

app.get('/api/todos', (req, res) => {
  res.json(todos)
})

app.post('/api/todos', (req, res) => {
  const title = req.body.title?.trim()
  if (!title) return res.status(400).json({ error: 'title is required' })
  const todo = { id: Date.now(), title, done: false }
  todos.push(todo)
  res.status(201).json(todo)
})

app.delete('/api/todos/:id', (req, res) => {
  todos = todos.filter((t) => t.id !== Number(req.params.id))
  res.status(204).end()
})

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
