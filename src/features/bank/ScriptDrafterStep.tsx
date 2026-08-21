import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { ChevronLeft, FileText, Send, Sparkles, Trash2, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { DEFAULT_STRUCTURES } from '../../../convex/lib/defaultStructures'
import { Badge, Button, ConfirmDialog, Input, Markdown, Select, Spinner } from '@/components/ui'
import { WorkflowActionBar } from '@/features/bank/WorkflowActionBar'
import { nextStepRoute } from '@/features/bank/steps'

// Workflow step 6 — Script Drafter (docs/idea-workflow-plan.md §5e).
// Persona + minutes (× reading-pace WPM) + structure + collected materials →
// generated drafts. Tapping a draft opens a full-screen reading preview with
// Send to Refinement (the copy boundary into step 7).
export function ScriptDrafterStep({
  channelId,
  ideaId,
}: {
  channelId: Id<'channels'>
  ideaId: Id<'bankIdeas'>
}) {
  const idea = useQuery(api.ideaBank.get, { channelId, ideaId })
  const personas = useQuery(api.bankDrafts.listPersonas, { channelId })
  const customStructures = useQuery(api.bankStructures.list, { channelId })
  const wpm = useQuery(api.pace.getWordsPerMinute, { channelId })
  const gauge = useQuery(api.bankDrafts.materials, { channelId, ideaId })
  const drafts = useQuery(api.bankDrafts.listDrafts, { channelId, ideaId })
  const generate = useAction(api.bankDrafts.generate)
  const removeDraft = useMutation(api.bankDrafts.removeDraft)
  const sendToRefinement = useMutation(api.bankDrafts.sendToRefinement)
  const navigate = useNavigate()

  const [personaId, setPersonaId] = useState<string | null>(null) // null = uninitialized
  const [structureRef, setStructureRef] = useState<string | null>(null)
  const [minutesText, setMinutesText] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [previewId, setPreviewId] = useState<Id<'bankDrafts'> | null>(null)
  const [sending, setSending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Id<'bankDrafts'> | null>(null)

  const previewDraft = useQuery(
    api.bankDrafts.getDraft,
    previewId ? { channelId, draftId: previewId } : 'skip',
  )

  const structureOptions = useMemo(() => {
    const builtin = DEFAULT_STRUCTURES.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.format})`,
    }))
    const custom = (customStructures ?? []).map((s) => ({
      value: s._id as string,
      label: `${s.name} (custom)`,
    }))
    return [...custom, ...builtin]
  }, [customStructures])

  if (
    idea === undefined ||
    personas === undefined ||
    customStructures === undefined ||
    wpm === undefined ||
    gauge === undefined ||
    drafts === undefined
  ) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (idea === null) return <Navigate to="/c/$channelId/bank" params={{ channelId }} />
  const readySteps = idea.readySteps ?? []
  const priorReady = ['idea', 'titles', 'thumbnails', 'questions', 'research'].every((s) =>
    readySteps.includes(s),
  )
  if (!priorReady) {
    return (
      <Navigate to="/c/$channelId/bank/$bankIdeaId" params={{ channelId, bankIdeaId: ideaId }} />
    )
  }

  const defaultPersona = personas.find((p) => p.isDefault) ?? personas[0]
  // Validate the remembered persona like the structure below — a deleted
  // persona's id must fall back, not silently draft with no persona.
  const savedPersonaId = personaId ?? idea.draftPersonaId
  const effectivePersonaId =
    savedPersonaId === '' || personas.some((p) => (p._id as string) === savedPersonaId)
      ? (savedPersonaId ?? (defaultPersona?._id as string | undefined) ?? '')
      : ((defaultPersona?._id as string | undefined) ?? '')
  const savedStructureRef = structureRef ?? idea.draftStructureRef
  const effectiveStructureRef =
    savedStructureRef && structureOptions.some((o) => o.value === savedStructureRef)
      ? savedStructureRef
      : (structureOptions.find((o) => o.value === 'default:long3')?.value ||
        structureOptions[0]?.value ||
        '')
  const minutes = minutesText !== null ? Number(minutesText) || 0 : (idea.draftMinutes ?? 8)
  const targetWords = Math.round(minutes * wpm)

  const overviewTo = `/c/${channelId}/bank/${ideaId}`
  const goOverview = () => void navigate({ to: overviewTo })

  const runGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const result = await generate({
        channelId,
        ideaId,
        personaId: effectivePersonaId,
        structureRef: effectiveStructureRef,
        minutes,
      })
      if (result.error) setError(result.error)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Sending a draft is this step's Ready: it marks the step and advances
  // straight into Script Refinement (owner, 2026-08-21).
  const send = async (draftId: Id<'bankDrafts'>) => {
    setSending(true)
    setError('')
    try {
      await sendToRefinement({ channelId, draftId })
      setPreviewId(null)
      const next = nextStepRoute('draft')
      void navigate({ to: next ? `${overviewTo}/${next}` : overviewTo })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send to refinement. Try again.')
    } finally {
      setSending(false)
    }
  }

  // Chronological numbering: Draft 1 is the oldest.
  const ordered = [...drafts].sort((a, b) => a._creationTime - b._creationTime)
  const numberOf = (id: Id<'bankDrafts'>) => ordered.findIndex((d) => d._id === id) + 1
  const newestFirst = [...ordered].reverse()

  const stepReady = readySteps.includes('draft')
  const gaugePercent = Math.min(100, Math.round((gauge.estTokens / gauge.limitTokens) * 100))

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
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Script drafter</h2>
      </div>

      {error && (
        <div className="rounded-row border border-danger px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      <div className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-4">
        <Select<string>
          label="Persona"
          options={[
            { value: '', label: 'No persona' },
            ...personas.map((p) => ({
              value: p._id as string,
              label: p.isDefault ? `${p.label} (default)` : p.label,
            })),
          ]}
          value={effectivePersonaId}
          onChange={setPersonaId}
        />
        <Select<string>
          label="Video structure"
          options={structureOptions}
          value={effectiveStructureRef}
          onChange={setStructureRef}
        />
        <div className="flex items-end gap-3">
          <Input
            label="Length (minutes)"
            type="number"
            min={1}
            max={120}
            value={minutesText ?? String(idea.draftMinutes ?? 8)}
            onChange={(e) => setMinutesText(e.target.value)}
            className="w-32"
          />
          <p className="pb-2 text-xs text-text-muted">
            ≈ {targetWords.toLocaleString()} words at your {wpm} wpm pace.{' '}
            Set your pace in Settings → Reading pace.
          </p>
        </div>

        {/* Context budget gauge */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-2xs text-text-muted">
            <span>Materials size</span>
            <span className={gauge.over ? 'font-semibold text-danger' : ''}>
              ~{Math.round(gauge.estTokens / 1000)}k of {Math.round(gauge.limitTokens / 1000)}k tokens
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <div
              className={`h-full rounded-full ${gauge.over ? 'bg-danger' : gaugePercent > 80 ? 'bg-warning' : 'bg-primary'}`}
              style={{ width: `${gaugePercent}%` }}
            />
          </div>
          {gauge.over && (
            <p className="text-2xs text-danger">
              Too much material for the context budget. Trim the transcript, research text, or
              detach notes in the previous steps.
            </p>
          )}
        </div>

        <Button
          loading={generating}
          disabled={gauge.over || minutes < 1}
          onClick={() => void runGenerate()}
        >
          <Sparkles size={14} />
          {drafts.length > 0 ? 'Generate another draft' : 'Generate draft'}
        </Button>
        {generating && (
          <p className="text-2xs text-text-muted">
            Writing ≈ {targetWords.toLocaleString()} words. This can take a minute or two.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Drafts
        </div>
        {drafts.length === 0 && (
          <p className="text-xs text-text-muted">
            No drafts yet. Adjust the settings above and generate as many as you like.
          </p>
        )}
        {newestFirst.map((draft) => {
          const isSent = idea.draftSentRef === draft._id
          return (
            <div
              key={draft._id}
              className="flex items-center gap-1 rounded-row border border-border bg-surface py-1 pl-3 pr-1"
            >
              <button
                onClick={() => setPreviewId(draft._id)}
                className="flex min-h-13 min-w-0 flex-1 items-center gap-3 text-left"
              >
                <FileText size={16} className="shrink-0 text-text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      Draft {numberOf(draft._id)}
                    </span>
                    {isSent && <Badge variant="success">in refinement</Badge>}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-text-secondary">
                    {draft.structureName} · {draft.targetMinutes} min ·{' '}
                    {draft.wordCount.toLocaleString()} words
                  </span>
                </span>
              </button>
              <button
                aria-label={`Delete draft ${numberOf(draft._id)}`}
                onClick={() => setConfirmDelete(draft._id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>

      <WorkflowActionBar
        dirty={false}
        saving={false}
        isReady={stepReady}
        missing={idea.draftSentRef ? [] : ['send a draft to refinement']}
        onCancel={goOverview}
        onSave={() => {}}
        onReady={() => {
          const next = nextStepRoute('draft')
          void navigate({ to: next ? `${overviewTo}/${next}` : overviewTo })
        }}
      />

      {/* Full-screen reading preview */}
      {previewId && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg">
          <div className="flex items-center gap-3 border-b border-border px-4 py-2 md:px-8">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
              Draft {numberOf(previewId)}
              {previewDraft && (
                <span className="ml-2 font-normal text-text-muted">
                  {previewDraft.structureName} · {previewDraft.wordCount.toLocaleString()} words
                </span>
              )}
            </span>
            <Button
              loading={sending}
              size="sm"
              onClick={() => void send(previewId)}
            >
              <Send size={13} />
              Send to Refinement
            </Button>
            <button
              aria-label="Close preview"
              onClick={() => setPreviewId(null)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-160 px-4 py-6 md:px-8">
              {previewDraft === undefined ? (
                <div className="flex justify-center py-16">
                  <Spinner size={18} />
                </div>
              ) : previewDraft === null ? (
                <p className="text-sm text-danger">Draft not found.</p>
              ) : (
                <div className="text-[15px] leading-relaxed">
                  <Markdown>{previewDraft.text}</Markdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return
          const id = confirmDelete
          setConfirmDelete(null)
          void removeDraft({ channelId, draftId: id }).catch((e) =>
            setError(e instanceof Error ? e.message : 'Delete failed. Try again.'),
          )
        }}
        title={`Delete draft ${confirmDelete ? numberOf(confirmDelete) : ''}?`}
        message="The draft is permanently removed. A copy already sent to refinement is kept there."
        confirmLabel="Delete"
      />
    </div>
  )
}
