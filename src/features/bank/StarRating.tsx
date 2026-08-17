import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

// Compact rating display: one star glyph with the 0–5 number inside it.
export function RatingBadge({ value, className }: { value: number; className?: string }) {
  const rated = value > 0
  return (
    <span
      className={cn('relative inline-flex h-7 w-7 shrink-0 items-center justify-center', className)}
      aria-label={rated ? `Rated ${value} of 5` : 'Unrated'}
    >
      <Star
        aria-hidden
        className={cn('absolute inset-0 h-full w-full', rated ? 'text-warning' : 'text-text-muted')}
        fill={rated ? 'currentColor' : 'none'}
        strokeWidth={rated ? 0 : 1.5}
      />
      {/* Nudged down: a star's visual center sits below its geometric center. */}
      <span
        className={cn(
          'relative translate-y-px text-2xs font-bold',
          rated ? 'text-text-inverse' : 'text-text-muted',
        )}
      >
        {value}
      </span>
    </span>
  )
}

// Interactive 0–5 picker: tap a star to rate, tap the current rating to clear.
export function RatingPicker({
  label,
  value,
  onChange,
}: {
  label?: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <div className="text-sm font-medium text-text-secondary">{label}</div>}
      <div className="flex flex-wrap items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
            aria-pressed={n <= value}
            onClick={() => onChange(n === value ? 0 : n)}
            className="flex h-9 w-9 items-center justify-center rounded-control transition-colors hover:bg-surface-raised"
          >
            <Star
              size={20}
              className={n <= value ? 'text-warning' : 'text-text-muted'}
              fill={n <= value ? 'currentColor' : 'none'}
            />
          </button>
        ))}
        <span className="ml-1.5 text-xs text-text-muted">
          {value > 0 ? `${value}/5 — tap the same star to clear` : 'Unrated'}
        </span>
      </div>
    </div>
  )
}
