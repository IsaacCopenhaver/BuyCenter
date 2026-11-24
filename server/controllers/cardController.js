import { Op } from 'sequelize'
import { Card, CardSet } from '../models/index.js'
import { parseId } from '../utils/parseId.js'
import { paginationMeta, parsePagination } from '../utils/pagination.js'
import { escapeLike } from '../utils/escapeLike.js'

const MAX_Q_LENGTH = 100

export async function getCards(req, res) {
    try {
        const pagination = parsePagination(req.query)

        if (!pagination) {
            return res.status(400).json({
                error: 'Invalid pagination parameters'
            })
        }

        const { page, limit, offset } = pagination

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

        const { count, rows } = await Card.findAndCountAll({
            where,
            include,
            limit,
            offset,
            order: [['shopifyProductId', 'ASC']],
        })

        return res.json({
            data: rows,
            pagination: paginationMeta(page, limit, count)
        })
    } catch (error) {
        console.error('Failed to fetch cards:', error)
        return res.status(500).json({
            error: 'Failed to fetch cards'
        })
    }
}