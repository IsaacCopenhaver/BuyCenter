import { conditionLabel, money, priceGrid } from '@/shared/data/catalog.js'
import './PriceGrid.css'

/**
 * Buy price and on-hand count for every printing and condition of one card.
 *
 * This is the table a buyer reads to find the row and column the card in
 * their hand actually sits in, so each cell is also the fastest way to add
 * that exact combination -- clicking one adds at that printing and condition
 * rather than making them add the default and correct it twice.
 */
function PriceGrid({ card, quantity, onAdd }) {
  const { conditions, rows } = priceGrid(card)

  return (
    <div className="grid-wrap">
      <table className="price-grid">
        <caption className="muted">
          Buy price and on-hand count, by printing and condition
          {onAdd &&
            ` — click a price to add ${quantity > 1 ? `${quantity} of ` : ''}that combination`}
        </caption>
        <thead>
          <tr>
            <th scope="col">Printing</th>
            {conditions.map((condition) => (
              <th key={condition.code} scope="col" title={condition.label}>
                {condition.code === 'GRADED' ? 'Graded' : condition.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.card.shopifyProductId}
              className={row.card.shopifyProductId === card.shopifyProductId ? 'is-current' : ''}
            >
              <th scope="row">{row.card.printing}</th>
              {row.cells.map((cell) => {
                const label = `${row.card.name}, ${row.card.printing}, ${conditionLabel(
                  cell.condition,
                )}: ${money(cell.price)}, ${cell.stock} on hand`

                return (
                  <td key={cell.condition} className={cell.stock === 0 ? 'is-empty' : ''}>
                    {onAdd && cell.price != null ? (
                      <button
                        type="button"
                        className="grid-cell"
                        onClick={() => onAdd(row.card, { condition: cell.condition })}
                        aria-label={`Add ${quantity} — ${label}`}
                      >
                        <span className="grid-price">{money(cell.price)}</span>
                        <span className="grid-stock">{cell.stock}</span>
                      </button>
                    ) : (
                      <span className="grid-cell is-static" aria-label={label}>
                        <span className="grid-price">{money(cell.price)}</span>
                        <span className="grid-stock">{cell.stock}</span>
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PriceGrid
