import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Testing Library does not auto-clean when Vitest globals are on, so an
// un-unmounted tree from one test would still be in the document for the
// next, and every getByRole would find two of everything.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// jsdom implements neither of these, and both are called by the search
// results -- scrollIntoView when focus snaps back after an add, and
// matchMedia by anything asking about the colour scheme.
window.HTMLElement.prototype.scrollIntoView = vi.fn()

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
