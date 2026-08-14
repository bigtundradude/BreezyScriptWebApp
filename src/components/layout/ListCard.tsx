import type { KeyboardEvent, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Ported list row: auto-appends the chevron when clickable — consumers must not
// add their own. `accent` swaps the left border for a 3px accent bar.
export function ListCard({
  icon: Icon,
  onClick,
  accent,
  children,
}: {
  icon?: LucideIcon
  onClick?: () => void
  accent?: string
  children: ReactNode
}) {
  const interactive = Boolean(onClick)
  const handleKey = (e: KeyboardEvent) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick?.()
    }
  }
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKey}
      className={cn(
        'flex select-none items-center gap-3 rounded-row border border-border bg-surface px-4 py-3 transition-colors',
        interactive && 'cursor-pointer hover:bg-surface-raised focus:bg-surface-raised',
      )}
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      {Icon && <Icon size={16} className="shrink-0 text-text-muted" />}
      <div className="min-w-0 flex-1">{children}</div>
      {interactive && <ChevronRight size={15} className="shrink-0 text-text-muted" />}
    </div>
  )
}
