// Postgres LIKE treats % and _ as wildcards and \ as its escape character.
// Escape all three so a user's input matches literally.
export function escapeLike(value) {
    return value.replace(/[\\%_]/g, '\\$&')
}