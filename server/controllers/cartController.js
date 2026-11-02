import { Cart, Customer } from '../models/index.js'
import { parseId } from '../utils/parseId.js'

// JSON bodies keep their types, so an ID must arrive as a number: true or
// "5" is a client bug, not an ID. undefined/null mean "not provided".
function parseBodyId(value) {
    if (value === undefined || value === null) { return undefined }
    return typeof value === 'number' ? parseId(value) : null
}

export async function createCart(req, res) {
    try {
        const customerId = parseBodyId(req.body?.customerId)

        if (customerId === null) {
            return res.status(400).json({
                error: 'customerId must be a positive integer'
            })
        }

        if (customerId && !(await Customer.findByPk(customerId))) {
            return res.status(400).json({
                error: `Customer ${customerId} does not exist`
            })
        }
        const cart = await Cart.create({ customerId })

        return res.status(201).json({
            cart
        })
    } catch (error) {
        console.error('Failed to create cart: ', error)
        return res.status(500).json({
            error: 'Failed to create cart'
        })
    }
}