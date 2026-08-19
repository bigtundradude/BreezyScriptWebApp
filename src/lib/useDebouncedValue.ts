import { useEffect, useState } from 'react'

// Debounce for live search (owner, 2026-08-18: search filters as you type,
// no explicit submit). 250ms feels instant while typing but skips the
// intermediate keystrokes.
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
