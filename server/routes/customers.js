import { Router } from 'express'
import { createCustomer, getCustomer, getCustomers } from '../controllers/customerController.js'

const router = Router()

router.post('/', createCustomer)
router.get('/', getCustomers)
router.get('/:id', getCustomer)

export default router