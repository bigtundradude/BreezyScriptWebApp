import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { DEFAULT_STRUCTURES } from '../../../convex/lib/defaultStructures'
import { Badge, Button, Input, Spinner, Textarea } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'

// Video structures (docs/idea-workflow-plan.md §5e): built-in blueprints as
// code constants (read-only) plus the channel's own free-text blueprints.
export function StructuresSettings({ channelId }: { channelId: Id<'channels'> }) {
  const customs = useQuery(api.bankStructures.list, { channelId })
  const create = useMutation(api.bankStructures.create)
  const remove = useMutation(api.bankStructures.remove)
  const { confirm, ConfirmUI } = useConfirm()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newPattern, setNewPattern] = useState('')
  const [adding, setAdding] = useState(false)

  if (!customs) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner size={14} /> Loading structures…
      </div>
    )
  }

  const addStructure = async () => {
    setAdding(true)
    try {
      await create({ channelId, name: newName, pattern: newPattern })
      setNewName('')
      setNewPattern('')
    } finally {
      setAdding(false)
    }
  }

  const confirmRemove = async (structure: { _id: Id<'bankStructures'>; name: string }) => {
    const ok = await confirm({
      title: `Delete structure “${structure.name}”?`,
      message: 'The blueprint is permanently removed. Existing drafts are unaffected.',
      confirmLabel: 'Delete',
    })
    if (ok) await remove({ channelId, structureId: structure._id })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        The structural blueprints the Script Drafter follows: 13 researched defaults (sourced from
        creators' own documented formats) plus your own blueprints.
      </p>

      <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
        Your structures
      </div>
      {customs.length === 0 && (
        <p className="text-xs text-text-muted">No custom structures yet — add one below.</p>
      )}
      {customs.map((structure) => {
        const isOpen = expanded === structure._id
        return (
          <div key={structure._id} className="rounded-panel border border-border bg-surface">
            <div className="flex items-center">
              <button
                onClick={() => setExpanded(isOpen ? null : structure._id)}
                className="flex min-h-13 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                aria-expanded={isOpen}
              >
                {isOpen ? (
                  <ChevronDown size={15} className="shrink-0 text-text-muted" />
                ) : (
                  <ChevronRight size={15} className="shrink-0 text-text-muted" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                  {structure.name}
                </span>
              </button>
              <button
                aria-label={`Delete structure ${structure.name}`}
                onClick={() => void confirmRemove(structure)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {isOpen && (
              <div className="whitespace-pre-wrap border-t border-border-subtle px-4 py-3 text-xs text-text-secondary">
                {structure.pattern}
              </div>
            )}
          </div>
        )
      })}

      <div className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-4">
        <div className="text-sm font-medium text-text-secondary">New structure</div>
        <Input
          placeholder="Name, e.g. My essay format"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Textarea
          rows={10}
          placeholder={
            '## Beats\n1. HOOK (0% to 5%): PURPOSE: what this beat must do. WRITE: how to write it.\n2. …\n3. [MIDWAY CTA] (at 50%): where the midway call to action goes.\n4. CLOSE + [OUTRO CTA] (95% to 100%): …\n\n## Rules\n- retention rules the whole script must obey'
          }
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
        />
        <details className="text-xs text-text-secondary">
          <summary className="min-h-8 cursor-pointer select-none text-text-muted">
            Format guide (same conventions as the defaults)
          </summary>
          <div className="mt-2 flex flex-col gap-1.5 rounded-row border border-border-subtle bg-bg px-3 py-2.5">
            <p>Write it as markdown the script model can follow:</p>
            <p>
              <span className="font-medium text-text-primary">## Beats</span> — a numbered list.
              Each beat: <code>N. BEAT NAME (timing): PURPOSE: what it must accomplish. WRITE: how
              to write it.</code> Use runtime percentages (or mm:ss for shorts).
            </p>
            <p>
              <span className="font-medium text-text-primary">Placement markers</span> — put these
              literal tokens where the elements belong and the drafter will place them there:{' '}
              <code>[MIDWAY CTA]</code>, <code>[OUTRO CTA]</code>, <code>[DISCLAIMER]</code>.
            </p>
            <p>
              <span className="font-medium text-text-primary">## Rules</span> — bullet list of
              retention rules the whole script must obey.
            </p>
            <p>Open any default below to see a full example. No em or en dashes.</p>
          </div>
        </details>
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          disabled={!newName.trim() || !newPattern.trim()}
          loading={adding}
          onClick={() => void addStructure()}
        >
          <Plus size={13} />
          Add structure
        </Button>
      </div>

      <div className="mt-2 text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
        Default structures
      </div>
      {(['long', 'podcast', 'shorts'] as const).map((format) => (
        <div key={format} className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-text-secondary">
            {format === 'long' ? 'Long form' : format === 'podcast' ? 'Podcast' : 'Shorts'}
          </div>
          {DEFAULT_STRUCTURES.filter((s) => s.format === format).map((structure) => {
            const isOpen = expanded === structure.id
            return (
              <div key={structure.id} className="rounded-panel border border-border bg-surface">
                <button
                  onClick={() => setExpanded(isOpen ? null : structure.id)}
                  className="flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown size={15} className="shrink-0 text-text-muted" />
                  ) : (
                    <ChevronRight size={15} className="shrink-0 text-text-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-text-primary">
                        {structure.name}
                      </span>
                      <Badge variant="primary">default</Badge>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-text-secondary">
                      {structure.bestFor}
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-2 border-t border-border-subtle px-4 py-3">
                    <p className="text-2xs text-text-muted">Source: {structure.source}</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-text-secondary">
                      {structure.pattern}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
      {ConfirmUI}
    </div>
  )
}
