import { Op, col, fn, where } from 'sequelize'
import { Customer } from '../models/index.js'
import { CUSTOMER_ATTRIBUTES } from '../models/Customer.js'
import { escapeLike } from '../utils/escapeLike.js'
import { paginationMeta, parsePagination } from '../utils/pagination.js'
import { parseId } from '../utils/parseId.js'

const MAX_Q_LENGTH = 100

// Each word must match at least one field, so "john smith", "smith, john"
// and "john 4567" all find John Smith. Phones compare digits only, so any
// typed format matches any stored format.
function buildSearchWhere(search) {
    const words = search.split(/[\s,]+/).filter(Boolean)

    return {
        [Op.and]: words.map( (word) => {
            const pattern = `%${escapeLike(word)}%`
            const matches = [
                { firstName: { [Op.iLike]: pattern } },
                { lastName: { [Op.iLike]: pattern } },
                { email: { [Op.iLike]: pattern } },
            ]
        
            const digits = word.replace(/\D/g, '')

            if (digits) {
                matches.push(
                    where(
                        fn('regexp_replace', col('phoneNumber'), '[^0-9]', '', 'g'),
                        { [Op.like]: `%${digits}%` }
                    )
                )
            }

            return { [Op.or]: matches }
        }),
    }
}

export async function getCustomers(req, res) {
    try {
        const pagination = parsePagination(req.query)

        if (!pagination) {
            return res.status(400).json({
                error: 'Invalid pagination parameters'
            })
        }

        const q = req.query.q

        if (q !== undefined && typeof q !== 'string') {
            return res.status(400).json({
                error: 'q must be a string'
            })
        }

        const search = q?.trim() ?? ''

        if (search.length > MAX_Q_LENGTH) {
            return res.status(400).json({
                error: `q must be at most ${MAX_Q_LENGTH} characters`,
            })
        }

        const { page, limit, offset } = pagination

        const { count, rows } = await Customer.findAndCountAll({
            attributes: CUSTOMER_ATTRIBUTES,
            limit,
            offset,
            order: [['lastName', 'ASC'], ['firstName', 'ASC'], ['id', 'ASC'],],
            where: search ? buildSearchWhere(search) : {},
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

export async function getCustomer(req, res) {
    try {
        const id = parseId(req.params.id)

        if (!id) {
            return res.status(400).json({
                error: 'Customer ID must be a positive integer'
            })
        }

        const customer = await Customer.findByPk(id, {
            attributes: CUSTOMER_ATTRIBUTES,
        })

        if (!customer) {
            return res.status(404).json({
                error: `Customer ${id} not found`
            })
        }

        return res.json({ customer })
    } catch (error) {
        console.error('Failed to fetch customer:', error)
        return res.status(500).json({
            error: 'Failed to fetch customer'
        })
    }
}