import { Router } from 'express'
import {
  listTodos,
  createTodo,
  deleteTodo,
} from '../controllers/todosController.js'

const router = Router()

// Mounted at /api/todos in index.js, so paths here are relative to that.
router.get('/', listTodos)
router.post('/', createTodo)
router.delete('/:id', deleteTodo)

export default router
