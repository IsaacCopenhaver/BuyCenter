import { useId, useMemo, useState } from 'react'
import {
  GAMES,
  SETS,
  gameFor,
  gradeLabel,
  isGraded,
  money,
  priceFor,
  searchCards,
  setFor,
} from '../data/catalog.js'

const LIMIT = 25

/**
 * Card search, used both as the standalone search page and inside a cart.
 *
 * Pass `onAdd` to get an Add button on every row -- that is the only
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
  const searchId = useId()

  // Narrow the set list to the chosen game, so the picker can't offer a
  // combination that returns nothing by construction.
  const setsForGame = useMemo(
    () => (gameId ? SETS.filter((s) => s.gameId === Number(gameId)) : SETS),
    [gameId],
  )

  const results = useMemo(
    () => searchCards(query, { gameId, setId, type }),
    [query, gameId, setId, type],
  )

  const shown = results.slice(0, LIMIT)
  const searching = query.trim().length > 0

  function changeGame(next) {
    setGameId(next)
    // A set from the old game would filter everything out silently.
    setSetId('')
  }

  return (
    <div className="search">
      <div className="search-controls">
        <label className="search-field">
          <span className="muted">Search cards</span>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, number, set, or cert number"
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

      {/* Announced politely so a screen reader hears the count change as the
          query is typed, without interrupting the typing itself. */}
      <p className="search-count muted" role="status">
        {!searching
          ? 'Type to search the catalog.'
          : results.length === 0
            ? 'No cards match.'
            : `${results.length} card${results.length === 1 ? '' : 's'}${
                results.length > LIMIT ? ` — showing the first ${LIMIT}` : ''
              }`}
      </p>

      {shown.length > 0 && (
        <ul className="results">
          {shown.map((card) => {
            const set = setFor(card)
            const game = gameFor(card)
            const graded = isGraded(card)
            const buy = priceFor(card, 'buyPrice')
            const market = priceFor(card, 'marketPrice')

            return (
              <li key={card.shopifyProductId} className="result">
                <div className="result-main">
                  <span className="result-name">
                    {card.name}
                    {card.collectorNumber && (
                      <span className="muted"> · {card.collectorNumber}</span>
                    )}
                  </span>
                  <span className="result-meta muted">
                    {[game?.name, set?.name, card.rarity].filter(Boolean).join(' · ')}
                  </span>
                </div>

                {/* Graded is the one distinction that changes how the card is
                    bought, so it gets a badge rather than a column. */}
                {graded && <span className="badge">{gradeLabel(card)}</span>}

                <div className="result-prices">
                  <span className="result-buy">{money(buy)}</span>
                  <span className="muted">market {money(market)}</span>
                </div>

                {onAdd && (
                  <button
                    type="button"
                    className="result-add"
                    onClick={() => onAdd(card)}
                    aria-label={`${addLabel} ${card.name}${graded ? `, ${gradeLabel(card)}` : ''}`}
                  >
                    {addLabel}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
