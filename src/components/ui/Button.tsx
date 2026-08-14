import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconOnly?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-text-inverse hover:bg-primary-hover',
  secondary: 'bg-surface-raised text-text-primary border border-border hover:bg-sidebar-active',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-raised',
  danger: 'bg-danger text-text-inverse hover:opacity-90',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
}

const iconOnlyClasses: Record<Size, string> = {
  sm: 'h-7 w-7 p-0',
  md: 'h-9 w-9 p-0',
  lg: 'h-11 w-11 p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, iconOnly = false, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-field font-medium transition-colors',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-bg focus-visible:outline-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        iconOnly ? iconOnlyClasses[size] : sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 12 : 14} /> : children}
    </button>
  )
})
