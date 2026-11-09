import { User } from '../models/index.js'
import { USER_PUBLIC_ATTRIBUTES } from '../models/User.js'
import { paginationMeta, parsePagination } from '../utils/pagination.js'

export async function getUsers(req, res) {
    try {
        const pagination = parsePagination(req.query)

        if (!pagination) {
            res.status(400).json({
                error: 'Invalid pagination parameters'
            })
        }

        const { page, limit, offset } = pagination

        const { count, rows } = await User.findAndCountAll({
            attributes: USER_PUBLIC_ATTRIBUTES,
            limit,
            offset,
            // Alphabetical for a picker; id breaks ties between same names.
            order: [['lastName', 'ASC'], ['firstName', 'ASC']],
        })

        return res.json({
            data: rows,
            pagination: paginationMeta(page, limit, count)
        })
    } catch (error) {
        console.error('Failed to fetch users: ', error)
        return res.status(500).json({
            error: 'Failed to fetch users'
        })
    }
}