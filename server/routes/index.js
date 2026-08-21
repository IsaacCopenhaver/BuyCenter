import { Router } from 'express'
import todosRouter from './todos.js'
import authRouter from './auth.js'

// Every API endpoint hangs off this router. To add a resource: create
// routes/<thing>.js, then mount it here -- index.js stays untouched.
const router = Router()

router.use('/todos', todosRouter)
router.use('/auth', authRouter)

export default router
