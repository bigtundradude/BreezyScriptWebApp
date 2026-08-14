import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-panel bg-surface-raised">
          <Icon size={24} className="text-text-muted" />
        </div>
      )}
      <div className="text-md font-semibold text-text-primary">{title}</div>
      {description && (
        <div className="max-w-80 text-sm leading-relaxed text-text-secondary">{description}</div>
      )}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  )
}
