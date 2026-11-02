import sequelize from '../db/database.js'
import { Cart, Customer, User } from '../models/index.js'
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
        
        const requestedBuyerIds = req.body?.buyerIds ?? []

        if (!Array.isArray(requestedBuyerIds)) {
            return res.status(400).json({
                error: 'buyerIds must be an array of positive integers'
            })
        }

        const parsedBuyerIds = requestedBuyerIds.map(parseBodyId)

        if (parsedBuyerIds.some((id) => id == null)) {
            return res.status(400).json({
                error: 'buyerIds must be an array of positive integers'
            })
        }

        // The worker creating the cart is always a buyer. A Set drops
        // duplicates, e.g. when they also listed themselves in buyerIds.
        const buyerIds = [...new Set([req.user.id, ...parsedBuyerIds])]

        const buyers = await User.findAll({ where: { id: buyerIds } })

        if (buyers.length !== buyerIds.length) {
            return res.status(400).json({
                error: 'One or more buyerIds do not exist'
            })
        }

        // Managed transaction: commits when the callback finishes, rolls back
        // if anything inside throws, a cart never exists without its buyers.
        const cart = await sequelize.transaction(async (transaction) => {
            const newCart = await Cart.create({ customerId }, { transaction })
            await newCart.addBuyers(buyers, { transaction })
            return newCart
        })

        return res.status(201).json({
            cart: { ...cart.toJSON(), buyerIds }
        })

    } catch (error) {
        console.error('Failed to create cart: ', error)
        return res.status(500).json({
            error: 'Failed to create cart'
        })
    }
}