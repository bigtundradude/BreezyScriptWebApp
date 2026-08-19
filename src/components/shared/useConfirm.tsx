import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui'

// Promise-based confirm modal, ported: `if (!(await confirm({...}))) return`.
export function useConfirm() {
  const [state, setState] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: 'danger' | 'primary'
  } | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  // A second confirm while one is pending settles the first as false —
  // never leak an unresolved promise (its caller would hang forever).
  const confirm = useCallback(
    (opts: { title: string; message: string; confirmLabel?: string; variant?: 'danger' | 'primary' }) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false)
        resolver.current = resolve
        setState({
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? 'Confirm',
          variant: opts.variant ?? 'danger',
        })
      }),
    [],
  )

  const settle = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setState(null)
  }

  // Unmount with a pending confirm: settle false so the awaiting caller returns.
  useEffect(() => () => resolver.current?.(false), [])

  const ConfirmUI = state ? (
    <ConfirmDialog
      open
      onClose={() => settle(false)}
      onConfirm={() => settle(true)}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      variant={state.variant}
    />
  ) : null

  return { confirm, ConfirmUI }
}
