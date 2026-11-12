import { Router } from 'express'
import { addCartBuyer, createCart, getCart, getCarts, removeCartBuyer, updateCart, deleteCart } from '../controllers/cartController.js'
import { addCartItem, updateCartItem, deleteCartItem } from '../controllers/cartItemController.js'

const router = Router()

router.post('/:id/items', addCartItem)
router.get('/', getCarts)
router.post('/', createCart)
router.get('/:id', getCart)
router.patch('/:id/items/:itemId', updateCartItem)
router.delete('/:id/items/:itemId', deleteCartItem)
router.put('/:id/buyers/:userId', addCartBuyer)
router.delete('/:id/buyers/:userId', removeCartBuyer)
router.patch('/:id', updateCart)
router.delete('/:id', deleteCart)

export default router