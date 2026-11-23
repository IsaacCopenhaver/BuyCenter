import { Router } from 'express'
import { getCustomer, getCustomers } from '../controllers/customerController.js'

const router = Router()

router.get('/', getCustomers)
router.get('/:id', getCustomer)

export default router