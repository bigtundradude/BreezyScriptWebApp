import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Fallback for contexts without the async clipboard API (plain-http LAN dev
// on a phone): a hidden textarea + execCommand copy.
function legacyCopy(text: string): boolean {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

// Copy button sized for thumbs (≥44px), with honest success/failure feedback —
// the copy actions are the whole point of the links tool on a phone, so a
// failed write must never show the green check.
export function CopyAction({
  text,
  label,
  icon: Icon,
}: {
  text: string
  label: string
  icon: LucideIcon
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const flash = (next: 'copied' | 'failed') => {
    setState(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 1500)
  }

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        flash('copied')
        return
      }
    } catch {
      // fall through to the legacy path
    }
    flash(legacyCopy(text) ? 'copied' : 'failed')
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={state === 'failed' ? 'Copy failed, long-press the URL to copy' : label}
      onClick={() => void copy()}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-control border transition-colors',
        state === 'copied'
          ? 'border-success/40 bg-success/12 text-success'
          : state === 'failed'
            ? 'border-danger/40 bg-danger/12 text-danger'
            : 'border-border bg-surface-raised text-text-secondary hover:text-text-primary',
      )}
    >
      {state === 'copied' ? <Check size={15} /> : state === 'failed' ? <X size={15} /> : <Icon size={15} />}
    </button>
  )
}
