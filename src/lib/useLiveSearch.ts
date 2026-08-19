import { useEffect, useRef, useState } from 'react'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

// Debounced live search bound to a URL search param (owner, 2026-08-18).
// Typing commits the trimmed value after 250ms; clearing commits undefined.
// The URL stays the source of truth for EXTERNAL changes (back/forward, a
// pasted ?q= link): when q changes to something this hook didn't push, the
// input follows it instead of overwriting the history entry.
export function useLiveSearch(
  q: string | undefined,
  commit: (value: string | undefined) => void,
) {
  const [input, setInput] = useState(q ?? '')
  const debounced = useDebouncedValue(input.trim(), 250)
  const lastPushed = useRef(q ?? '')
  const commitRef = useRef(commit)
  commitRef.current = commit

  useEffect(() => {
    if (debounced === (q ?? '')) {
      lastPushed.current = q ?? ''
      return
    }
    lastPushed.current = debounced
    commitRef.current(debounced || undefined)
    // q is deliberately read fresh each run but not a trigger: the input drives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  useEffect(() => {
    if ((q ?? '') !== lastPushed.current) {
      lastPushed.current = q ?? ''
      setInput(q ?? '')
    }
  }, [q])

  return { input, setInput }
}
