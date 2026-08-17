import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // The browser calls /api/... on :5173 and Vite forwards it to Express.
    // Same-origin, so no CORS setup and the same URLs work in production.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
