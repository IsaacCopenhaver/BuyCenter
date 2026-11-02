const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

export function parsePagination(query) {
    const page = Number(query.page ?? 1)
    const limit = Number(query.limit ?? DEFAULT_LIMIT)

    if (!Number.isInteger(page) || page < 1 ||
        !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
            return null
        }

    return { page, limit, offset: (page - 1) * limit }
}

export function paginationMeta(page, limit, total) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) }
}