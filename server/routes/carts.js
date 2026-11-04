import { Router } from 'express'
import { addCartItem, createCart, getCart, getCarts } from '../controllers/cartController.js'

const router = Router()

router.post('/:id/items', addCartItem)
router.get('/', getCarts)
router.post('/', createCart)
router.get('/:id', getCart)

export default router