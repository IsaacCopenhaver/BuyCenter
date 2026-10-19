import { Op } from 'sequelize'
import { Card } from '../models/index.js'

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

        const search = q?.trim()

        const offset = (page - 1) * limit

        const { count, rows } = await Card.findAndCountAll({
            where: search 
                ? {
                    name: {
                        [Op.iLike]: `%${search}%`
                    }
                }
                : {},
            limit,
            offset,
            order: [['shopifyProductId', 'ASC']]
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