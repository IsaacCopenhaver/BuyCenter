import AppBar from '../components/AppBar.jsx'
import CardSearch from '../components/CardSearch.jsx'

/**
 * Standalone catalog lookup -- "what is this card worth?" without starting a
 * buy. No `onAdd`, so rows have no Add button: adding happens inside a cart,
 * where there is a cart to add to.
 */
export default function Search() {
  return (
    <main className="app app-wide">
      <AppBar />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Card search</h2>
            <p className="muted">Look up buy and market prices</p>
          </div>
        </div>

        <CardSearch autoFocus />
      </section>

      <p className="hint muted">
        Searching a dummy catalog. This becomes <code>GET /api/cards</code> once the Shopify
        mirror is wired up.
      </p>
    </main>
  )
}
