import { forwardRef, type InputHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { onClear, className, value, ...rest },
  ref,
) {
  const hasValue = typeof value === 'string' && value.length > 0
  return (
    <div className={cn('relative', className)}>
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        ref={ref}
        type="search"
        value={value}
        className={cn(
          'h-9 w-full rounded-field border border-border bg-surface-raised pl-8.5 text-sm text-text-primary placeholder:text-text-muted transition-colors',
          'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20',
          '[&::-webkit-search-cancel-button]:hidden',
          hasValue && onClear ? 'pr-8' : 'pr-2.5',
        )}
        {...rest}
      />
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-4.5 w-4.5 -translate-y-1/2 items-center justify-center rounded-full text-text-muted hover:text-text-primary"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
})
