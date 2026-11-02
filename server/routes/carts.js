import { Router } from 'express'
import { createCart, getCart, getCarts } from '../controllers/cartController.js'

const router = Router()

router.get('/', getCarts)
router.post('/', createCart)
router.get('/:id', getCart)

export default router