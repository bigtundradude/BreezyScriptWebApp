import { useLayoutEffect, useRef } from 'react'

// Single-line-styled field that grows vertically when the text wraps, so long
// titles stay fully visible on narrow screens. Enter is swallowed — a title
// has no line breaks.
export function GrowInput({
  value,
  onChange,
  placeholder,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  'aria-label'?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    // +2 for the top/bottom borders (border-box height vs scrollHeight).
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ''))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault()
      }}
      className="w-full resize-none overflow-hidden rounded-field border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary transition-colors placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  )
}
