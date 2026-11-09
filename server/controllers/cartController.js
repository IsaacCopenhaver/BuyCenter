import sequelize from '../db/database.js'
import { Card, Cart, CartItem, Customer, User } from '../models/index.js'
import { parseId } from '../utils/parseId.js'
import { paginationMeta, parsePagination } from '../utils/pagination.js'

// Read from the model so this list can't drift from the ENUM.
const CART_STATUSES = Cart.getAttributes().status.values
const CONDITIONS = CartItem.getAttributes().condition.values
const MAX_PRICE_CENTS = 9999999999 // DECIMAL(10, 2) max: 99,999,999.99

// Money arrives as a JSON number. Work in whole cents so float noise
// (0.29 * 100 = 28.999...) can't slip in, and reject more than 2 decimals.
// Returns a "3.50"-style string for the DECIMAL column, or null if invalid.
function parseOfferPrice(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return null
    }

    const cents = Math.round(value * 100)

    if ((Math.abs(value * 100 - cents) > 1e-6) || cents > MAX_PRICE_CENTS) {
        return null
    }

    return (cents / 100).toFixed(2)
}

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
                    attributes: ['id', 'firstName', 'lastName', 'email'],
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

// Validates the item fields shared by POST and PATCH. Pure: no DB, no req/res.
// partial: false (POST) -> every field is required.
// partial: true (PATCH) -> a missing field is skipped (left unchanged), but a
// present one, including null, must be valid.
// Returns { error } for the first failing rule, otherwise { values } holding
// only the fields that were present, already cleaned.
function validateItemFields(body, { partial }) {
    const shouldCheck = (field) => !partial || body[field] !== undefined
    const values = {}

    if (body.grade != null) {
        return { error: 'Graded items are not supported yet' }
    }

    if (shouldCheck('printing')) {
        const { printing } = body

        if (typeof printing !== 'string' || printing.trim() === '') {
            return { error: 'printing is required' }
        }

        values.printing = printing.trim()
    }

    if (shouldCheck('condition')) {
        if (!CONDITIONS.includes(body.condition)) {
            return { error: `condition must be one of: ${CONDITIONS.join(', ')}` }
        }

        values.condition = body.condition
    }

    if (shouldCheck('quantity')) {
        // Same rule as an ID: a positive integer sent as a JSON number.
        const quantity = parseBodyId(body.quantity)

        if (!quantity) {
            return { error: 'quantity must be a positive integer' }
        }

        values.quantity = quantity
    }

    if (shouldCheck('offerPrice')) {
        const offerPrice = parseOfferPrice(body.offerPrice)

        if (offerPrice === null) {
            return {
                error: 'offer price must be a non-negative number with at most 2 decimals'
            }
        }

        values.offerPrice = offerPrice
    }

    return { values }
}

export async function addCartItem(req, res) {
    try {
        const cartId = parseId(req.params.id)

        if (!cartId) {
            return res.status(400).json({
                error: 'Cart ID must be a positive integer'
            })
        }

        const body = req.body ?? {}
        const { error, values } = validateItemFields(body, { partial: false })

        if (error) {
            return res.status(400).json({ error })
        }

        const { cardId } = body

        if (typeof cardId !== 'string' || cardId === '') {
            return res.status(400).json({ error: 'cardId is required' })
        }

        const { printing, condition, quantity, offerPrice } = values

        // Cards are read-only here (no catalog CRUD), so this check can sit
        // outside the transaction.
        if (!(await Card.findByPk(cardId))) {
            return res.status(400).json({
                error: `Card ${cardId} does not exist`
            })
        }

        const result = await sequelize.transaction(async (transaction) => {
            // SELECT ... FOR UPDATE: concurrent adds/checkouts on this cart
            // wait here until we commit, so the check-then-write below can't
            // interleave with another request.
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

            // Merge rule: same card + printing + condition + price.
            const existing = await CartItem.findOne({
                where: {
                    cartId,
                    cardId,
                    printing: printing.trim(),
                    condition,
                    offerPrice,
                    grade: null,
                },
                order: [['id', 'ASC']],
                transaction,
            })

            if (existing) {
                // Safe read-modify-write: the cart lock means no one else can
                // change this cart's items until we commit.
                existing.quantity += quantity
                await existing.save({ transaction })
                return { status: 200, body: { item: existing } }
            }

            const item = await CartItem.create({
                cartId,
                cardId,
                printing: printing.trim(),
                condition,
                quantity,
                offerPrice,
            }, { transaction })

            return { status: 201, body: { item } }
        })

        return res.status(result.status).json(result.body)
    } catch (error) {
        console.error('Failed to add cart item: ', error)
        return res.status(500).json({
            error: 'Failed to add cart item'
        })
    }
}