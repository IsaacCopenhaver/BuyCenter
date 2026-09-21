import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import {
    login,
    me,
    logout
} from '../controllers/authController.js'

const router = Router()

// Mounted at /api/auth in index.js, so paths here are relative to that. This
// router sits above the global guard, so each route states its own rule.

// Public -- this is how you get a session in the first place.
router.post('/login', login)

// Guarded. A 401 here is not an error: it's how the client asks "is anyone
// signed in?" and gets told no.
router.get('/me', requireAuth, me)

// Public on purpose, so signing out stays idempotent. Guarding it would make
// logging out with an already-expired session answer 401 instead of just
// succeeding, and there is nothing the caller could do about that.
router.post('/logout', logout)

export default router
