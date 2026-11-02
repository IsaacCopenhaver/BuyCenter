import { Router } from 'express'
import { createCart, getCart } from '../controllers/cartController.js'

const router = Router()

router.post('/', createCart)
router.get('/:id', getCart)

export default router