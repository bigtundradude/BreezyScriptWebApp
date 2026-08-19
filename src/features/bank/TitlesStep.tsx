import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useBlocker, useNavigate } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Check, ChevronLeft, Heart, Sparkles } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Button, ConfirmDialog, Spinner } from '@/components/ui'
import { GrowInput } from '@/features/bank/GrowInput'
import { WorkflowActionBar } from '@/features/bank/WorkflowActionBar'

const TITLE_SLOTS = 3

function padTitles(titles: string[]) {
  return Array.from({ length: TITLE_SLOTS }, (_, i) => titles[i] ?? '')
}

// Workflow step 2 — potential titles. Three required fields plus exactly one
// primary before the step can be marked ready. Title generation lands here in
// Phase C (docs/idea-workflow-plan.md §4).
export function TitlesStep({
  channelId,
  ideaId,
}: {
  channelId: Id<'channels'>
  ideaId: Id<'bankIdeas'>
}) {
  const idea = useQuery(api.ideaBank.get, { channelId, ideaId })
  const candidates = useQuery(api.bankTitles.listCandidates, { channelId, ideaId })
  const updateTitles = useMutation(api.ideaBank.updateTitles)
  const markStepReady = useMutation(api.ideaBank.markStepReady)
  const toggleHeart = useMutation(api.bankTitles.toggleHeart)
  const generateTitles = useAction(api.bankTitles.generate)
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [generateMessage, setGenerateMessage] = useState('')

  const [potentialTitles, setPotentialTitles] = useState<string[]>(padTitles([]))
  const [primaryIndex, setPrimaryIndex] = useState(-1)
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

  useEffect(() => {
    if (loaded || !idea) return
    setPotentialTitles(padTitles(idea.potentialTitles))
    setPrimaryIndex(idea.primaryTitleIndex ?? -1)
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
        await updateTitles({ channelId, ideaId, potentialTitles, primaryIndex })
        markDirty(false)
        if (!stay) goOverview()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed — your text is still here. Try again.')
      } finally {
        setSaving(false)
      }
    },
    [channelId, ideaId, potentialTitles, primaryIndex, updateTitles, goOverview],
  )

  const ready = async () => {
    setReadying(true)
    setError('')
    try {
      await markStepReady({ channelId, ideaId, step: 'titles' })
      goOverview()
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

  if (idea === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (idea === null) return <Navigate to="/c/$channelId/bank" params={{ channelId }} />
  // Locked until step 1 is ready — the overview is the front door.
  if (!(idea.readySteps ?? []).includes('idea')) {
    return (
      <Navigate to="/c/$channelId/bank/$bankIdeaId" params={{ channelId, bankIdeaId: ideaId }} />
    )
  }

  const editPotentialTitle = (index: number, value: string) => {
    setPotentialTitles((prev) => prev.map((t, i) => (i === index ? value : t)))
    // A blanked slot can't stay primary.
    if (!value.trim() && primaryIndex === index) setPrimaryIndex(-1)
    markDirty(true)
  }
  const togglePrimary = (index: number) => {
    setPrimaryIndex((prev) => (prev === index ? -1 : index))
    markDirty(true)
  }

  const filledCount = potentialTitles.filter((t) => t.trim()).length
  const missing: string[] = []
  if (filledCount < TITLE_SLOTS) missing.push('fill all three titles')
  if (primaryIndex < 0 || !potentialTitles[primaryIndex]?.trim()) missing.push('pick a primary title')

  const stepReady = (idea.readySteps ?? []).includes('titles')

  return (
    <div className="mx-auto flex max-w-190 flex-col gap-4 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={goOverview}
          className="flex min-h-11 items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Idea
        </button>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Potential titles</h2>
      </div>
      <p className="-mt-2 text-sm text-text-secondary">
        Three candidates for “{idea.title}”. Tap a circle to mark the primary one.
      </p>

      {error && (
        <div className="rounded-row border border-danger px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      <div className="flex flex-col gap-2">
        {potentialTitles.map((t, i) => {
          const isPrimary = primaryIndex === i
          return (
            <div key={i} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <GrowInput
                  placeholder={`Title ${i + 1}`}
                  aria-label={`Title ${i + 1}`}
                  value={t}
                  onChange={(value) => editPotentialTitle(i, value)}
                />
              </div>
              <button
                type="button"
                role="radio"
                aria-checked={isPrimary}
                aria-label={`Make title ${i + 1} the primary title`}
                disabled={!t.trim()}
                onClick={() => togglePrimary(i)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control transition-colors hover:bg-surface-raised disabled:pointer-events-none disabled:opacity-35"
              >
                <span
                  className={`flex h-5.5 w-5.5 items-center justify-center rounded-full border-2 transition-colors ${
                    isPrimary ? 'border-primary bg-primary' : 'border-border bg-transparent'
                  }`}
                >
                  {isPrimary && <Check size={13} strokeWidth={3} className="text-text-inverse" />}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      <GenerateSection
        candidates={candidates ?? []}
        generating={generating}
        message={generateMessage}
        slotsFull={filledCount >= TITLE_SLOTS}
        onGenerate={async () => {
          setGenerating(true)
          setGenerateMessage('')
          setError('')
          try {
            const result = await generateTitles({ channelId, ideaId })
            if (result.error) setError(result.error)
            else setGenerateMessage(`Generated ${result.inserted} title${result.inserted === 1 ? '' : 's'}.`)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Generation failed — try again.')
          } finally {
            setGenerating(false)
          }
        }}
        onHeart={(candidate) => void toggleHeart({ channelId, candidateId: candidate._id })}
        isUsed={(candidate) => potentialTitles.some((t) => t.trim() === candidate.text)}
        onUse={(candidate) => {
          const slot = potentialTitles.findIndex((t) => !t.trim())
          if (slot === -1) return
          editPotentialTitle(slot, candidate.text)
        }}
      />

      <div className="text-2xs text-text-muted">Cmd/Ctrl+S saves without leaving the page.</div>

      <WorkflowActionBar
        dirty={dirty}
        saving={saving}
        readying={readying}
        isReady={stepReady}
        missing={missing}
        onCancel={goOverview}
        onSave={() => void save(false)}
        onDone={goOverview}
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

// Generated candidates, grouped by shape. Hearts persist server-side and
// survive regeneration; "Use" fills the next open slot above.
function GenerateSection({
  candidates,
  generating,
  message,
  slotsFull,
  onGenerate,
  onHeart,
  isUsed,
  onUse,
}: {
  candidates: Doc<'bankTitleCandidates'>[]
  generating: boolean
  message: string
  slotsFull: boolean
  onGenerate: () => Promise<void>
  onHeart: (candidate: Doc<'bankTitleCandidates'>) => void
  isUsed: (candidate: Doc<'bankTitleCandidates'>) => boolean
  onUse: (candidate: Doc<'bankTitleCandidates'>) => void
}) {
  const groups = new Map<string, Doc<'bankTitleCandidates'>[]>()
  for (const candidate of candidates) {
    const list = groups.get(candidate.shapeName) ?? []
    list.push(candidate)
    groups.set(candidate.shapeName, list)
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Generate titles
        </div>
        <Button size="sm" variant="secondary" loading={generating} onClick={() => void onGenerate()}>
          <Sparkles size={13} />
          {candidates.length > 0 ? 'Regenerate' : 'Generate'}
        </Button>
        {message && <span className="text-xs text-text-muted">{message}</span>}
      </div>
      {candidates.length === 0 && !generating && (
        <p className="text-xs text-text-secondary">
          Turns every title template (Settings → Title shapes) into a concrete title for this idea,
          using your simple-tasks model. Heart the keepers, then use up to three.
        </p>
      )}
      {[...groups.entries()].map(([shapeName, list]) => (
        <div key={shapeName} className="flex flex-col gap-1.5">
          <div className="text-xs font-semibold text-text-secondary">{shapeName}</div>
          {list.map((candidate) => {
            const used = isUsed(candidate)
            return (
              <div
                key={candidate._id}
                className="flex items-center gap-1 rounded-row border border-border bg-surface py-1 pl-3 pr-1"
              >
                <span className="min-w-0 flex-1 text-sm text-text-primary">{candidate.text}</span>
                <button
                  aria-label={candidate.hearted ? 'Remove heart' : 'Heart this title'}
                  aria-pressed={candidate.hearted}
                  onClick={() => onHeart(candidate)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control transition-colors hover:bg-surface-raised"
                >
                  <Heart
                    size={16}
                    className={candidate.hearted ? 'text-danger' : 'text-text-muted'}
                    fill={candidate.hearted ? 'currentColor' : 'none'}
                  />
                </button>
                {used ? (
                  <span className="flex shrink-0 items-center gap-1 text-2xs font-medium text-success">
                    <Check size={12} strokeWidth={3} />
                    In use
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" disabled={slotsFull} onClick={() => onUse(candidate)}>
                    Use
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      ))}
      {candidates.length > 0 && slotsFull && (
        <p className="text-2xs text-text-muted">
          All three slots are filled — clear one above to use another candidate.
        </p>
      )}
    </div>
  )
}
