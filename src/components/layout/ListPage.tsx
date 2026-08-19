import type { ReactNode } from 'react'
import { Spinner } from '@/components/ui'

// Standard page template ported from the desktop app: header row → filter row → content.
export function ListPage({
  title,
  description,
  action,
  search,
  filters,
  loading,
  isEmpty,
  empty,
  children,
}: {
  title?: string
  description?: string
  action?: ReactNode
  search?: ReactNode
  filters?: ReactNode
  loading?: boolean
  isEmpty?: boolean
  empty?: ReactNode
  children?: ReactNode
}) {
  return (
    // min-h-full (not h-full): with h-full, content taller than the viewport
    // overflows past the wrapper's bottom padding and the last row rides the
    // screen edge. pb-10 keeps a comfortable runway under every list.
    <div className="flex min-h-full flex-col gap-5 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-text-secondary">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {(search || filters) && (
        <div className="flex flex-wrap items-center gap-2.5">
          {search && <div className="min-w-50 flex-1">{search}</div>}
          {filters}
        </div>
      )}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner size={14} /> Loading…
        </div>
      ) : isEmpty ? (
        empty
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </div>
  )
}
