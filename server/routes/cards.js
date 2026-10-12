import { Router } from 'express'
import { getCards } from '../controllers/cardController.js'

const router = Router()

router.get('/', getCards)

export default router