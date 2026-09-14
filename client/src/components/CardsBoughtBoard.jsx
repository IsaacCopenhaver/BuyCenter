import { useId, useMemo } from 'react'

const TOP = 5

function fullName(entry) {
  return [entry.firstName, entry.lastName].filter(Boolean).join(' ') || entry.email || 'Unknown'
}

// Competition ranking: an equal card count shares a rank and the next one skips
// ahead, so two people tied at 2nd are both 2nd and the one after them is 4th.
// Assigning rank by array index would silently break every tie in the buyer's
// favour depending on how Postgres happened to order the rows.
function withRanks(sorted) {
  let rank = 0
  let previous = null

  return sorted.map((entry, i) => {
    if (entry.cards !== previous) {
      rank = i + 1
      previous = entry.cards
    }
    return { ...entry, rank }
  })
}

function plural(n) {
  return n === 1 ? '1 card' : `${n.toLocaleString()} cards`
}

/**
 * Who has bought the most individual cards.
 *
 * `entries` is a [{ id, firstName, lastName, cards }] list -- the shape a join
 * of users against buy line-items returns -- or null for "not loaded yet",
 * which is not the same as "nobody has bought anything".
 *
 * `cards` is a count of individual cards, not of buys: a single buy of a
 * 300-card collection outranks thirty ten-card buys.
 */
export default function CardsBoughtBoard({ entries = null, limit = TOP, highlightId, onSelectBuyer }) {
  const headingId = useId()

  const rows = useMemo(() => {
    if (entries == null) return null
    // Sorted here rather than trusted from the caller, so the ranks are right
    // whatever order the endpoint returns. Slicing after the sort is safe --
    // rank within the top N is rank within the whole list.
    const sorted = [...entries].sort((a, b) => b.cards - a.cards).slice(0, limit)
    return withRanks(sorted)
  }, [entries, limit])

  // Bars are scaled against the leader, so first place always fills the track.
  const leader = rows?.length ? rows[0].cards : 0

  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-head">
        <div>
          <h2 id={headingId}>Cards bought</h2>
          <p className="muted">Ranked by total individual cards</p>
        </div>
      </div>

      {rows == null && <p className="board-empty muted">No card purchases yet</p>}
      {rows != null && rows.length === 0 && (
        <p className="board-empty muted">Nobody has bought a card yet</p>
      )}

      {rows != null && rows.length > 0 && (
        <ol className="board">
          {rows.map((row) => {
            const name = fullName(row)

            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={`board-hit${row.id === highlightId ? ' is-you' : ''}`}
                  aria-label={`Rank ${row.rank}, ${name}, ${plural(row.cards)}`}
                  onClick={onSelectBuyer && (() => onSelectBuyer(row.id))}
                >
                  <span className="board-rank">{row.rank}</span>
                  <span className="board-name">{name}</span>
                  {/* The bar restates the number beside it, so it is decorative
                      -- the rank, name, and count above carry the whole row. */}
                  <span className="board-track" aria-hidden="true">
                    <span
                      className="board-fill"
                      style={{ '--w': `${leader > 0 ? (row.cards / leader) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="board-value">{row.cards.toLocaleString()}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
