import { useId, useMemo, useState } from 'react'

const DAYS = 7

// Local-midnight days, oldest first, ending today. Stepping through setDate on
// a local Date keeps month, year, and DST rollovers correct -- subtracting
// 24h in milliseconds does not.
function lastDays(count, today) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() - (count - 1 - i))
    return day
  })
}

// Buys are bucketed in the viewer's timezone, so the key is the local calendar
// date. toISOString() would shift the day for anyone west of UTC.
function dayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const shortDay = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const longDay = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

// Four bands of a whole number, so every gridline is an integer -- a "2.5 buys"
// tick would be nonsense. Floors the top at 4 so an empty week still has a
// scale to draw instead of collapsing to a single line.
function scaleFor(max) {
  const step = Math.max(1, Math.ceil(Math.max(max, 4) / 4))
  return { top: step * 4, ticks: [4, 3, 2, 1, 0].map((band) => band * step) }
}

function plural(n) {
  return n === 1 ? '1 buy' : `${n} buys`
}

/**
 * Completed buys per day for the past week.
 *
 * `counts` is a { 'YYYY-MM-DD': number } map, or null for "not loaded yet" --
 * which is not the same as a week of zeros, so the empty state says so rather
 * than drawing a flat line the reader would take for real data.
 */
export default function BuysByDayChart({ counts = null, onSelectDay }) {
  const [asTable, setAsTable] = useState(false)
  const headingId = useId()

  const days = useMemo(() => {
    const loaded = counts != null
    return lastDays(DAYS, new Date()).map((date) => {
      const key = dayKey(date)
      // A day the API didn't mention had no completed buys -- that's a real
      // zero. Only an absent `counts` map means "unknown".
      return { key, date, count: loaded ? counts[key] ?? 0 : null }
    })
  }, [counts])

  const max = Math.max(0, ...days.map((day) => day.count ?? 0))
  const scale = scaleFor(max)

  // One direct label, not seven. The peak carries the story; the axis, the
  // hover readout, and the table view carry every other value. When days tie,
  // the most recent one gets the label so only a single number is ever drawn.
  const peakKey = max > 0 ? [...days].reverse().find((day) => day.count === max).key : null

  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-head">
        <div>
          <h2 id={headingId}>Buys completed</h2>
          <p className="muted">Past 7 days</p>
        </div>
        <button type="button" className="panel-toggle" onClick={() => setAsTable((on) => !on)}>
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {asTable ? (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Completed</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.key}>
                <th scope="row">{longDay.format(day.date)}</th>
                <td>{day.count ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="chart">
          {/* Ticks and gridlines are positioned by the same --at fraction, so
              they stay locked together whatever the scale works out to. */}
          <div className="chart-axis" aria-hidden="true">
            {scale.ticks.map((tick) => (
              <span key={tick} className="chart-tick" style={{ '--at': tick / scale.top }}>
                {tick}
              </span>
            ))}
          </div>

          <div className="chart-plot">
            {/* Zero is skipped -- the plot's own bottom border is that line,
                and drawing both stacks two hairlines on the same pixel row. */}
            {scale.ticks
              .filter((tick) => tick > 0)
              .map((tick) => (
                <div
                  key={tick}
                  className="chart-grid"
                  style={{ '--at': tick / scale.top }}
                  aria-hidden="true"
                />
              ))}

            {days.map((day) => {
              const label = `${longDay.format(day.date)}: ${
                day.count == null ? 'no data yet' : plural(day.count)
              }`

              return (
                <button
                  key={day.key}
                  type="button"
                  // The whole column band is the hit target, not just the
                  // painted bar -- a 2-buy bar is only a few pixels tall.
                  className="chart-band"
                  style={{ '--h': `${((day.count ?? 0) / scale.top) * 100}%` }}
                  aria-label={label}
                  onClick={onSelectDay && (() => onSelectDay(day.key))}
                >
                  {day.count > 0 && <span className="chart-col" />}
                  {day.key === peakKey && (
                    <span className="chart-peak" aria-hidden="true">
                      {day.count}
                    </span>
                  )}
                  <span className="chart-tip" aria-hidden="true">
                    <strong>{day.count == null ? '—' : day.count}</strong>
                    {longDay.format(day.date)}
                  </span>
                </button>
              )
            })}

            {counts == null && <p className="chart-empty muted">No buy data yet</p>}
          </div>

          {/* The weekday strip is decorative for screen readers -- each band's
              aria-label already names its day in full. */}
          <div className="chart-days" aria-hidden="true">
            {days.map((day) => (
              <span key={day.key}>{shortDay.format(day.date)}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
