import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CardSearch from '@/features/search/CardSearch.jsx'

// CardSearch reads only the catalog, so it needs no providers.
function setup({ onAdd } = {}) {
  const user = userEvent.setup()
  render(<CardSearch onAdd={onAdd} />)
  return { user, input: screen.getByRole('searchbox') }
}

const rows = () => screen.queryAllByRole('listitem')

describe('search results', () => {
  it('shows nothing until something is typed', () => {
    setup()
    expect(screen.getByText(/type to search/i)).toBeInTheDocument()
    expect(rows()).toHaveLength(0)
  })

  it('collapses printings into one result per card', async () => {
    const { user, input } = setup()
    await user.type(input, 'charizard')
    // Three raw printings group into one row; the slab stays separate.
    expect(rows()).toHaveLength(2)
  })

  it('offers every printing of the grouped card', async () => {
    const { user, input } = setup()
    await user.type(input, 'charizard')
    const picker = screen.getByLabelText(/printing of charizard/i)
    expect(
      within(picker)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['1st Edition Holofoil', 'Shadowless Holofoil', 'Holofoil'])
  })

  it('reprices when the printing changes', async () => {
    const { user, input } = setup()
    await user.type(input, 'charizard')
    expect(screen.getByText('$260.00')).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/printing of charizard/i),
      screen.getByRole('option', { name: '1st Edition Holofoil' }),
    )
    expect(screen.getByText('$4,800.00')).toBeInTheDocument()
  })

  it('reprices when the condition changes', async () => {
    const { user, input } = setup()
    await user.type(input, 'haywire')
    expect(screen.getByText('$3.10')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/condition for haywire mite/i), 'LP')
    expect(screen.getByText('$2.45')).toBeInTheDocument()
  })

  it('finds a card by its cert number', async () => {
    const { user, input } = setup()
    await user.type(input, 'BGS-0019244')
    expect(rows()).toHaveLength(1)
    expect(screen.getByText(/umbreon vmax/i)).toBeInTheDocument()
  })

  it('opens on the printing the query matched', async () => {
    const { user, input } = setup()
    await user.type(input, 'shadowless')
    expect(screen.getByLabelText(/printing of charizard/i)).toHaveValue(
      'gid://shopify/Product/8841012',
    )
  })

  it('filters to graded only', async () => {
    const { user, input } = setup()
    await user.type(input, 'charizard')
    await user.selectOptions(screen.getByLabelText('Type'), 'graded')
    expect(rows()).toHaveLength(1)
    expect(screen.getByText('PSA 9')).toBeInTheDocument()
  })

  it('shows on-hand for the selected condition', async () => {
    const { user, input } = setup()
    await user.type(input, 'haywire')
    expect(screen.getByText(/on hand|none on hand/)).toBeInTheDocument()
  })
})

