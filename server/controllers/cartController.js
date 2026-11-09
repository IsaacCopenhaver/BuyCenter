import sequelize from '../db/database.js'
import { Cart, CartItem, Customer, User } from '../models/index.js'
import { parseBodyId, parseId } from '../utils/parseId.js'
import { paginationMeta, parsePagination } from '../utils/pagination.js'
import { USER_PUBLIC_ATTRIBUTES } from '../models/User.js'

// Read from the model so this list can't drift from the ENUM.
const CART_STATUSES = Cart.getAttributes().status.values

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

export async function getCart(req, res) {
    try {
        const id = parseId(req.params.id)

        if (!id) {
            return res.status(400).json({
                error: 'Cart ID must be a positive integer'
            })
        }

        const cart = await Cart.findByPk(id, {
            include: [
                { model: Customer, as: 'customer' },
                { model: CartItem, as: 'items'},
                {
                    model: User,
                    as: 'buyers',
                    attributes: USER_PUBLIC_ATTRIBUTES,
                    // Hide the cart_buyers join-table columns on each buyer.
                    through: { attributes: [] },
                },
            ],
            order: [[{ model: CartItem, as: 'items' }, 'id', 'ASC']],
        })

        if (!cart) {
            return res.status(404).json({
                error: `Cart ${id} not found`
            })
        }

        return res.json({ cart })
    }
    catch (error) {
        console.error('Failed to fetch cart: ', error)
        return res.status(500).json({
            error: 'Failed to get cart'
        })
    }
}

export async function getCarts(req, res) {
    try {
        const pagination = parsePagination(req.query)

        if (!pagination) {
            return res.status(400).json({
                error: 'Invalid pagination parameters'
            })
        }

        const { page, limit, offset } = pagination
        const { status } = req.query

        if (status !== undefined && 
            status !== '' && 
            !CART_STATUSES.includes(status)) {
                return res.status(400).json({
                    error: `status must be one of: ${CART_STATUSES.join(', ')}`
                })
            }
        
        const where = {}

        if (status) {
            where.status = status
        }

        const { count, rows } = await Cart.findAndCountAll({
            where,
            include: [{
                model: Customer,
                as: 'customer',
                attributes: ['id', 'firstName', 'lastName'],
            }],
            limit,
            offset,
            order: [['createdAt', 'DESC'], ['id', 'DESC']],
        })

        return res.json({
            data: rows,
            pagination: paginationMeta(page, limit, count)
        })
    } catch (error) {
        console.error('Failed to fetch carts: ', error)
        return res.status(500).json({
            error: 'Failed to fetch carts'
        })
    }
}

export async function addCartBuyer(req, res) {
    try {
        const cartId = parseId(req.params.id)
        const userId = parseId(req.params.userId)

        if (!cartId || !userId) {
            return res.status(400).json({
                error: 'Cart ID and user ID must be positive integers'
            })
        }

        const result = await sequelize.transaction(async (transaction) => {
            const cart = await Cart.findByPk(cartId, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            })

            if (!cart) {
                return { status: 404, body: { error: `Cart ${cartId} not found` } }
            }

            if (cart.status !== 'in_progress') {
                return {
                    status: 409,
                    body: { error: `Cart ${cartId} is ${cart.status} and can't be changed` },
                }
            }

            const user = await User.findByPk(userId, {
                attributes: ['id'],
                transaction,
            })

            if (!user) {
                return { status: 404, body: { error: `User ${userId} not found` } }
            }

            // Inserts the cart_buyers row only if it's missing, so adding
            // someone who's already a buyer is a harmless no-op.
            await cart.addBuyer(user, { transaction })

            return { status: 204 }
        })

        if (result.status === 204) {
            return res.status(204).end()
        }

        return res.status(result.status).json(result.body)
    } catch (error) {
        console.error('Failed to add cart buyer: ', error)
        return res.status(500).json({
            error: 'Failed to add cart buyer'
        })
    }
}

export async function removeCartBuyer(req, res) {
    try {
        const cartId = parseId(req.params.id)
        const userId = parseId(req.params.userId)

        if (!cartId || !userId) {
            return res.status(400).json({
                error: 'Cart ID and user ID must be positive integers'
            })
        }

        const result = await sequelize.transaction(async (transaction) => {
            const cart = await Cart.findByPk(cartId, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            })

            if (!cart) {
                return { status: 404, body: { error: `Cart ${cartId} not found` } }
            }

            if (cart.status !== 'in_progress') {
                return {
                    status: 409,
                    body: { error: `Cart ${cartId} is ${cart.status} and can't be changed` },
                }
            }

            if (!(await cart.hasBuyer(userId, { transaction }))) {
                return {
                    status: 404,
                    body: { error: `User ${userId} is not a buyer on cart ${cartId}` },
                }
            }

            if ((await cart.countBuyers({ transaction })) === 1) {
                return {
                    status: 409,
                    body: { error: 'A cart must keep at least one buyer' },
                }
            }

            await cart.removeBuyer(userId, { transaction })

            return { status: 204 }
        })

        if (result.status === 204) {
            return res.status(204).end()
        }

        return res.status(result.status).json(result.body)
    } catch (error) {
        console.error('Failed to remove cart buyer: ', error)
        return res.status(500).json({
            error: 'Failed to remove cart buyer'
        })
    }
}