// In-memory store. Swap this for a real database later -- the route layer
// doesn't need to change when you do.
let todos = [{ id: 1, title: 'Try it out', done: false }]

export function listTodos(req, res) {
  res.json(todos)
}

export function createTodo(req, res) {
  const title = req.body.title?.trim()
  if (!title) return res.status(400).json({ error: 'title is required' })
  const todo = { id: Date.now(), title, done: false }
  todos.push(todo)
  res.status(201).json(todo)
}

export function deleteTodo(req, res) {
  todos = todos.filter((t) => t.id !== Number(req.params.id))
  res.status(204).end()
}