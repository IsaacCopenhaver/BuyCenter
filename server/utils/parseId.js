const MAX_INTEGER = 2147483647

// Optional positive-integer param: undefined when absent or empty, null when
// present but invalid (so the caller can answer 400).
export function parseId(value) {
    if (value === undefined || value === '') { return undefined }
    const id = Number(value)
    return Number.isInteger(id) && id > 0 && id <= MAX_INTEGER ? id : null
}