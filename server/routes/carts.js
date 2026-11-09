import { Router } from 'express'
import { createCart, getCart, getCarts } from '../controllers/cartController.js'
import { addCartItem, updateCartItem, deleteCartItem } from '../controllers/cartItemController.js'

const router = Router()

router.post('/:id/items', addCartItem)
router.get('/', getCarts)
router.post('/', createCart)
router.get('/:id', getCart)
router.patch('/:id/items/:itemId', updateCartItem)
router.delete('/:id/items/:itemId', deleteCartItem)

export default router