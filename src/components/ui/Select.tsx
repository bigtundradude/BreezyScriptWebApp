import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
}

// Radix supplies keyboard nav, typeahead, and positioning; tokens supply the look.
export function Select<T extends string>({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  label,
  disabled,
  className,
}: {
  options: SelectOption<T>[]
  value: T | null
  onChange: (value: T) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-sm font-medium text-text-secondary">{label}</span>}
      <RadixSelect.Root
        value={value ?? undefined}
        onValueChange={(v) => onChange(v as T)}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          className={cn(
            'flex h-9 items-center justify-between gap-2 rounded-field border border-border bg-surface-raised px-3 text-sm text-text-primary transition-colors',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-placeholder:text-text-muted',
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={14} className="text-text-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-1000 max-h-60 min-w-(--radix-select-trigger-width) overflow-y-auto rounded-field border border-border bg-surface-raised p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
          >
            <RadixSelect.Viewport>
              {options.map((opt) => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-control px-2.5 py-1.5 text-sm text-text-primary outline-none',
                    'data-highlighted:bg-sidebar-active data-[state=checked]:text-primary data-disabled:opacity-40',
                  )}
                >
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check size={14} className="text-primary" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  )
}
