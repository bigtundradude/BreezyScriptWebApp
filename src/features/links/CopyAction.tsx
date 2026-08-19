import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Copy button sized for thumbs (≥44px), with the standard copied feedback.
// The copy actions are the whole point of the links tool on a phone.
export function CopyAction({
  text,
  label,
  icon: Icon,
}: {
  text: string
  label: string
  icon: LucideIcon
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setCopied(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1500)
      }}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-control border transition-colors',
        copied
          ? 'border-success/40 bg-success/12 text-success'
          : 'border-border bg-surface-raised text-text-secondary hover:text-text-primary',
      )}
    >
      {copied ? <Check size={15} /> : <Icon size={15} />}
    </button>
  )
}
