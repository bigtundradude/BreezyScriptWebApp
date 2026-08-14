import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RailItem {
  label: string
  /** absolute pathname (with /app basepath NOT included) */
  path: string
  icon: LucideIcon
  /** match only exactly (for index items whose path prefixes siblings) */
  exact?: boolean
  disabled?: boolean
}

export interface RailSection {
  /** undefined = unlabeled top section */
  title?: string
  items: RailItem[]
}

// 200px tool rail, ported — with section-header support so Scripts Pro no
// longer needs to hand-roll its own copy (desktop defect fixed).
export function LeftRail({
  sections,
  back,
  footer,
  onNavigate,
}: {
  sections: RailSection[]
  back: { label: string; path: string }
  footer?: ReactNode
  /** unsaved-changes interception: return false to cancel navigation */
  onNavigate?: (path: string) => boolean
}) {
  // Below md the rail collapses to a horizontal strip (responsive is new for web).
  return (
    <nav className="hidden w-50 shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-sidebar p-2 md:flex max-md:flex max-md:w-full max-md:flex-row max-md:items-center max-md:gap-1 max-md:overflow-x-auto max-md:border-b max-md:border-r-0 max-md:py-1.5">
      <Link
        to={back.path}
        onClick={(e) => {
          if (onNavigate && !onNavigate(back.path)) e.preventDefault()
        }}
        className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:text-text-secondary"
      >
        <ArrowLeft size={13} />
        {back.label}
      </Link>
      <div className="mx-2.5 my-1.5 h-px bg-border-subtle max-md:hidden" />
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto max-md:flex-row max-md:items-center max-md:overflow-y-visible">
        {sections.map((section, i) => (
          <div key={i} className="flex flex-col gap-0.5 max-md:flex-row max-md:items-center">
            {section.title && (
              <div className="px-2.5 pb-1 pt-3.5 text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted max-md:hidden">
                {section.title}
              </div>
            )}
            {section.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                disabled={item.disabled}
                activeOptions={{ exact: item.exact ?? false }}
                onClick={(e) => {
                  if (item.disabled) e.preventDefault()
                  else if (onNavigate && !onNavigate(item.path)) e.preventDefault()
                }}
                className={cn(
                  'flex items-center gap-2.5 whitespace-nowrap rounded-control px-2.5 py-1.75 text-sm text-text-sidebar transition-colors hover:bg-sidebar-hover',
                  item.disabled && 'cursor-not-allowed opacity-40',
                )}
                activeProps={{
                  className: 'bg-sidebar-active font-medium text-text-primary hover:bg-sidebar-active',
                }}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      {footer && (
        <>
          <div className="mx-2.5 my-1.5 h-px bg-border-subtle max-md:hidden" />
          {footer}
        </>
      )}
    </nav>
  )
}
