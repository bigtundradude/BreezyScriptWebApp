import type { ReactNode } from 'react'
import { Button } from '@/components/ui'

// Docked, state-driven action bar for workflow steps (CLAUDE.md pattern +
// docs/idea-workflow-plan.md §3). The clean-state exit is ALWAYS one primary
// Ready button (owner decision, 2026-08-18 — never "Done"):
//   dirty                          → [left] … [Cancel] [Save]
//   clean, criteria unmet          → hint line + [left] … [Ready disabled]
//   clean, qualified, not ready    → [left] … [Ready]  (marks ready + closes)
//   clean, already ready           → [left] … [Ready]  (just closes)
export function WorkflowActionBar({
  dirty,
  saving,
  readying,
  isReady,
  missing,
  onCancel,
  onSave,
  onDone,
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
  onDone: () => void
  onReady?: () => void
  left?: ReactNode
}) {
  const canMarkReady = !isReady && missing.length === 0 && Boolean(onReady)
  return (
    <div className="sticky bottom-0 z-10 mt-1 flex flex-col gap-2 border-t border-border bg-bg py-3">
      {!dirty && !isReady && missing.length > 0 && (
        <div className="text-2xs text-text-muted">To mark this step ready: {missing.join(', ')}.</div>
      )}
      <div className="flex items-center gap-2">
        {left}
        <div className="ml-auto flex items-center gap-2">
          {dirty ? (
            <>
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button loading={saving} onClick={onSave}>
                Save
              </Button>
            </>
          ) : (
            <Button
              loading={readying}
              disabled={!isReady && !canMarkReady}
              onClick={() => {
                if (canMarkReady) onReady?.()
                else onDone()
              }}
            >
              Ready
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
