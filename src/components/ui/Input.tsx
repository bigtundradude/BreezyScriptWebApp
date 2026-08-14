import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  suffix?: ReactNode
  /** className styles the outer wrapper; style/attrs go to the inner input (desktop convention) */
  className?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, suffix, className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-9 w-full rounded-field border bg-surface-raised px-3 text-sm text-text-primary placeholder:text-text-muted transition-colors',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/30'
              : 'border-border focus:border-primary focus:ring-primary/20',
            suffix && 'pr-10',
          )}
          {...rest}
        />
        {suffix && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted">{suffix}</div>
        )}
      </div>
      {error ? (
        <div className="text-xs text-danger">{error}</div>
      ) : hint ? (
        <div className="text-xs text-text-secondary">{hint}</div>
      ) : null}
    </div>
  )
})
