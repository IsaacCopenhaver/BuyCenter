import { Cart } from '../models/index.js'

// Locks the cart row (SELECT ... FOR UPDATE) for the rest of the transaction,
// so concurrent writes to the same cart run one at a time, and checks the
// cart can still be changed.
// Returns { cart }, or { response } with the 404/409 to send instead.
export async function lockEditableCart(cartId, transaction) {
    const cart = await Cart.findByPk(cartId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
    })

    if (!cart) {
        return { response: { status: 404, body: { error: `Cart ${cartId} not found` } } }
    }

    if (cart.status !== 'in_progress') {
        return {
            response: {
                status: 409,
                body: { error: `Cart ${cartId} is ${cart.status} and can't be changed` },
            },
        }
    }

    return { cart }
}