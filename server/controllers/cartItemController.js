import { Op } from 'sequelize'
import sequelize from '../db/database.js'
import { Card, Cart, CartItem } from '../models/index.js'
import { parseBodyId, parseId } from '../utils/parseId.js'

// Read from the model so this list can't drift from the ENUM.
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

export async function updateCartItem(req, res) {
    try {
        const cartId = parseId(req.params.id)
        const itemId = parseId(req.params.itemId)

        if (!cartId || !itemId) {
            return res.status(400).json({
                error: 'Cart ID and item ID must be positive integers'
            })
        }

        const body = req.body ?? {}

        // Changing the card makes it a different item: remove + add instead
        if (body.cardId !== undefined) {
            return res.status(400).json({
                error: "cardId can't be changed. Remove the item and add a new one"
            })
        }

        const { error, values } = validateItemFields(body, { partial: true })

        if (error) {
            return res.status(400).json({ error })
        }

        if (Object.keys(values).length === 0) {
            return res.status(400).json({ error: 'Nothing to update' })
        }

        const result = await sequelize.transaction(async (transaction) => {
            // Same lock as addCartItem: one writer per cart at a time.
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

            // Scoped to the cart in the URL, so an item from another cart
            // can't be edited through this one.
            const item = await CartItem.findOne({
                where: { id: itemId, cartId },
                transaction,
            })

            if (!item) {
                return {
                    status: 404,
                    body: { error: `Item ${itemId} not found in cart ${cartId}` },
                }
            }

            // Apply the edit in memory; save() later writes only changed columns.
            item.set(values)

            // Merge rule, checked against the item's values after the edit.
            // findAll, not findOne: rows from before the merge rule existed
            // may already be duplicates of each other.
            const duplicates = await CartItem.findAll({
                where: {
                    id: { [Op.ne]: item.id },
                    cartId,
                    cardId: item.cardId,
                    printing: item.printing,
                    condition: item.condition,
                    offerPrice: item.offerPrice,
                    grade: null,
                },
                transaction,
            })

            // Keep the edited row (the one in the URL); absorb the others.
            for (const duplicate of duplicates) {
                item.quantity += duplicate.quantity
                await duplicate.destroy({ transaction })
            }

            await item.save({ transaction })

            return { status: 200, body: { item } }
        })

        return res.status(result.status).json(result.body)
    } catch (error) {
        console.error('Failed to update cart item: ', error)
        return res.status(500).json({
            error: 'Failed to update cart item'
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