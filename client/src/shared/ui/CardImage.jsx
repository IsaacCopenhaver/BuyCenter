import { useState } from 'react'
import { imageFor, placeholderFor } from '@/shared/data/catalog.js'
import './CardImage.css'

/**
 * Card art, with a generated placeholder standing in when the real scan
 * cannot be fetched.
 *
 * Scans come from the TCGPlayer CDN keyed on `tcgProductId`. Any given id can
 * be missing, wrong, or simply not have art on the CDN, and a broken-image
 * icon in a row of cards reads as a bug. The placeholder is a data URI, so
 * the fallback itself can never fail.
 *
 * Decorative by default: every row already names the card in text, so an alt
 * string here would make a screen reader read each one twice. Pass `alt` for
 * the cases where the image is the only identification.
 */
export default function CardImage({ card, width, height, className, alt = '' }) {
  // Keyed by card, so scrolling a new card into the same row re-tries the
  // real scan instead of inheriting the previous card's failure.
  const [failedFor, setFailedFor] = useState(null)
  const failed = failedFor === card.shopifyProductId

  return (
    <img
      className={className}
      src={failed ? placeholderFor(card) : imageFor(card)}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      onError={() => setFailedFor(card.shopifyProductId)}
    />
  )
}
