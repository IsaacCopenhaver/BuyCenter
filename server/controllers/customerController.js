import { Op, col, fn, where } from 'sequelize'
import { Customer } from '../models/index.js'
import { CUSTOMER_ATTRIBUTES } from '../models/Customer.js'
import { escapeLike } from '../utils/escapeLike.js'
import { paginationMeta, parsePagination } from '../utils/pagination.js'
import { parseId } from '../utils/parseId.js'

const MAX_Q_LENGTH = 100
const NEW_CUSTOMER_FIELDS = ['firstName', 'lastName', 'phoneNumber', 'email']
const MAX_TEXT_LENGTH = 255
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[\d\s()+.-]+$/

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

// Rules for staff-created customers. Shopify-synced records will get their
// own, looser rules (Shopify allows customers without names).
function parseNewCustomer(body) {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return { error: 'Request body must be a JSON object' }
    }

    const unknownFields = Object.keys(body)
        .filter((key) => !NEW_CUSTOMER_FIELDS.includes(key))

    if (unknownFields.length > 0) {
        return { error: `Unknown fields: ${unknownFields.join(', ')}` }
    }

    const values = {}

    for (const field of NEW_CUSTOMER_FIELDS) {
        const value = body[field]

        if (value !== undefined && value !== null && typeof value !== 'string') {
            return { error: `${field} must be a string` }
        }

        const trimmed = value?.trim() ?? ''

        if (trimmed.length > MAX_TEXT_LENGTH) {
            return { error: `${field} must be at most ${MAX_TEXT_LENGTH} characters` }
        }

        values[field] = trimmed || null
    }

    if (!values.firstName || !values.lastName) {
        return { error: 'firstName and lastName are required' }
    }

    if (!values.phoneNumber && !values.email) {
        return { error: 'A phone number or an email is required' }
    }

    if (values.email) {
        if (!EMAIL_PATTERN.test(values.email)) {
            return { error: 'email must be a valid email address' }
        }
        values.email = values.email.toLowerCase()
    }

    if (values.phoneNumber) {
        const digits = values.phoneNumber.replace(/\D/g, '')

        if (!PHONE_PATTERN.test(values.phoneNumber) ||
            digits.length < 7 || digits.length > 15) {
            return { error: 'phoneNumber must have 7 to 15 digits and only digits, spaces, or + ( ) . -' }
        }
    }

    return { values }
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

export async function createCustomer(req, res) {
    try {
        const { error, values } = parseNewCustomer(req.body)

        if (error) {
            return res.status(400).json({ error })
        }

        const created = await Customer.create(values)

        // create() returns every column; respond with the public shape only.
        const customer = Object.fromEntries(
            CUSTOMER_ATTRIBUTES.map((key) => [key, created.get(key)])
        )

        return res.status(201).json({ customer })
    } catch (error) {
        console.error('Failed to create customer:', error)
        return res.status(500).json({
            error: 'Failed to create customer'
        })
    }
} 