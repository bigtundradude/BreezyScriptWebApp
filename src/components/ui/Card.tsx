import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  padding?: number | string
  className?: string
  style?: CSSProperties
}

export function Card({ children, onClick, selected, padding = 16, className, style }: CardProps) {
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
      onKeyDown={interactive ? handleKey : undefined}
      className={cn(
        'rounded-panel border bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-all',
        selected
          ? 'border-primary shadow-[0_0_0_2px_var(--color-primary-subtle)]'
          : 'border-border',
        interactive && 'cursor-pointer hover:bg-surface-raised',
        className,
      )}
      style={{ padding, ...style }}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-3 flex items-center justify-between', className)}>{children}</div>
}

export function CardSection({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn('overflow-hidden rounded-panel border border-border bg-surface', className)} style={style}>
      {children}
    </div>
  )
}
