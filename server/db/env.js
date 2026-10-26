import path from 'node:path'
import dotenv from 'dotenv'

// Load the repo-root .env by its location, so the server finds it no matter
// which folder `node` was started from.
dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') })
