import { Customer } from '../models/index.js'
import { CUSTOMER_ATTRIBUTES } from '../models/Customer.js'
import { paginationMeta, parsePagination } from '../utils/pagination.js'

export async function getCustomers(req, res) {
    try {
        const pagination = parsePagination(req.query)

        if (!pagination) {
            return res.status(400).json({
                error: 'Invalid pagination parameters'
            })
        }

        const { page, limit, offset } = pagination

        const { count, rows } = await Customer.findAndCountAll({
            attributes: CUSTOMER_ATTRIBUTES,
            limit,
            offset,
            order: [['lastName', 'ASC'], ['firstName', 'ASC'], ['id', 'ASC'],]

        })

        return res.json({
            data: rows,
            pagination: paginationMeta(page, limit, count)
        })
    } catch (error) {
        console.error('Failed to fetch customers:', error)
        return res.status(500).json({
            error: 'Failed to fetch customers'
        })
    }
}