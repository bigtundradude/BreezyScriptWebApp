import { useEffect, useMemo, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Check, ChevronRight, Plus, Sparkles, Trash2, UserRound, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Badge, Button, Input, PillInput, Select, Spinner, Textarea } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'

// Persona management (owner spec 2026-08-18): Add persona opens the full form.
// The creator pastes 3-4 samples of how they actually speak (their own scripts
// or word-for-word video transcripts), sets style controls, and Extract
// persona voice turns all of it into an editable voice guide (bankPersonas
// .voice) that the Script Drafter injects.

const MAX_SAMPLES = 4

type Profile = {
  samples: string[]
  neverUse: string[]
  signature: string[]
  profanity: string
  pacing: string
  energy: string
  notes: string
}

type Form = Profile & { label: string; voice: string }

const PROFANITY_OPTIONS = [
  { value: 'none', label: 'Never' },
  { value: 'mild', label: 'Mild only (damn, hell)' },
  { value: 'moderate', label: 'Moderate (no f-bombs)' },
  { value: 'full', label: 'Unfiltered' },
]

const PACING_OPTIONS = [
  { value: 'fast', label: 'Fast, rapid-fire' },
  { value: 'moderate', label: 'Moderate, conversational' },
  { value: 'slow', label: 'Slow, deliberate' },
  { value: 'varied', label: 'Varied' },
]

const ENERGY_OPTIONS = [
  { value: 'high', label: 'High, hyped' },
  { value: 'upbeat', label: 'Upbeat, friendly' },
  { value: 'calm', label: 'Calm, measured' },
  { value: 'intense', label: 'Intense, serious' },
  { value: 'varied', label: 'Varied' },
]

const EMPTY_FORM: Form = {
  label: '',
  samples: ['', '', ''],
  neverUse: [],
  signature: [],
  profanity: 'none',
  pacing: 'moderate',
  energy: 'upbeat',
  notes: '',
  voice: '',
}

function formOf(persona: Doc<'bankPersonas'>): Form {
  return {
    label: persona.label,
    samples: persona.samples.length ? persona.samples : ['', '', ''],
    neverUse: persona.neverUse,
    signature: persona.signature,
    profanity: persona.profanity,
    pacing: persona.pacing,
    energy: persona.energy,
    notes: persona.notes,
    voice: persona.voice,
  }
}

