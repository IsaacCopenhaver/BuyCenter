import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import Cart from '@/features/carts/CartPage.jsx'
import NewCart from '@/features/carts/NewCartPage.jsx'
import { mockAuth, renderRoute } from './helpers.jsx'

// Seeded cart 1: a Charizard at LP ($205) and four Pikachu at NM ($9) = $241.
async function openCart(id = 1) {
  const user = userEvent.setup()
  renderRoute(<Cart />, { path: '/app/carts/:id', route: `/app/carts/${id}` })
  // Everything waits on GET /api/auth/me resolving.
  await screen.findByRole('heading', { name: /dana whitfield/i })
  return { user }
}

const lines = () => screen.getAllByRole('listitem').filter((li) => li.querySelector('.line-name'))
const totalText = () => document.querySelector('.cart-total').textContent

beforeEach(() => {
  mockAuth()
})

describe('cart contents', () => {
  it('shows the seeded lines and their total', async () => {
    await openCart()
    expect(lines()).toHaveLength(2)
    expect(totalText()).toBe('$241.00')
  })

  it('reprices a line when its condition changes', async () => {
    const { user } = await openCart()
    await user.selectOptions(screen.getByLabelText(/condition of charizard/i), 'NM')
    // The offer was still at the LP suggested price, so it follows to NM.
    await waitFor(() => expect(totalText()).toBe('$296.00'))
  })

  it('keeps a hand-typed offer when the condition changes', async () => {
    const { user } = await openCart()
    const offer = screen.getByLabelText(/offer price for charizard/i)
    await user.clear(offer)
    await user.type(offer, '150')
    await user.selectOptions(screen.getByLabelText(/condition of charizard/i), 'NM')
    expect(offer).toHaveValue(150)
  })

  it('removes a line', async () => {
    const { user } = await openCart()
    await user.click(screen.getByRole('button', { name: /remove charizard/i }))
    expect(lines()).toHaveLength(1)
  })
})

describe('adding from the in-cart search', () => {
  it('adds a searched card as a new line at the suggested price', async () => {
    const { user } = await openCart()
    await user.type(screen.getByRole('searchbox'), 'haywire')
    await user.click(screen.getByRole('button', { name: /^add 1 haywire mite/i }))

    await waitFor(() => expect(lines()).toHaveLength(3))
    expect(totalText()).toBe('$244.10') // 241.00 + 3.10
  })

  it('stacks onto the existing line rather than opening a second one', async () => {
    const { user } = await openCart()
    await user.type(screen.getByRole('searchbox'), 'pikachu')
    await user.click(screen.getByRole('button', { name: /^add 1 pikachu/i }))

    // Still two lines; the Pikachu line went from 4 to 5.
    await waitFor(() => expect(totalText()).toBe('$250.00'))
    expect(lines()).toHaveLength(2)
  })

  it('adds several at once', async () => {
    const { user } = await openCart()
    await user.type(screen.getByRole('searchbox'), 'haywire')
    const qty = screen.getByLabelText(/quantity of haywire mite/i)
    await user.clear(qty)
    await user.type(qty, '4')
    await user.click(screen.getByRole('button', { name: /^add 4 haywire mite/i }))

    await waitFor(() => expect(totalText()).toBe('$253.40')) // 241 + 4 x 3.10
  })
})

describe('re-pricing the whole cart', () => {
  it('spreads a new total weighted by what each line is worth', async () => {
    const { user } = await openCart()
    // $241 -> $482 is exactly double, so every offer should double.
    await user.type(screen.getByLabelText(/new total for the whole cart/i), '482')
    await user.click(screen.getByRole('button', { name: /spread across/i }))

    await waitFor(() => expect(totalText()).toBe('$482.00'))
    expect(screen.getByLabelText(/offer price for charizard/i)).toHaveValue(410)
    expect(screen.getByLabelText(/offer price for pikachu/i)).toHaveValue(18)
  })

  it('says so when a total cannot be hit exactly', async () => {
    const { user } = await openCart()
    // Drop the Charizard and only the four Pikachu remain, at $9 each. One
    // line of four can only make totals that are multiples of four cents, so
    // $36.01 is genuinely out of reach. (With the Charizard still there, its
    // quantity of one would let the cart hit any figure at all.)
    await user.click(screen.getByRole('button', { name: /remove charizard/i }))
    await waitFor(() => expect(totalText()).toBe('$36.00'))

    await user.type(screen.getByLabelText(/new total for the whole cart/i), '36.01')
    await user.click(screen.getByRole('button', { name: /spread across/i }))

    expect(await screen.findByText(/closest reachable total/i)).toBeInTheDocument()
    expect(totalText()).toBe('$36.00')
  })
})

describe('undo', () => {
  it('is unavailable until a price actually changes', async () => {
    await openCart()
    expect(screen.getByRole('button', { name: /undo price change/i })).toBeDisabled()
  })

  it('steps back a retotal', async () => {
    const { user } = await openCart()
    await user.type(screen.getByLabelText(/new total for the whole cart/i), '482')
    await user.click(screen.getByRole('button', { name: /spread across/i }))
    await waitFor(() => expect(totalText()).toBe('$482.00'))

    await user.click(screen.getByRole('button', { name: /undo price change/i }))
    await waitFor(() => expect(totalText()).toBe('$241.00'))
  })

  it('leaves a quantity typed after the price change alone', async () => {
    const { user } = await openCart()
    await user.type(screen.getByLabelText(/new total for the whole cart/i), '482')
    await user.click(screen.getByRole('button', { name: /spread across/i }))

    const qty = screen.getByLabelText(/quantity of pikachu/i)
    await user.clear(qty)
    await user.type(qty, '6')
    await user.click(screen.getByRole('button', { name: /undo price change/i }))

    expect(screen.getByLabelText(/quantity of pikachu/i)).toHaveValue(6)
    expect(screen.getByLabelText(/offer price for pikachu/i)).toHaveValue(9)
  })
})

