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
  title: string
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
    <div className="flex h-full flex-col gap-5 px-8 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-text-secondary">{description}</p>}
        </div>
        {action}
      </div>
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
