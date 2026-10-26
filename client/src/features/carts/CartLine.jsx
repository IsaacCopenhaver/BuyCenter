import CardImage from '@/shared/ui/CardImage.jsx'
import NumberField from '@/shared/ui/NumberField.jsx'
import {
  CONDITIONS,
  cardById,
  conditionLabel,
  gradeLabel,
  isGraded,
  money,
  priceFor,
  printingsFor,
  setFor,
} from '@/shared/data/catalog.js'
import { lineTotal } from '@/shared/data/store.jsx'
import './CartLine.css'

/**
 * One line of a cart: a card at a printing and condition, with the quantity
 * and the offer actually agreed.
 *
 * `locked` is a completed cart -- a historical record rather than something
 * still being negotiated -- so every control is read-only.
 */
export default function CartLine({ item, cartId, locked, flashed, updateItem, removeItem }) {
  const card = cardById(item.cardId)
  const graded = isGraded(card)
  const suggested = priceFor(card, 'buyPrice', item.condition)
  const printings = printingsFor(card)

  return (
    <li key={item.id} className={`line${flashed ? ' is-flash' : ''}`}>
      {/* Same hover preview as the search rows: this is where a
                buyer checks the line is the card actually in hand. */}
      <span className="thumb">
        <CardImage card={card} width="28" height="39" />
        <span className="thumb-preview" aria-hidden="true">
          <CardImage card={card} width="240" height="336" />
        </span>
      </span>

      <div className="line-main">
        <span className="line-name">
          {card.name}
          {card.collectorNumber && <span className="muted"> · {card.collectorNumber}</span>}
        </span>
        <span className="muted line-meta">
          {setFor(card)?.name}
          {graded && ` · ${gradeLabel(card)}`}
        </span>
      </div>

      <label className="line-control line-printing">
        <span className="muted">Printing</span>
        {/* Each printing is its own catalog row, so switching one
                  repoints the line at a sibling card. A slab's printing
                  is fixed by the grade on it, so graded lines read it
                  back instead of offering a choice. */}
        {graded || printings.length < 2 ? (
          <input type="text" value={card.printing} disabled readOnly />
        ) : (
          <select
            value={card.shopifyProductId}
            disabled={locked}
            onChange={(e) => updateItem(cartId, item.id, { cardId: e.target.value })}
            aria-label={`Printing of ${card.name}`}
          >
            {printings.map((option) => (
              <option key={option.shopifyProductId} value={option.shopifyProductId}>
                {option.printing}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="line-control">
        <span className="muted">Qty</span>
        <NumberField
          min={1}
          // A graded card is one slab with one cert number, so the
          // quantity is not a number anyone gets to pick.
          max={graded ? 1 : undefined}
          value={item.quantity}
          disabled={locked || graded}
          onCommit={(quantity) => updateItem(cartId, item.id, { quantity })}
          aria-label={`Quantity of ${card.name}`}
        />
      </label>

      <label className="line-control line-condition">
        <span className="muted">Condition</span>
        {graded ? (
          <input type="text" value={conditionLabel(item.condition)} disabled readOnly />
        ) : (
          <select
            value={item.condition}
            disabled={locked}
            onChange={(e) => updateItem(cartId, item.id, { condition: e.target.value })}
            aria-label={`Condition of ${card.name}`}
          >
            {CONDITIONS.map((condition) => (
              <option key={condition.code} value={condition.code}>
                {condition.label}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="line-control">
        <span className="muted">Offer</span>
        <NumberField
          min={0}
          step="0.01"
          value={item.offerPrice}
          disabled={locked}
          onCommit={(offerPrice) => updateItem(cartId, item.id, { offerPrice })}
          aria-label={`Offer price for ${card.name}`}
        />
      </label>

      <div className="line-figures">
        <span className="line-total">{money(lineTotal(item))}</span>
        {/* The suggested price is the reference the offer was
                  negotiated against, so it stays visible once the offer
                  moves away from it. */}
        {suggested != null && item.offerPrice !== suggested && (
          <span className="muted">suggested {money(suggested)}</span>
        )}
      </div>

      {!locked && (
        <button
          type="button"
          className="line-remove"
          onClick={() => removeItem(cartId, item.id)}
          aria-label={`Remove ${card.name}`}
        >
          &times;
        </button>
      )}
    </li>
  )
}
