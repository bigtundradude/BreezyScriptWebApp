import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Ported behavior: Enter/comma/blur commit; Backspace on empty removes last;
// values trimmed + lowercased; duplicates silently ignored.
export function PillInput({
  pills,
  onAdd,
  onRemove,
  placeholder,
  label,
  hint,
  validate,
}: {
  pills: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
  placeholder?: string
  label?: string
  hint?: string
  validate?: (value: string) => string | null
}) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const commit = () => {
    const value = input.trim().toLowerCase()
    if (!value) return
    if (pills.includes(value)) {
      setInput('')
      return
    }
    const validationError = validate?.(value) ?? null
    if (validationError) {
      setError(validationError)
      return
    }
    onAdd(value)
    setInput('')
    setError(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && input === '' && pills.length > 0) {
      onRemove(pills[pills.length - 1])
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-text-secondary">{label}</span>}
      <div
        className={cn(
          'flex min-h-9.5 flex-wrap items-center gap-1.5 rounded-field border bg-surface-raised px-2 py-1.5 transition-colors',
          error ? 'border-danger' : focused ? 'border-primary' : 'border-border',
        )}
      >
        {pills.map((pill) => (
          <span
            key={pill}
            className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-primary"
          >
            {pill}
            <button
              type="button"
              onClick={() => onRemove(pill)}
              aria-label={`Remove ${pill}`}
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-text-muted hover:text-text-primary"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError(null)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            commit()
          }}
          placeholder={pills.length === 0 ? placeholder : undefined}
          className="min-w-24 flex-1 bg-transparent text-sm text-text-primary caret-primary placeholder:text-text-muted focus:outline-none"
        />
      </div>
      {error ? (
        <div className="text-xs text-danger">{error}</div>
      ) : hint ? (
        <div className="text-xs text-text-secondary">{hint}</div>
      ) : null}
    </div>
  )
}
