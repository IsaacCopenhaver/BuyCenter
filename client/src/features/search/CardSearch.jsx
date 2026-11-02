import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  GAMES,
  SETS,
  conditionLabel,
  defaultCondition,
  money,
  priceFor,
  searchResults,
} from '@/shared/data/catalog.js'
import Banner from '@/shared/ui/Banner.jsx'
import CardImage from '@/shared/ui/CardImage.jsx'
import ResultRow from './ResultRow.jsx'
import './CardSearch.css'

const LIMIT = 25
const FEEDBACK_MS = 2600

/**
 * Card search, used both as the standalone search page and inside a cart.
 *
 * Pass `onAdd` to get the add controls on every row -- that is the only
 * difference between the two uses, so the cart and the search page can never
 * drift apart on how a card is found or displayed.
 *
 * Searching is synchronous against the dummy catalog today. When this moves to
 * GET /api/cards the `results` memo becomes a fetch with debounce, and nothing
 * else in this file changes.
 */
export default function CardSearch({ onAdd, autoFocus = false, addLabel = 'Add' }) {
  const [query, setQuery] = useState('')
  const [gameId, setGameId] = useState('')
  const [setId, setSetId] = useState('')
  const [type, setType] = useState('')
  const [openGrid, setOpenGrid] = useState(null)
  const [added, setAdded] = useState(null)
  const searchId = useId()
  const inputRef = useRef(null)

  // Narrow the set list to the chosen game, so the picker can't offer a
  // combination that returns nothing by construction.
  const setsForGame = useMemo(
    () => (gameId ? SETS.filter((s) => s.gameId === Number(gameId)) : SETS),
    [gameId],
  )

  const results = useMemo(
    () => searchResults(query, { gameId, setId, type }),
    [query, gameId, setId, type],
  )

  // The confirmation clears itself; without the timer it would sit there
  // claiming the last card was "just added" minutes later.
  useEffect(() => {
    if (!added) return undefined
    const timer = setTimeout(() => setAdded(null), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [added])

  const shown = results.slice(0, LIMIT)
  const searching = query.trim().length > 0

  function changeGame(next) {
    setGameId(next)
    // A set from the old game would filter everything out silently.
    setSetId('')
  }

  // `options` carries the printing (as the card), condition and quantity the
  // row or grid cell was set to. Every add path funnels through here so the
  // confirmation and the focus return behave identically whichever was used.
  function add(card, options = {}) {
    const condition = options.condition ?? defaultCondition(card)
    const quantity = options.quantity ?? 1
    onAdd(card, { condition, quantity })
    setAdded({ card, condition, quantity, at: Date.now() })

    // Snap back to the search box with the query selected, so the next card
    // is one keystroke away. A buyer works through a stack of cards without
    // ever reaching for the mouse between them.
    const input = inputRef.current
    if (input) {
      input.focus()
      input.select()
      input.scrollIntoView({ block: 'nearest' })
    }
  }

  return (
    <div className="search">
      <div className="search-controls">
        <label className="search-field">
          <span className="muted">Search cards</span>
          <input
            id={searchId}
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, number, set, printing, or cert number"
            autoFocus={autoFocus}
            autoComplete="off"
          />
        </label>

        <div className="search-filters">
          <label>
            <span className="muted">Game</span>
            <select value={gameId} onChange={(e) => changeGame(e.target.value)}>
              <option value="">All games</option>
              {GAMES.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="muted">Set</span>
            <select value={setId} onChange={(e) => setSetId(e.target.value)}>
              <option value="">All sets</option>
              {setsForGame.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="muted">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Raw and graded</option>
              <option value="raw">Raw only</option>
              <option value="graded">Graded only</option>
            </select>
          </label>
        </div>
      </div>

      {/* Both messages share one live region. A screen reader hears the result
          count as the query is typed, and the add confirmation the moment a
          card goes in -- the two never collide because an add always replaces
          the count. */}
      {/* Just the count now. The add confirmation moved to the banner, which
          is the live region that announces it -- leaving it here too would
          have a screen reader read every add twice. */}
      <p className="search-count muted">
        {!searching
          ? 'Type to search the catalog.'
          : results.length === 0
            ? 'No cards match.'
            : `${results.length} card${results.length === 1 ? '' : 's'}${
                results.length > LIMIT ? ` — showing the first ${LIMIT}` : ''
              }`}
      </p>

      <Banner onDismiss={added ? () => setAdded(null) : undefined}>
        {added && (
          <>
            {added.quantity > 1 && <span className="banner-count">{added.quantity}</span>}
            <span className="banner-thumb">
              <CardImage card={added.card} width="26" height="36" />
            </span>
            <span className="banner-text">
              <span className="banner-title">
                Added {added.card.name}
                {added.quantity > 1 && ` ×${added.quantity}`}
              </span>
              <span className="banner-meta">
                {added.card.printing} · {conditionLabel(added.condition)} ·{' '}
                {money(priceFor(added.card, 'buyPrice', added.condition))} each
              </span>
            </span>
          </>
        )}
      </Banner>

      {shown.length > 0 && (
        <ul className="results">
          {shown.map((group) => (
            <ResultRow
              // The matched printing is part of the key, not just the card,
              // so narrowing a query from "sha" to "shadowless" remounts the
              // row and opens it on the printing that now matches. Keyed on
              // the card alone, the row would keep whatever printing it first
              // mounted with and quietly ignore the better match.
              key={`${group.key}|${group.matched.shopifyProductId}`}
              group={group}
              addLabel={addLabel}
              onAdd={onAdd ? add : null}
              gridOpen={openGrid === group.key}
              onToggleGrid={() => setOpenGrid(openGrid === group.key ? null : group.key)}
              justAdded={group.printings.some(
                (p) => p.shopifyProductId === added?.card.shopifyProductId,
              )}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
