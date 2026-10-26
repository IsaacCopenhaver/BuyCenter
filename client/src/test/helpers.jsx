import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext.jsx'
import { DataProvider } from '@/shared/data/store.jsx'
import ProtectedRoute from '@/features/auth/ProtectedRoute.jsx'

// id 2 deliberately collides with a seeded staff member, which is the real
// situation: the signed-in user replaces the seeded person with the same id,
// and seeded cart 1 is already assigned to them.
export const TEST_USER = {
  id: 2,
  firstName: 'Bryan',
  lastName: 'Kennedy',
  email: 'bryan@laytongaming.com',
}

const json = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

/**
 * AuthProvider calls GET /api/auth/me on mount, so every page behind the
 * guard needs that answered before it will render anything.
 */
export function mockAuth(user = TEST_USER) {
  globalThis.fetch = vi.fn(async (url) => {
    const path = String(url)
    if (path.endsWith('/api/auth/me')) {
      return user ? json(user) : new Response(null, { status: 401 })
    }
    if (path.endsWith('/api/auth/logout')) return new Response(null, { status: 204 })
    return new Response(null, { status: 404 })
  })
}

/**
 * Render one page at a route, inside the providers it expects.
 *
 * `path` is the route pattern so pages reading useParams get them; `route`
 * is the URL actually visited.
 */
export function renderRoute(ui, { path = '/', route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <DataProvider>
          <Routes>
            {/* Nested inside the guard exactly as App.jsx nests it. Pages
                behind it assume a signed-in user and read user.id straight
                out of the context; it is ProtectedRoute that holds them back
                until the session check finishes. Rendering a page without it
                is a composition the app never actually produces. */}
            <Route element={<ProtectedRoute />}>
              <Route path={path} element={ui} />
            </Route>
          </Routes>
        </DataProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}
