import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useBlocker, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Check, ChevronLeft, Plus, StickyNote, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge, Button, ConfirmDialog, SearchInput, Spinner, Textarea } from '@/components/ui'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { GrowInput } from '@/features/bank/GrowInput'
import { WorkflowActionBar } from '@/features/bank/WorkflowActionBar'
import { nextStepRoute } from '@/features/bank/steps'

// Workflow step 5 — Research Collection (docs/idea-workflow-plan.md §5d).
// Supplements the questions transcript with Second Brain references, pasted
// research, CTAs, and the disclaimer flag. Ready = materials declared complete
// for the Script Drafter; nothing is individually required.
export function ResearchStep({
  channelId,
  ideaId,
}: {
  channelId: Id<'channels'>
  ideaId: Id<'bankIdeas'>
}) {
  const idea = useQuery(api.ideaBank.get, { channelId, ideaId })
  const attachedNotes = useQuery(api.ideaBank.researchNotes, { channelId, ideaId })
  const disclaimerSnippet = useQuery(api.bankSnippets.get, { channelId, key: 'disclaimer' })
  const updateResearch = useMutation(api.ideaBank.updateResearch)
  const markStepReady = useMutation(api.ideaBank.markStepReady)
  const navigate = useNavigate()

  const [noteIds, setNoteIds] = useState<Id<'notes'>[]>([])
  const [noteMeta, setNoteMeta] = useState<Record<string, { title: string; kind: string }>>({})
  const [researchText, setResearchText] = useState('')
  const [midwayCta, setMidwayCta] = useState('')
  const [outroCta, setOutroCta] = useState('')
  const [includeDisclaimer, setIncludeDisclaimer] = useState(false)
  const [dirty, setDirty] = useState(false)
  const dirtyRef = useRef(false)
  const markDirty = (value: boolean) => {
    dirtyRef.current = value
    setDirty(value)
  }
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [readying, setReadying] = useState(false)
  const [error, setError] = useState('')

  // Second Brain picker state (debounced live search, owner 2026-08-18).
  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const searchTerm = useDebouncedValue(searchInput.trim(), 250) || undefined
  const pickerNotes = useQuery(
    api.notes.list,
    pickerOpen ? { channelId, search: searchTerm } : 'skip',
  )

  useEffect(() => {
    if (loaded || !idea) return
    setNoteIds(idea.researchNoteIds ?? [])
    setResearchText(idea.researchText ?? '')
    setMidwayCta(idea.midwayCta ?? '')
    setOutroCta(idea.outroCta ?? '')
    setIncludeDisclaimer(idea.includeDisclaimer ?? false)
    setLoaded(true)
  }, [idea, loaded])

  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    withResolver: true,
    enableBeforeUnload: () => dirtyRef.current,
  })

  const overviewTo = `/c/${channelId}/bank/${ideaId}`
  const goOverview = useCallback(() => void navigate({ to: overviewTo }), [navigate, overviewTo])

  const save = useCallback(
    async (stay: boolean) => {
      setSaving(true)
      setError('')
      try {
        await updateResearch({
          channelId,
          ideaId,
          researchNoteIds: noteIds,
          researchText,
          midwayCta,
          outroCta,
          includeDisclaimer,
        })
        markDirty(false)
        if (!stay) goOverview()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed — your text is still here. Try again.')
        return false
      } finally {
        setSaving(false)
      }
    },
    [channelId, ideaId, noteIds, researchText, midwayCta, outroCta, includeDisclaimer, updateResearch, goOverview],
  )

  // Ready = save unsaved edits, mark the step ready, go to the next step.
  const ready = async () => {
    setReadying(true)
    setError('')
    try {
      if (dirtyRef.current && !(await save(true))) return
      if (!(idea?.readySteps ?? []).includes('research')) {
        await markStepReady({ channelId, ideaId, step: 'research' })
      }
      const next = nextStepRoute('research')
      void navigate({ to: next ? `${overviewTo}/${next}` : overviewTo })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark ready — try again.')
    } finally {
      setReadying(false)
    }
  }

  // Cmd/Ctrl+S saves and stays (decision #5).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (!saving && dirty) void save(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save, saving, dirty])

  if (idea === undefined || attachedNotes === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (idea === null) return <Navigate to="/c/$channelId/bank" params={{ channelId }} />
  const readySteps = idea.readySteps ?? []
  const priorReady = ['idea', 'titles', 'thumbnails', 'questions'].every((s) => readySteps.includes(s))
  if (!priorReady) {
    return (
      <Navigate to="/c/$channelId/bank/$bankIdeaId" params={{ channelId, bankIdeaId: ideaId }} />
    )
  }

  const stepReady = readySteps.includes('research')
  const attach = (note: { _id: Id<'notes'>; title: string; kind: string }) => {
    if (noteIds.includes(note._id)) return
    setNoteIds((prev) => [...prev, note._id])
    // Cache display info so unsaved attachments keep their title after the
    // picker closes (the server list only knows saved ids).
    setNoteMeta((prev) => ({ ...prev, [note._id]: { title: note.title, kind: note.kind } }))
    markDirty(true)
  }
  const detach = (noteId: Id<'notes'>) => {
    setNoteIds((prev) => prev.filter((id) => id !== noteId))
    markDirty(true)
  }

  // Rows reflect unsaved attach/detach too: merge server list with local state.
  const attachedRows = noteIds.map((id) => {
    const known = attachedNotes.find((n) => n._id === id)
    const meta = noteMeta[id]
    return {
      _id: id,
      title: known?.title ?? meta?.title ?? 'Note',
      kind: known?.kind ?? meta?.kind ?? 'note',
      deleted: known?.deleted ?? false,
    }
  })

  return (
    <div className="mx-auto flex max-w-190 flex-col gap-5 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={goOverview}
          className="flex min-h-11 items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Idea
        </button>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Research collection</h2>
      </div>
      <p className="-mt-3 text-sm text-text-secondary">
        Everything the Script Drafter will work from, alongside your answers transcript.
      </p>

      {error && (
        <div className="rounded-row border border-danger px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      {/* ——— Second Brain entries ——— */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Second Brain entries
          </div>
          <Button size="sm" variant="secondary" onClick={() => setPickerOpen((v) => !v)}>
            <Plus size={13} />
            {pickerOpen ? 'Close picker' : 'Add from Second Brain'}
          </Button>
        </div>
        {attachedRows.length === 0 && !pickerOpen && (
          <p className="text-xs text-text-muted">No notes attached yet.</p>
        )}
        {attachedRows.map((note) => (
          <div
            key={note._id}
            className="flex items-center gap-2 rounded-row border border-border bg-surface py-1 pl-3 pr-1"
          >
            <StickyNote size={14} className="shrink-0 text-text-muted" />
            <span className={`min-w-0 flex-1 truncate text-sm ${note.deleted ? 'text-text-muted line-through' : 'text-text-primary'}`}>
              {note.title}
            </span>
            <Badge variant="muted">{note.kind.replace('_', ' ')}</Badge>
            <button
              aria-label={`Detach ${note.title}`}
              onClick={() => detach(note._id)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {attachedRows.length > 0 && (
          <p className="text-2xs text-text-muted">
            Detaching only removes the reference — the note stays in your Second Brain.
          </p>
        )}
        {pickerOpen && (
          <div className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-3">
            <SearchInput
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onClear={() => setSearchInput('')}
              placeholder="Search notes…"
            />
            {pickerNotes === undefined ? (
              <div className="flex items-center gap-2 py-2 text-sm text-text-muted">
                <Spinner size={13} /> Loading notes…
              </div>
            ) : pickerNotes.length === 0 ? (
              <p className="py-1 text-xs text-text-muted">No notes found.</p>
            ) : (
              pickerNotes.map((note) => {
                const isAttached = noteIds.includes(note._id)
                return (
                  <button
                    key={note._id}
                    disabled={isAttached}
                    onClick={() => attach(note)}
                    className="flex min-h-11 items-center gap-2 rounded-row px-2 text-left transition-colors hover:bg-surface-raised disabled:opacity-50"
                  >
                    {isAttached ? (
                      <Check size={14} className="shrink-0 text-success" />
                    ) : (
                      <Plus size={14} className="shrink-0 text-text-muted" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{note.title}</span>
                    <Badge variant="muted">{note.kind.replace('_', ' ')}</Badge>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ——— Pasted research ——— */}
      <Textarea
        label="Additional research"
        rows={8}
        placeholder="Paste articles, data, quotes, or anything else the script should consider…"
        value={researchText}
        onChange={(e) => {
          setResearchText(e.target.value)
          markDirty(true)
        }}
      />

      {/* ——— Calls to action ——— */}
      <div className="flex flex-col gap-2">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Calls to action
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-sm font-medium text-text-secondary">Midway call to action</div>
          <GrowInput
            placeholder="e.g. Ask viewers to comment their worst impulse buy"
            aria-label="Midway call to action"
            value={midwayCta}
            onChange={(value) => {
              setMidwayCta(value)
              markDirty(true)
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-sm font-medium text-text-secondary">Outro call to action</div>
          <GrowInput
            placeholder="e.g. Send viewers to the budget-setup video next"
            aria-label="Outro call to action"
            value={outroCta}
            onChange={(value) => {
              setOutroCta(value)
              markDirty(true)
            }}
          />
        </div>
      </div>

      {/* ——— Disclaimer toggle ——— */}
      <div className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-4">
        <button
          role="switch"
          aria-checked={includeDisclaimer}
          onClick={() => {
            setIncludeDisclaimer((v) => !v)
            markDirty(true)
          }}
          className="flex min-h-11 w-full items-center gap-3 text-left"
        >
          <span
            className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              includeDisclaimer ? 'bg-primary' : 'bg-surface-raised border border-border'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-text-primary transition-transform ${
                includeDisclaimer ? 'translate-x-4' : ''
              }`}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-text-primary">Include legal disclaimer</span>
            <span className="block text-xs text-text-secondary">
              The Script Drafter weaves in your disclaimer snippet.
            </span>
          </span>
        </button>
        {includeDisclaimer && (
          <div className="rounded-row border border-border-subtle bg-bg px-3 py-2 text-xs text-text-secondary">
            {disclaimerSnippet?.trim() ? (
              disclaimerSnippet
            ) : (
              <span className="text-warning">
                No disclaimer snippet set yet — add one in Settings → Script snippets.
              </span>
            )}
          </div>
        )}
        <Link
          to="/c/$channelId/settings/snippets"
          params={{ channelId }}
          className="w-fit text-2xs text-text-muted underline underline-offset-2 hover:text-text-secondary"
        >
          Edit the snippet in Settings
        </Link>
      </div>

      <div className="text-2xs text-text-muted">Cmd/Ctrl+S saves without leaving the page.</div>

      <WorkflowActionBar
        dirty={dirty}
        saving={saving}
        readying={readying}
        isReady={stepReady}
        missing={[]}
        onCancel={goOverview}
        onSave={() => void save(false)}
        onReady={() => void ready()}
      />

      <ConfirmDialog
        open={blocker.status === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={() => {
          markDirty(false)
          blocker.proceed?.()
        }}
        title="Unsaved changes"
        message="You have unsaved changes that will be lost if you leave. Are you sure you want to continue?"
        confirmLabel="Leave anyway"
        cancelLabel="Stay here"
      />
    </div>
  )
}
