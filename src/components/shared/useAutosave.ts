import { useCallback, useEffect, useRef, useState } from 'react'

// Ported autosave doctrine: patch() applies locally (caller's job) and debounces
// a persist (700 ms); flush() writes immediately; failed writes merge the
// pending patch back so the next flush retries — no silent loss.
// Saves are SERIALIZED: a flush awaits any in-flight save first, so a failed
// older save can never merge a stale value back over a newer successful one.
export function useAutosave<T extends object>(
  save: (patch: Partial<T>) => Promise<void>,
  delay = 700,
) {
  const pending = useRef<Partial<T>>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)
  const saveRef = useRef(save)
  saveRef.current = save
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    // Serialize behind any in-flight save; its failure merge-back lands in
    // `pending` before we read it, so retries always carry the newest values.
    while (inFlight.current) await inFlight.current

    const patchToSave = pending.current
    if (Object.keys(patchToSave).length === 0) return
    pending.current = {}
    setStatus('saving')
    const job = saveRef.current(patchToSave).then(
      () => {
        setStatus('idle')
      },
      () => {
        // Merge back under anything typed since, so the retry keeps newest values.
        pending.current = { ...patchToSave, ...pending.current }
        setStatus('error')
      },
    )
    inFlight.current = job
    await job
    inFlight.current = null
  }, [])

  const patch = useCallback(
    (p: Partial<T>) => {
      pending.current = { ...pending.current, ...p }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), delay)
    },
    [flush, delay],
  )

  // Flush on unmount and on tab-hide.
  useEffect(() => {
    const onHide = () => void flush()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      void flush()
    }
  }, [flush])

  const hasPending = () => Object.keys(pending.current).length > 0

  return { patch, flush, status, hasPending }
}
