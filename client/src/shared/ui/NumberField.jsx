import { useEffect, useRef, useState } from 'react'

/**
 * A number input that can be empty while you are editing it.
 *
 * Binding an input straight to a coerced store value makes the field
 * impossible to retype: clearing it coerces the empty string back to a
 * number, the box repopulates, and the next digit lands *after* it. Clearing
 * a quantity of 4 and typing 6 gives you 16.
 *
 * So the text is held locally. Each keystroke commits only when it parses to
 * a usable number; an empty or half-typed box commits nothing and leaves the
 * stored value where it was. On blur the text resyncs to whatever the store
 * actually holds, so an abandoned edit tidies itself up.
 *
 * External changes — an undo, a whole-cart retotal — flow back in whenever
 * the field is not being edited.
 */
export default function NumberField({ value, onCommit, min = 0, ...rest }) {
  const [text, setText] = useState(String(value))
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setText(String(value))
  }, [value])

  function change(next) {
    setText(next)
    if (next.trim() === '') return
    const parsed = Number(next)
    if (Number.isFinite(parsed) && parsed >= min) onCommit(parsed)
  }

  return (
    <input
      {...rest}
      type="number"
      min={min}
      value={text}
      onFocus={() => {
        editing.current = true
      }}
      onChange={(e) => change(e.target.value)}
      onBlur={() => {
        editing.current = false
        setText(String(value))
      }}
    />
  )
}
