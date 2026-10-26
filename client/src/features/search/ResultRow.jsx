import { useState } from 'react'
import CardImage from '@/shared/ui/CardImage.jsx'
import {
  CONDITIONS,
  conditionLabel,
  defaultCondition,
  gameFor,
  gradeLabel,
  isGraded,
  money,
  priceFor,
  setFor,
  stockFor,
} from '@/shared/data/catalog.js'
import PriceGrid from './PriceGrid.jsx'
import './ResultRow.css'

/**
 * One search result: one card, with its printings behind a picker.
 *
 * Printing, condition and quantity live per row rather than in the parent so
 * that setting up one card never disturbs another.
 *
 * Switching the printing swaps which catalog row this result points at --
 * each printing is a separate product with its own id, prices and art -- so
 * everything below reads off `card`, not off the group.
 */
function ResultRow({ group, onAdd, addLabel, gridOpen, onToggleGrid, justAdded }) {
  const { printings } = group
  const [printingId, setPrintingId] = useState(group.matched.shopifyProductId)
  // Held as text so the field can be empty mid-edit. Coercing on every
  // keystroke snaps an emptied box back to "1", and the next digit typed
  // lands after it -- clearing and typing 3 would add 13.
  const [quantityText, setQuantityText] = useState('1')
  const quantity = Math.max(1, Math.floor(Number(quantityText)) || 1)

  // Falls back to the matched printing if the selected id is somehow absent,
  // so the row can never render against an undefined card.
  const card = printings.find((p) => p.shopifyProductId === printingId) ?? group.matched
  const graded = isGraded(card)
  const [condition, setCondition] = useState(defaultCondition(group.matched))

  const set = setFor(card)
  const game = gameFor(card)
  const buy = priceFor(card, 'buyPrice', condition)
  const market = priceFor(card, 'marketPrice', condition)
  const stock = stockFor(card, condition)

  // A grid cell can name a different printing from this row's -- the grid
  // covers every sibling -- so the card is overridable, not fixed to the row.
  function commit(overrides = {}) {
    const { card: target, ...rest } = overrides
    onAdd(target ?? card, { condition, quantity, ...rest })
    // Back to one, so the next card is not silently added three times.
    setQuantityText('1')
  }

  return (
    <li>
      <div
        className={`result${justAdded ? ' is-added' : ''}`}
        // Double-click anywhere on the row adds it, for buyers who would
        // rather not aim at the button each time.
        onDoubleClick={onAdd ? () => commit() : undefined}
      >
        {/* Hover or keyboard-focus the thumbnail for a readable version. The
            big image is a sibling rather than a child so it can escape the
            row's own bounds. */}
        <span className="thumb" tabIndex={0}>
          <CardImage card={card} width="34" height="48" />
          <span className="thumb-preview" aria-hidden="true">
            <CardImage card={card} width="240" height="336" />
          </span>
        </span>

        <div className="result-main">
          <span className="result-name">
            {card.name}
            {card.collectorNumber && <span className="muted"> · {card.collectorNumber}</span>}
          </span>
          {/* Printing appears here only when there is no picker for it --
              otherwise this would restate the control a few inches right. */}
          <span className="result-meta muted">
            {[game?.name, set?.name, printings.length > 1 ? null : card.printing, card.rarity]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>

        {graded && <span className="badge">{gradeLabel(card)}</span>}

        {/* On hand at the condition currently selected, not across all of
            them -- a NM copy and a HP copy are different things on the shelf,
            and the number is only useful if it tracks the picker. */}
        <span className={`stock${stock === 0 ? ' is-out' : ''}`}>
          {stock === 0 ? 'none on hand' : `${stock} on hand`}
        </span>

        <div className="result-prices">
          <span className="result-buy">{money(buy)}</span>
          <span className="muted">market {money(market)}</span>
        </div>

        {/* Printing and condition are display controls as much as add
            controls -- both drive the price and the on-hand count shown
            above -- so they render on the lookup-only search page too, where
            there is no Add button at all. */}
        {printings.length > 1 && (
          <label className="result-control result-printing">
            <span className="muted">Printing</span>
            <select
              value={card.shopifyProductId}
              onChange={(e) => setPrintingId(e.target.value)}
              aria-label={`Printing of ${card.name}`}
            >
              {printings.map((printing) => (
                <option key={printing.shopifyProductId} value={printing.shopifyProductId}>
                  {printing.printing}
                </option>
              ))}
            </select>
          </label>
        )}

        {!graded && (
          <label className="result-control">
            <span className="muted">Condition</span>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              aria-label={`Condition for ${card.name}`}
            >
              {CONDITIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {onAdd && (
          <label className="result-control">
            <span className="muted">Qty</span>
            <input
              type="number"
              min="1"
              // One slab, one cert number -- there is no second copy of it.
              max={graded ? 1 : undefined}
              value={graded ? 1 : quantityText}
              disabled={graded}
              onChange={(e) => setQuantityText(e.target.value)}
              // Tidy the field up once focus leaves: an empty or nonsense
              // box settles back to the quantity that would actually be used.
              onBlur={() => setQuantityText(String(quantity))}
              aria-label={`Quantity of ${card.name} to add`}
            />
          </label>
        )}

        <button
          type="button"
          className="result-grid-toggle"
          aria-expanded={gridOpen}
          onClick={onToggleGrid}
          aria-label={`${gridOpen ? 'Hide' : 'Show'} stock and prices for ${card.name}`}
        >
          {gridOpen ? 'Hide prices' : 'All prices'}
        </button>

        {onAdd && (
          <button
            type="button"
            className="result-add"
            onClick={() => commit()}
            // Rows that differ only by printing would otherwise give a screen
            // reader several identically-labelled buttons.
            aria-label={[
              `${addLabel} ${quantity} ${card.name}`,
              card.printing,
              graded ? gradeLabel(card) : conditionLabel(condition),
            ]
              .filter(Boolean)
              .join(', ')}
          >
            {addLabel}
            {quantity > 1 ? ` ${quantity}` : ''}
          </button>
        )}
      </div>

      {gridOpen && (
        <PriceGrid
          card={card}
          quantity={quantity}
          onAdd={onAdd ? (printing, options) => commit({ ...options, card: printing }) : null}
        />
      )}
    </li>
  )
}

export default ResultRow
