import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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

  async function signOut() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <main>
      <header className="app-bar">
        <h1>Buy Center</h1>
        <div className="app-bar-user">
          <span className="muted">{user.username}</span>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <form className="todo-form" onSubmit={addTodo}>
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
