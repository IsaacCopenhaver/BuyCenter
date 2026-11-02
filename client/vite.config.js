import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Cross-feature imports go through '@/...' so they do not turn into
    // ../../../ chains that have to be recounted every time a file moves.
    // Imports *within* a feature stay relative, which keeps the boundary
    // visible: a relative path means "my own feature", '@/' means "outside".
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // The browser calls /api/... on :5173 and Vite forwards it to Express.
    // Same-origin, so no CORS setup and the same URLs work in production.
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    // Component tests need a DOM; the pure-logic tests do not care.
    environment: 'jsdom',
    // describe/it/expect without importing them in every file.
    globals: true,
    setupFiles: './src/test/setup.js',
    // Stylesheets are not under test and parsing them only costs time --
    // class names still land on the elements either way.
    css: false,
  },
})