describe('adding to a cart', () => {
  it('adds one at the shown printing and condition', async () => {
    const onAdd = vi.fn()
    const { user, input } = setup({ onAdd })
    await user.type(input, 'haywire')
    await user.click(screen.getByRole('button', { name: /^add 1 haywire mite/i }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    const [card, options] = onAdd.mock.calls[0]
    expect(card.name).toBe('Haywire Mite')
    expect(options).toMatchObject({ condition: 'NM', quantity: 1 })
  })

  it('adds the quantity that was typed', async () => {
    const onAdd = vi.fn()
    const { user, input } = setup({ onAdd })
    await user.type(input, 'haywire')

    const qty = screen.getByLabelText(/quantity of haywire mite/i)
    await user.clear(qty)
    await user.type(qty, '4')
    await user.click(screen.getByRole('button', { name: /^add 4 haywire mite/i }))

    expect(onAdd.mock.calls[0][1]).toMatchObject({ quantity: 4 })
  })

  it('resets the quantity after adding, so the next card is not multiplied', async () => {
    const onAdd = vi.fn()
    const { user, input } = setup({ onAdd })
    await user.type(input, 'haywire')

    const qty = screen.getByLabelText(/quantity of haywire mite/i)
    await user.clear(qty)
    await user.type(qty, '3')
    await user.click(screen.getByRole('button', { name: /^add 3 haywire mite/i }))

    expect(screen.getByLabelText(/quantity of haywire mite/i)).toHaveValue(1)
  })

  it('adds the chosen condition', async () => {
    const onAdd = vi.fn()
    const { user, input } = setup({ onAdd })
    await user.type(input, 'haywire')
    await user.selectOptions(screen.getByLabelText(/condition for haywire mite/i), 'MP')
    await user.click(screen.getByRole('button', { name: /^add 1 haywire mite/i }))

    expect(onAdd.mock.calls[0][1]).toMatchObject({ condition: 'MP' })
  })

  it('adds on a double-click anywhere on the row', async () => {
    const onAdd = vi.fn()
    const { user, input } = setup({ onAdd })
    await user.type(input, 'haywire')
    await user.dblClick(screen.getByText('Haywire Mite'))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('confirms what went in', async () => {
    const onAdd = vi.fn()
    const { user, input } = setup({ onAdd })
    await user.type(input, 'haywire')
    await user.click(screen.getByRole('button', { name: /^add 1 haywire mite/i }))
    expect(screen.getByRole('status')).toHaveTextContent(/added/i)
    expect(screen.getByRole('status')).toHaveTextContent(/haywire mite/i)
  })

  it('returns focus to the search box so the next card is one keystroke away', async () => {
    const onAdd = vi.fn()
    const { user, input } = setup({ onAdd })
    await user.type(input, 'haywire')
    await user.click(screen.getByRole('button', { name: /^add 1 haywire mite/i }))
    expect(input).toHaveFocus()
  })

  it('shows no add controls when there is no cart to add to', async () => {
    const { user, input } = setup()
    await user.type(input, 'haywire')
    expect(screen.queryByRole('button', { name: /^add/i })).not.toBeInTheDocument()
    // but the display controls that drive the price are still there
    expect(screen.getByLabelText(/condition for haywire mite/i)).toBeInTheDocument()
  })
})

describe('the printing x condition grid', () => {
  it('opens and closes', async () => {
    const { user, input } = setup()
    await user.type(input, 'haywire')
    await user.click(screen.getByRole('button', { name: /show stock and prices/i }))
    expect(screen.getByRole('table')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /hide stock and prices/i }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('lists a row per printing and a column per condition', async () => {
    const { user, input } = setup()
    await user.type(input, 'charizard')
    await user.click(
      screen.getAllByRole('button', { name: /show stock and prices for charizard/i })[0],
    )
    const table = screen.getByRole('table')
    // header row + three printings
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getAllByRole('columnheader')).toHaveLength(6)
  })

  it('adds the exact printing and condition of the cell clicked', async () => {
    const onAdd = vi.fn()
    const { user, input } = setup({ onAdd })
    await user.type(input, 'charizard')
    await user.click(
      screen.getAllByRole('button', { name: /show stock and prices for charizard/i })[0],
    )
    await user.click(
      screen.getByRole('button', {
        name: /add 1 — charizard, shadowless holofoil, lightly played/i,
      }),
    )

    const [card, options] = onAdd.mock.calls[0]
    expect(card.printing).toBe('Shadowless Holofoil')
    expect(options).toMatchObject({ condition: 'LP' })
  })
})

describe('the add banner', () => {
  it('is an empty live region until something is added', () => {
    setup({ onAdd: vi.fn() })
    // Mounted from the start so a screen reader is already watching it; a
    // region that appears with its text is frequently missed.
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(document.querySelector('.banner')).not.toBeInTheDocument()
  })

  it('names the card, printing, condition and price', async () => {
    const { user, input } = setup({ onAdd: vi.fn() })
    await user.type(input, 'haywire')
    await user.click(screen.getByRole('button', { name: /^add 1 haywire mite/i }))

    const banner = document.querySelector('.banner')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveTextContent(/added haywire mite/i)
    expect(banner).toHaveTextContent(/normal/i)
    expect(banner).toHaveTextContent(/near mint/i)
    expect(banner).toHaveTextContent('$3.10')
  })

  it('shows the quantity when more than one went in', async () => {
    const { user, input } = setup({ onAdd: vi.fn() })
    await user.type(input, 'haywire')
    const qty = screen.getByLabelText(/quantity of haywire mite/i)
    await user.clear(qty)
    await user.type(qty, '3')
    await user.click(screen.getByRole('button', { name: /^add 3 haywire mite/i }))

    expect(document.querySelector('.banner-count')).toHaveTextContent('3')
    expect(document.querySelector('.banner')).toHaveTextContent(/haywire mite ×3/i)
  })

  it('can be dismissed', async () => {
    const { user, input } = setup({ onAdd: vi.fn() })
    await user.type(input, 'haywire')
    await user.click(screen.getByRole('button', { name: /^add 1 haywire mite/i }))
    await user.click(screen.getByRole('button', { name: /dismiss message/i }))
    expect(document.querySelector('.banner')).not.toBeInTheDocument()
  })

  it('escapes the panel it was rendered inside', async () => {
    const { user, input } = setup({ onAdd: vi.fn() })
    await user.type(input, 'haywire')
    await user.click(screen.getByRole('button', { name: /^add 1 haywire mite/i }))

    // .panel sets container-type, which makes it the containing block for
    // fixed descendants -- so the banner has to be portalled out of it.
    const banner = document.querySelector('.banner-region')
    expect(banner.parentElement).toBe(document.body)
  })
})
