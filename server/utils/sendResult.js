// Sends a { status, body } result built inside a transaction. No body means
// an empty response (204 No Content).
export function sendResult(res, { status, body }) {
    if (body === undefined) {
        return res.status(status).end()
    }

    return res.status(status).json(body)
}