import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Check, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Badge, Button, Input, Spinner, Textarea } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'

// Persona management (owner spec 2026-08-18): part of the mandatory Setup
// group. Personas live in the existing foundationAssets table (type 'persona');
// the promptSnippet is what the Script Drafter injects as the creator's voice.
export function PersonasSettings({ channelId }: { channelId: Id<'channels'> }) {
  const personas = useQuery(api.foundationAssets.list, { channelId, type: 'persona' })
  const create = useMutation(api.foundationAssets.create)
  const update = useMutation(api.foundationAssets.update)
  const setDefault = useMutation(api.foundationAssets.setDefault)
  const remove = useMutation(api.foundationAssets.remove)
  const { confirm, ConfirmUI } = useConfirm()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [edits, setEdits] = useState<Record<string, { label: string; promptSnippet: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  if (!personas) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner size={14} /> Loading personas…
      </div>
    )
  }

  const add = async () => {
    setAdding(true)
    try {
      const id = await create({ channelId, type: 'persona', label: newLabel })
      setNewLabel('')
      setExpanded(id as string)
    } finally {
      setAdding(false)
    }
  }

  const editOf = (persona: Doc<'foundationAssets'>) =>
    edits[persona._id] ?? { label: persona.label, promptSnippet: persona.promptSnippet }

  const save = async (persona: Doc<'foundationAssets'>) => {
    const edit = editOf(persona)
    setSavingId(persona._id)
    try {
      await update({
        channelId,
        assetId: persona._id,
        label: edit.label,
        promptSnippet: edit.promptSnippet,
      })
      setEdits((prev) => {
        const next = { ...prev }
        delete next[persona._id]
        return next
      })
    } finally {
      setSavingId(null)
    }
  }

  const confirmRemove = async (persona: Doc<'foundationAssets'>) => {
    const ok = await confirm({
      title: `Delete persona “${persona.label}”?`,
      message: 'The persona is permanently removed. Existing drafts are unaffected.',
      confirmLabel: 'Delete',
    })
    if (ok) await remove({ channelId, assetId: persona._id })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        Who the scripts sound like. The Script Drafter injects the default persona's voice
        description unless you pick another; the first persona you create becomes the default.
      </p>

      {personas.length === 0 && (
        <p className="text-xs text-warning">
          No personas yet — the drafter works without one, but scripts sound generic. Add one below.
        </p>
      )}

      {personas.map((persona) => {
        const isOpen = expanded === persona._id
        const edit = editOf(persona)
        const dirty =
          edit.label !== persona.label || edit.promptSnippet !== persona.promptSnippet
        return (
          <div key={persona._id} className="rounded-panel border border-border bg-surface">
            <div className="flex items-center">
              <button
                onClick={() => setExpanded(isOpen ? null : persona._id)}
                className="flex min-h-13 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
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
                      {persona.label}
                    </span>
                    {persona.isDefault && <Badge variant="primary">default</Badge>}
                    {!persona.promptSnippet.trim() && <Badge variant="warning">empty</Badge>}
                  </div>
                </div>
              </button>
              <button
                aria-label={`Delete persona ${persona.label}`}
                onClick={() => void confirmRemove(persona)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {isOpen && (
              <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-3">
                <Input
                  label="Name"
                  value={edit.label}
                  onChange={(e) =>
                    setEdits((prev) => ({ ...prev, [persona._id]: { ...edit, label: e.target.value } }))
                  }
                />
                <Textarea
                  label="Voice description (injected into the script prompt)"
                  rows={7}
                  placeholder={
                    'Describe how this persona speaks: tone, energy, vocabulary, quirks, what they always or never say. e.g.\nCalm, direct, a little dry. Short sentences. Explains with concrete numbers. Never hypes; understates instead.'
                  }
                  value={edit.promptSnippet}
                  onChange={(e) =>
                    setEdits((prev) => ({
                      ...prev,
                      [persona._id]: { ...edit, promptSnippet: e.target.value },
                    }))
                  }
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!dirty}
                    loading={savingId === persona._id}
                    onClick={() => void save(persona)}
                  >
                    Save
                  </Button>
                  {!persona.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void setDefault({ channelId, assetId: persona._id })}
                    >
                      <Check size={13} />
                      Make default
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div className="flex gap-2 rounded-panel border border-border bg-surface p-3">
        <Input
          placeholder="New persona name, e.g. Straight-talking mentor"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="flex-1"
        />
        <Button variant="secondary" disabled={!newLabel.trim()} loading={adding} onClick={() => void add()}>
          <Plus size={14} />
          Add
        </Button>
      </div>
      {ConfirmUI}
    </div>
  )
}