export function PersonasSettings({ channelId }: { channelId: Id<'channels'> }) {
  const personas = useQuery(api.bankPersonas.list, { channelId })
  const remove = useMutation(api.bankPersonas.remove)
  const { confirm, ConfirmUI } = useConfirm()

  // null = list; 'new' = creating; an id = editing that persona.
  const [editing, setEditing] = useState<'new' | Id<'bankPersonas'> | null>(null)

  if (!personas) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner size={14} /> Loading personas…
      </div>
    )
  }

  if (editing) {
    const persona = editing === 'new' ? null : (personas.find((p) => p._id === editing) ?? null)
    // An id that no longer resolves (deleted elsewhere) falls back to the list.
    if (editing !== 'new' && !persona) setEditing(null)
    return (
      <>
        <PersonaEditor
          key={editing}
          channelId={channelId}
          persona={persona}
          confirm={confirm}
          onClose={() => setEditing(null)}
          onCreated={(id) => setEditing(id)}
        />
        {ConfirmUI}
      </>
    )
  }

  const confirmRemove = async (persona: Doc<'bankPersonas'>) => {
    const ok = await confirm({
      title: `Delete persona “${persona.label}”?`,
      message: 'The persona is permanently removed. Existing drafts are unaffected.',
      confirmLabel: 'Delete',
    })
    if (ok) await remove({ channelId, personaId: persona._id })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        Who your scripts sound like. Each persona is extracted from samples of how you actually
        speak; the Script Drafter injects the default persona's voice unless you pick another.
      </p>

      {personas.length === 0 && (
        <p className="text-xs text-warning">
          No personas yet. The drafter works without one, but scripts sound generic.
        </p>
      )}

      {personas.map((persona) => (
        <div
          key={persona._id}
          className="flex items-center rounded-panel border border-border bg-surface"
        >
          <button
            onClick={() => setEditing(persona._id)}
            className="flex min-h-13 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised"
          >
            <UserRound size={16} className="shrink-0 text-text-muted" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-text-primary">
                  {persona.label}
                </span>
                {persona.isDefault && <Badge variant="primary">default</Badge>}
                {!persona.voice.trim() && <Badge variant="warning">no voice yet</Badge>}
              </div>
            </div>
            <ChevronRight size={15} className="shrink-0 text-text-muted" />
          </button>
          <button
            aria-label={`Delete persona ${persona.label}`}
            onClick={() => void confirmRemove(persona)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setEditing('new')}>
          <Plus size={14} />
          Add persona
        </Button>
        {personas.length > 1 && (
          <span className="text-xs text-text-muted">Open a persona to make it the default.</span>
        )}
      </div>
      {ConfirmUI}
    </div>
  )
}

function PersonaEditor({
  channelId,
  persona,
  confirm,
  onClose,
  onCreated,
}: {
  channelId: Id<'channels'>
  persona: Doc<'bankPersonas'> | null
  confirm: (opts: { title: string; message: string; confirmLabel?: string }) => Promise<boolean>
  onClose: () => void
  onCreated: (id: Id<'bankPersonas'>) => void
}) {
  const save = useMutation(api.bankPersonas.save)
  const setDefault = useMutation(api.bankPersonas.setDefault)
  const remove = useMutation(api.bankPersonas.remove)
  const extract = useAction(api.bankPersonas.extractVoice)

  const baseline = useMemo<Form>(() => (persona ? formOf(persona) : EMPTY_FORM), [persona])
  const [form, setForm] = useState<Form>(baseline)
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const profileOf = (f: Form): Profile => ({
    samples: f.samples.map((s) => s.trim()).filter(Boolean),
    neverUse: f.neverUse,
    signature: f.signature,
    profanity: f.profanity,
    pacing: f.pacing,
    energy: f.energy,
    notes: f.notes,
  })

  const doSave = async (stay: boolean) => {
    setSaving(true)
    try {
      const id = await save({
        channelId,
        personaId: persona?._id,
        label: form.label,
        voice: form.voice,
        profile: profileOf(form),
      })
      if (stay) {
        if (!persona) onCreated(id as Id<'bankPersonas'>)
      } else {
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  // Cmd/Ctrl+S saves and stays (editor action bar pattern).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (dirty && !saving) void doSave(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const cancel = async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Discard changes?',
        message: 'Your unsaved edits to this persona are lost.',
        confirmLabel: 'Discard',
      })
      if (!ok) return
    }
    onClose()
  }

  const confirmRemove = async () => {
    if (!persona) return
    const ok = await confirm({
      title: `Delete persona “${persona.label}”?`,
      message: 'The persona is permanently removed. Existing drafts are unaffected.',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await remove({ channelId, personaId: persona._id })
    onClose()
  }

  const removeSample = async (index: number) => {
    if (form.samples[index].trim()) {
      const ok = await confirm({
        title: `Remove sample ${index + 1}?`,
        message: 'The pasted sample text is discarded.',
        confirmLabel: 'Remove',
      })
      if (!ok) return
    }
    set(
      'samples',
      form.samples.filter((_, i) => i !== index),
    )
  }

  const doExtract = async () => {
    if (form.voice.trim()) {
      const ok = await confirm({
        title: 'Replace the voice description?',
        message: 'Extracting overwrites the current voice text with a fresh analysis.',
        confirmLabel: 'Replace',
      })
      if (!ok) return
    }
    setExtracting(true)
    setExtractError(null)
    try {
      const result = await extract({ profile: profileOf(form) })
      if (result.error) setExtractError(result.error)
      else if (result.text) set('voice', result.text)
    } finally {
      setExtracting(false)
    }
  }

  const filledSamples = form.samples.filter((s) => s.trim()).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-text-primary">
          {persona ? persona.label : 'New persona'}
        </h3>
        {persona?.isDefault && <Badge variant="primary">default</Badge>}
        {persona && !persona.isDefault && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void setDefault({ channelId, personaId: persona._id })}
          >
            <Check size={13} />
            Make default
          </Button>
        )}
      </div>

      <Input
        label="Name"
        placeholder="e.g. Straight-talking mentor"
        value={form.label}
        onChange={(e) => set('label', e.target.value)}
      />

      <div className="flex flex-col gap-3">
        <div>
          <div className="text-sm font-medium text-text-secondary">Script samples</div>
          <p className="mt-0.5 text-xs text-text-secondary">
            Paste text from 3 or 4 scripts you wrote yourself, or pulled word for word from your
            own videos, written the way you actually speak. The extraction reads these to learn
            your voice.
          </p>
        </div>
        {form.samples.map((sample, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.04em] text-text-muted">
                Sample {index + 1}
              </span>
              {form.samples.length > 1 && (
                <button
                  aria-label={`Remove sample ${index + 1}`}
                  onClick={() => void removeSample(index)}
                  className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <Textarea
              rows={5}
              placeholder="Paste one script or transcript excerpt here…"
              value={sample}
              onChange={(e) =>
                set(
                  'samples',
                  form.samples.map((s, i) => (i === index ? e.target.value : s)),
                )
              }
            />
          </div>
        ))}
        {form.samples.length < MAX_SAMPLES && (
          <Button
            size="sm"
            variant="ghost"
            className="w-fit"
            onClick={() => set('samples', [...form.samples, ''])}
          >
            <Plus size={13} />
            Add sample
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-text-secondary">Voice rules</div>
        <PillInput
          label="Never use these words and phrases"
          placeholder="Type a word or phrase, press Enter"
          pills={form.neverUse}
          onAdd={(value) => set('neverUse', [...form.neverUse, value])}
          onRemove={(value) => set('neverUse', form.neverUse.filter((p) => p !== value))}
        />
        <PillInput
          label="Signature words and phrases you do use"
          placeholder="Type a word or phrase, press Enter"
          pills={form.signature}
          onAdd={(value) => set('signature', [...form.signature, value])}
          onRemove={(value) => set('signature', form.signature.filter((p) => p !== value))}
        />
        <div className="flex flex-wrap gap-3">
          <Select
            label="Profanity"
            options={PROFANITY_OPTIONS}
            value={form.profanity}
            onChange={(value) => set('profanity', value)}
            className="min-w-44"
          />
          <Select
            label="Pacing"
            options={PACING_OPTIONS}
            value={form.pacing}
            onChange={(value) => set('pacing', value)}
            className="min-w-44"
          />
          <Select
            label="Energy"
            options={ENERGY_OPTIONS}
            value={form.energy}
            onChange={(value) => set('energy', value)}
            className="min-w-44"
          />
        </div>
        <Textarea
          label="Other style notes (optional)"
          rows={3}
          placeholder="Anything else the voice guide should capture, e.g. always opens with a question, hates hype words…"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={filledSamples === 0}
            loading={extracting}
            onClick={() => void doExtract()}
          >
            <Sparkles size={14} />
            Extract persona voice
          </Button>
          <span className="text-xs text-text-muted">
            {filledSamples === 0
              ? 'Paste at least one sample first.'
              : filledSamples < 3
                ? 'Works best with 3 or 4 samples.'
                : 'Analyzes your samples and rules into a voice guide.'}
          </span>
        </div>
        {extractError && <p className="text-xs text-danger">{extractError}</p>}
        <Textarea
          label="Persona voice (injected into script prompts, edit freely)"
          rows={12}
          placeholder="Run Extract persona voice, or write the voice guide yourself: tone, sentence style, vocabulary, pacing, energy, quirks, what this speaker never says."
          value={form.voice}
          onChange={(e) => set('voice', e.target.value)}
        />
      </div>

      <div className="sticky bottom-0 z-10 mt-1 flex items-center gap-2 border-t border-border bg-bg py-3">
        {persona && (
          <Button variant="danger" onClick={() => void confirmRemove()}>
            <Trash2 size={14} />
            Delete
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {dirty ? (
            <>
              <Button variant="secondary" onClick={() => void cancel()}>
                Cancel
              </Button>
              <Button loading={saving} disabled={!form.label.trim()} onClick={() => void doSave(false)}>
                Save
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
