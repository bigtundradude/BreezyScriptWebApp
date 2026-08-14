import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CopyButton({
  text,
  label = 'Copy',
  showLabel = false,
  size = 13,
}: {
  text: string
  label?: string
  showLabel?: boolean
  size?: number
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
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
        'inline-flex items-center gap-1.5 rounded-control p-1 text-xs transition-colors duration-150',
        copied ? 'text-success' : 'text-text-muted hover:text-text-primary',
      )}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
      {showLabel && (copied ? 'Copied' : label)}
    </button>
  )
}
