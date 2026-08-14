import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

// Token-based translucent fills — replaces the desktop Badge's hardcoded rgba values.
const variantClasses: Record<Variant, string> = {
  default: 'bg-surface-raised text-text-secondary border-border',
  primary: 'bg-primary-subtle text-primary border-primary/30',
  success: 'bg-success/12 text-success border-success/30',
  warning: 'bg-warning/12 text-warning border-warning/30',
  danger: 'bg-danger/12 text-danger border-danger/30',
  info: 'bg-info/12 text-info border-info/30',
  muted: 'bg-transparent text-text-muted border-border-subtle',
}

export function Badge({
  variant = 'default',
  className,
  title,
  children,
}: {
  variant?: Variant
  className?: string
  title?: string
  children: ReactNode
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
