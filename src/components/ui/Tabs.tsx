import { cn } from '@/lib/utils'

export interface TabDef {
  id: string
  label: string
  disabled?: boolean
  /** completeness marker (ported ✓ affordance) */
  done?: boolean
}

// Underline tabs, ported. `flow` draws a decorative → between tabs to suggest
// an order without gating it.
export function Tabs({
  tabs,
  active,
  onChange,
  flow = false,
}: {
  tabs: TabDef[]
  active: string
  onChange: (id: string) => void
  flow?: boolean
}) {
  return (
    <div className="flex items-center overflow-x-auto border-b border-border">
      {tabs.map((tab, i) => (
        <div key={tab.id} className="flex items-center">
          {flow && i > 0 && <span className="px-1 text-base font-bold text-text-muted">→</span>}
          <button
            type="button"
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-3.5 py-2 text-sm transition-colors duration-120',
              tab.id === active
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary',
              tab.disabled && 'cursor-not-allowed opacity-40 hover:text-text-secondary',
            )}
          >
            {tab.label}
            {tab.done && <span className="ml-1 text-success">✓</span>}
          </button>
        </div>
      ))}
    </div>
  )
}
