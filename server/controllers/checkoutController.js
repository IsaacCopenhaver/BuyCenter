import sequelize from '../db/database.js'
import { BuyTransaction } from '../models/index.js'
import { lockEditableCart } from '../utils/cartLock.js'
import { parseMoney } from '../utils/money.js'
import { parseId } from '../utils/parseId.js'
import { sendResult } from '../utils/sendResult.js'

// Read from the model so this list can't drift from the ENUM.
const PAYMENT_TYPES = BuyTransaction.getAttributes().paymentType.values
const CHECKOUT_FIELDS = ['totalPrice', 'payoutAmount', 'paymentType']

// Completes a cart: records the buy transaction and marks the cart
// completed, together. Prices are the client's negotiated values, stored
// as-is; the backend does no pricing math.
export async function checkoutCart(req, res) {
    try {
        const cartId = parseId(req.params.id)

        if (!cartId) {
            return res.status(400).json({
                error: 'cartId must be a positive integer'
            })
        }

        const body = req.body ?? {}

        const unknownFields = Object.keys(body).filter((key) => !CHECKOUT_FIELDS.includes(key))

        if (unknownFields.length > 0) {
            return res.status(400).json({
                error: `Only ${CHECKOUT_FIELDS.join(', ')} are accepted (got: ${unknownFields.join(', ')})`
            })
        }

        const totalPrice = parseMoney(body.totalPrice)
        const payoutAmount = parseMoney(body.payoutAmount)

        if (totalPrice === null || payoutAmount === null) {
            return res.status(400).json({
                error: 'totalPrice and payoutAmount must be non-negative numbers with at most 2 decimals'
             })
        }

        if (!PAYMENT_TYPES.includes(body.paymentType)) {
            return res.status(400).json({
                error: `paymentType must be one of: ${PAYMENT_TYPES.join(', ')}`
            })
        }

        const result = await sequelize.transaction(async (transaction) => {
            // Also blocks a second checkout: a completed cart gets the 409.
            const { cart, response } = await lockEditableCart(cartId, transaction)

            if (response) {
                return response
            }

            if (cart.customerId === null) {
                return {
                    status: 409,
                    body: { error: 'Cart needs a customer before checkout' },
                }
            }

            if ((await cart.countItems({ transaction })) === 0) {
                return {
                    status: 409,
                    body: { error: "Cart has no items and can't be checked out" }
                }
            }

            const buyTransaction = await BuyTransaction.create({
                cartId,
                customerId: cart.customerId,
                totalPrice,
                payoutAmount,
                paymentType: body.paymentType,
                // From the session, never the body: the server decides who
                // completed it.
                completedById: req.user.id,
                completedAt: new Date(),
            }, { transaction })

            cart.status = 'completed'
            await cart.save({ transaction })

            return { status: 201, body: { transaction: buyTransaction } }
        })

        return sendResult(res, result)
    } catch (error) {
        console.error('Failed to check out cart: ', error)
        return res.status(500).json({
            error: ('Failed to check out cart')
        })
    }
}