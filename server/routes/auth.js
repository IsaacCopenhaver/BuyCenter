import { Router } from 'express'
import {
    login,
    me,
    logout
} from '../controllers/authController.js'

const router = Router()

// Mounted at /api/auth in index.js, so paths here are relative to that.
router.post('/login', login)
router.get('/me', me)
router.post('/logout', logout)

export default router