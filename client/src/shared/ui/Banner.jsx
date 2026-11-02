import { createPortal } from 'react-dom'
import './Banner.css'

/**
 * A transient message floated over the page.
 *
 * Two things decide how this is built:
 *
 * It is **portalled to document.body** rather than rendered where it is
 * used. `.panel` declares `container-type: inline-size`, which implies
 * layout containment -- and a contained element becomes the containing block
 * for its fixed-position descendants. A banner rendered inside a panel would
 * pin itself to that panel instead of the viewport.
 *
 * The live region is **always mounted**, with only its contents changing.
 * Screen readers watch a region for mutations; one that appears at the same
 * moment as its text is frequently missed entirely.
 */
export default function Banner({ children, onDismiss, tone = 'accent' }) {
  return createPortal(
    <div className="banner-region" role="status">
      {children && (
        <div className={`banner banner-${tone}`}>
          <div className="banner-body">{children}</div>
          {onDismiss && (
            <button
              type="button"
              className="banner-close"
              onClick={onDismiss}
              aria-label="Dismiss message"
            >
              &times;
            </button>
          )}
        </div>
      )}
    </div>,
    document.body,
  )
}
