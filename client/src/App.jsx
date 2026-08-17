import { useEffect, useState } from 'react'

export default function App() {
  const [todos, setTodos] = useState([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    fetch('/api/todos')
      .then((r) => r.json())
      .then(setTodos)
  }, [])

  async function addTodo(e) {
    e.preventDefault()
    if (!draft.trim()) return
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: draft }),
    })
    setTodos([...todos, await res.json()])
    setDraft('')
  }

  async function removeTodo(id) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    setTodos(todos.filter((t) => t.id !== id))
  }

  return (
    <main>
      <h1>my-app</h1>
      <form onSubmit={addTodo}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a todo..." />
        <button>Add</button>
      </form>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            {todo.title}
            <button onClick={() => removeTodo(todo.id)}>&times;</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
