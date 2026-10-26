import { Op } from 'sequelize'
import { Card, CardSet } from '../models/index.js'

const MAX_Q_LENGTH = 100
const MAX_INTEGER = 2147483647  // Max value for a signed 32-bit integer

// Optional positive-integer query param: undefined when absent or empty, null
// when present but invalid (so the caller can answer 400).
function parseId(value) {
    if (value === undefined || value === '') { return undefined }
    const id = Number(value)
    return Number.isInteger(id) && id > 0 && id <= MAX_INTEGER ? id : null
}

// Postgres LIKE treats % and _ as wildcards and \ as its escape character.
// Escape all three so a user's input matches literally.
function escapeLike(value) {
    return value.replace(/[\\%_]/g, '\\$&')
}

export async function getCards(req, res) {
    try {
        const page = Number(req.query.page ?? 1)
        const limit = Number(req.query.limit ?? 10)

        if (!Number.isInteger(page) || page < 1 ||
            !Number.isInteger(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({
                error: 'Invalid pagination parameters'
            })
        }

        const q = req.query.q

        if (q !== undefined && typeof q !== 'string') {
            return res.status(400).json({
                error: 'q must be a string',
            })
        }

        const search = q?.trim() ?? ''

        if (search.length > MAX_Q_LENGTH) {
            return res.status(400).json({
                error: `q must be at most ${MAX_Q_LENGTH} characters`,
            })
        }

        const setId = parseId(req.query.setId)
        const gameId = parseId(req.query.gameId)

        if (setId === null || gameId === null) {
            return res.status(400).json({
                error: 'setId and gameId must be positive integers',
            })
        }

        const where = {}

        if (search) {
            where.name = {
                [Op.iLike]: `%${escapeLike(search)}%`
            }
        }

        if (setId) {
            where.setId = setId
        }

        const include = []

        if (gameId) {
            include.push({
                model: CardSet,
                attributes: [],
                where: { gameId },
            })
        }

        const offset = (page - 1) * limit

        const { count, rows } = await Card.findAndCountAll({
            where,
            include,
            limit,
            offset,
            order: [['shopifyProductId', 'ASC']],
        })

        return res.json({
            data: rows,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        })
    } catch (error) {
        console.error('Failed to fetch cards:', error)
        return res.status(500).json({
            error: 'Failed to fetch cards'
        })
    }
}