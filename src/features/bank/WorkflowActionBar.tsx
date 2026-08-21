import type { ReactNode } from 'react'
import { Button } from '@/components/ui'

// Docked, state-driven action bar for workflow steps (CLAUDE.md pattern +
// docs/idea-workflow-plan.md §3). Ready is ALWAYS visible (owner, 2026-08-21):
// it enables whenever the step's criteria pass, saves any unsaved edits, marks
// the step ready, and advances to the NEXT step. Cancel/Save appear alongside
// it only while dirty (Save saves and closes; Cmd/Ctrl+S saves and stays).
//   dirty                → [left] … [Cancel] [Save] [Ready]
//   clean, criteria unmet → hint line + [left] … [Ready disabled]
//   clean, qualified      → [left] … [Ready]
export function WorkflowActionBar({
  dirty,
  saving,
  readying,
  isReady,
  missing,
  onCancel,
  onSave,
  onReady,
  left,
}: {
  dirty: boolean
  saving: boolean
  readying?: boolean
  isReady: boolean
  missing: string[] // human-readable unmet ready criteria; [] = qualified
  onCancel: () => void
  onSave: () => void
  /** Saves if dirty, marks ready if needed, then advances to the next step. */
  onReady?: () => void
  left?: ReactNode
}) {
  const qualified = isReady || missing.length === 0
  return (
    <div className="sticky bottom-0 z-10 mt-1 flex flex-col gap-2 border-t border-border bg-bg py-3">
      {!qualified && (
        <div className="text-2xs text-text-muted">To mark this step ready: {missing.join(', ')}.</div>
      )}
      <div className="flex items-center gap-2">
        {left}
        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <>
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant="secondary" loading={saving} onClick={onSave}>
                Save
              </Button>
            </>
          )}
          <Button
            loading={readying}
            disabled={!qualified || !onReady}
            onClick={() => onReady?.()}
          >
            Ready
          </Button>
        </div>
      </div>
    </div>
  )
}
