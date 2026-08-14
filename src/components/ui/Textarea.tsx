import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  /** strips border/bg/padding for custom containers */
  bare?: boolean
  className?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, bare = false, className, id, ...rest },
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
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full text-sm text-text-primary placeholder:text-text-muted transition-colors focus:outline-none',
          bare
            ? 'resize-none border-none bg-transparent p-0'
            : cn(
                'min-h-20 resize-y rounded-field border bg-surface-raised px-3 py-2 focus:ring-2',
                error
                  ? 'border-danger focus:border-danger focus:ring-danger/30'
                  : 'border-border focus:border-primary focus:ring-primary/20',
              ),
        )}
        {...rest}
      />
      {error ? (
        <div className="text-xs text-danger">{error}</div>
      ) : hint ? (
        <div className="text-xs text-text-secondary">{hint}</div>
      ) : null}
    </div>
  )
})