describe('completing a buy', () => {
  it('blocks checkout until the allocation adds up', async () => {
    const { user } = await openCart()
    const complete = screen.getByRole('button', { name: /complete buy/i })
    expect(complete).toBeDisabled()
    expect(screen.getByText(/still to allocate/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/amount paid by cash/i), '241')
    await waitFor(() => expect(complete).toBeEnabled())
  })

  it('flags an allocation that overshoots the cart', async () => {
    const { user } = await openCart()
    await user.type(screen.getByLabelText(/amount paid by cash/i), '300')
    expect(await screen.findByText(/over the cart total/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete buy/i })).toBeDisabled()
  })

  it('grosses up only the store credit portion', async () => {
    const { user } = await openCart()
    await user.type(screen.getByLabelText(/amount paid by check/i), '141')
    await user.type(screen.getByLabelText(/amount paid by store credit/i), '100')

    // $100 of credit becomes $115, so the customer receives 141 + 115 = $256.
    expect(await screen.findByText(/\$115\.00/)).toBeInTheDocument()
    expect(screen.getByText('$256.00')).toBeInTheDocument()
  })

  it('closes the cart and records the split', async () => {
    const { user } = await openCart()
    await user.type(screen.getByLabelText(/amount paid by check/i), '141')
    await user.type(screen.getByLabelText(/amount paid by store credit/i), '100')
    await user.click(screen.getByRole('button', { name: /complete buy/i }))

    expect(await screen.findByRole('heading', { name: /transaction/i })).toBeInTheDocument()
    expect(screen.getByText(/completed .* by /i)).toBeInTheDocument()
    // A completed cart is a record, not an editable cart.
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})

describe('a completed cart', () => {
  it('is read-only and shows what was paid', async () => {
    const user = userEvent.setup()
    renderRoute(<Cart />, { path: '/app/carts/:id', route: '/app/carts/3' })
    await screen.findByRole('heading', { name: /marcus reyes/i })

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete buy/i })).not.toBeInTheDocument()
    expect(user).toBeTruthy()
  })
})

describe('starting a cart', () => {
  async function openNewCart() {
    const user = userEvent.setup()
    renderRoute(<NewCart />, { path: '/app/carts/new', route: '/app/carts/new' })
    await screen.findByRole('heading', { name: /new cart/i })
    return { user }
  }

  it('requires a customer', async () => {
    const { user } = await openNewCart()
    await user.click(screen.getByRole('button', { name: /create cart/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/pick a customer/i)
  })

  it('pre-assigns the signed-in buyer', async () => {
    await openNewCart()
    expect(screen.getByRole('checkbox', { name: /bryan kennedy \(you\)/i })).toBeChecked()
  })

  it('needs a name on a new customer', async () => {
    const { user } = await openNewCart()
    await user.click(screen.getByRole('button', { name: /new customer/i }))
    await user.click(screen.getByRole('button', { name: /save customer/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/first and last name/i)
  })

  it('needs a phone or an email on a new customer', async () => {
    const { user } = await openNewCart()
    await user.click(screen.getByRole('button', { name: /new customer/i }))
    await user.type(screen.getByLabelText(/first name/i), 'Ada')
    await user.type(screen.getByLabelText(/last name/i), 'Lovelace')
    await user.click(screen.getByRole('button', { name: /save customer/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/phone number or an email/i)
  })

  it('accepts a new customer with only an email, and selects them', async () => {
    const { user } = await openNewCart()
    await user.click(screen.getByRole('button', { name: /new customer/i }))
    await user.type(screen.getByLabelText(/first name/i), 'Ada')
    await user.type(screen.getByLabelText(/last name/i), 'Lovelace')
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: /save customer/i }))

    const picker = screen.getByLabelText('Customer')
    await waitFor(() =>
      expect(within(picker).getByRole('option', { name: /ada lovelace/i }).selected).toBe(true),
    )
  })
})

describe('page shell', () => {
  // The bar used to render inside <main>, which left a band of page
  // background above it and forced a full-bleed break-out using vw -- and vw
  // counts the scrollbar, so every page scrolled sideways by its width.
  it('renders the app bar as a sibling of main, not inside it', async () => {
    renderRoute(<Cart />, { path: '/app/carts/:id', route: '/app/carts/1' })
    await screen.findByRole('heading', { name: /dana whitfield/i })

    const bar = document.querySelector('.app-bar')
    const main = document.querySelector('main')
    expect(bar).toBeInTheDocument()
    expect(main).toBeInTheDocument()
    expect(main.contains(bar)).toBe(false)
    expect(bar.parentElement).toBe(main.parentElement)
  })

  it('keeps exactly one h1 on the page', async () => {
    renderRoute(<Cart />, { path: '/app/carts/:id', route: '/app/carts/1' })
    await screen.findByRole('heading', { name: /dana whitfield/i })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
