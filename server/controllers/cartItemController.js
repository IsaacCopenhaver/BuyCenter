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