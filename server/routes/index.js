import { Router } from 'express'
import authRouter from './auth.js'
import { requireAuth } from '../middleware/requireAuth.js'

// Every API endpoint hangs off this router.
const router = Router()

// Public. Login has to answer someone who isn't signed in yet, so this is
// mounted above the guard -- the auth router protects its own routes.
router.use('/auth', authRouter)

// --- everything below this line requires a session ---
// To add a resource: create routes/<thing>.js, then mount it *under* this
// line. It's guarded by default; a new router only reaches an anonymous
// caller if someone deliberately moves it above the guard.
router.use(requireAuth)

export default router
