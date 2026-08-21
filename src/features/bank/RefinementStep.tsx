import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useBlocker, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Check, ChevronLeft, WandSparkles } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge, Button, ConfirmDialog, Spinner, Textarea } from '@/components/ui'
import { WorkflowActionBar } from '@/features/bank/WorkflowActionBar'
import { nextStepRoute } from '@/features/bank/steps'
import { personalizeText } from '@/features/bank/personalize'

// Workflow step 7 — Script Refinement (docs/idea-workflow-plan.md §5b):
// entirely dedicated to editing the script that will be recorded. Works on the
// COPY made by Send to Refinement; multiple versions may exist (one per sent
// draft), exactly one current, none ever lost.
export function RefinementStep({
  channelId,
  ideaId,
}: {
  channelId: Id<'channels'>
  ideaId: Id<'bankIdeas'>
}) {
  const idea = useQuery(api.ideaBank.get, { channelId, ideaId })
  const personalizeSettings = useQuery(api.bankPersonalize.getSettings, { channelId })
  const versions = useQuery(api.bankDrafts.listRefinements, { channelId, ideaId })
  const current = useQuery(api.bankDrafts.getCurrentRefinement, { channelId, ideaId })
  const drafts = useQuery(api.bankDrafts.listDrafts, { channelId, ideaId })
  const wpm = useQuery(api.pace.getWordsPerMinute, { channelId })
  const setCurrent = useMutation(api.bankDrafts.setCurrentRefinement)
  const updateText = useMutation(api.bankDrafts.updateRefinementText)
  const markRefineReady = useMutation(api.bankDrafts.markRefineReady)
  const navigate = useNavigate()

  const [text, setText] = useState('')
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const dirtyRef = useRef(false)
  const markDirty = (value: boolean) => {
    dirtyRef.current = value
    setDirty(value)
  }
  const [saving, setSaving] = useState(false)
  const [readying, setReadying] = useState(false)
  const [error, setError] = useState('')
  const [personalizeNote, setPersonalizeNote] = useState('')

  // Load the current version's text; reload when the current version switches
  // (switching is disabled while dirty, so edits can't be clobbered).
  useEffect(() => {
    if (!current || dirtyRef.current) return
    if (loadedFor !== current._id) {
      setText(current.text)
      setLoadedFor(current._id)
    }
  }, [current, loadedFor])

  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    withResolver: true,
    enableBeforeUnload: () => dirtyRef.current,
  })

  const overviewTo = `/c/${channelId}/bank/${ideaId}`
  const goOverview = useCallback(() => void navigate({ to: overviewTo }), [navigate, overviewTo])

  const save = useCallback(
    async (stay: boolean) => {
      if (!current) return false
      setSaving(true)
      setError('')
      try {
        await updateText({ channelId, refinementId: current._id, text })
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
    [channelId, current, text, updateText, goOverview],
  )

  // Ready = save unsaved edits, mark the step ready, go to the next step.
  const ready = async () => {
    setReadying(true)
    setError('')
    try {
      if (dirtyRef.current && !(await save(true))) return
      if (!(idea?.readySteps ?? []).includes('refine')) {
        await markRefineReady({ channelId, ideaId })
      }
      const next = nextStepRoute('refine')
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

  if (
    idea === undefined ||
    versions === undefined ||
    current === undefined ||
    drafts === undefined ||
    wpm === undefined
  ) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (idea === null) return <Navigate to="/c/$channelId/bank" params={{ channelId }} />
  const readySteps = idea.readySteps ?? []
  const priorReady = ['idea', 'titles', 'thumbnails', 'questions', 'research', 'draft'].every((s) =>
    readySteps.includes(s),
  )
  if (!priorReady || current === null) {
    return (
      <Navigate to="/c/$channelId/bank/$bankIdeaId" params={{ channelId, bankIdeaId: ideaId }} />
    )
  }

  const stepReady = readySteps.includes('refine')
  const words = text.split(/\s+/).filter(Boolean).length
  const minutes = wpm > 0 ? Math.round((words / wpm) * 10) / 10 : 0

  // Label versions by their source draft's number when it still exists.
  const draftNumber = (sourceDraftRef: string) => {
    const ordered = [...drafts].sort((a, b) => a._creationTime - b._creationTime)
    const index = ordered.findIndex((d) => (d._id as string) === sourceDraftRef)
    return index === -1 ? null : index + 1
  }

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
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Script refinement</h2>
      </div>
      <p className="-mt-2 text-sm text-text-secondary">
        Edit the script you will record. The original draft stays untouched in the drafter.
      </p>

      {error && (
        <div className="rounded-row border border-danger px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      {versions.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Versions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {versions.map((version) => {
              const number = draftNumber(version.sourceDraftRef)
              const label = number ? `From Draft ${number}` : 'From a deleted draft'
              return (
                <button
                  key={version._id}
                  disabled={dirty || version.current}
                  onClick={() => void setCurrent({ channelId, refinementId: version._id })}
                  className={`flex min-h-11 items-center gap-1.5 rounded-row border px-3 text-xs transition-colors disabled:pointer-events-none ${
                    version.current
                      ? 'border-primary bg-primary-subtle text-text-primary'
                      : 'border-border bg-surface text-text-secondary hover:bg-surface-raised'
                  } ${dirty && !version.current ? 'opacity-50' : ''}`}
                >
                  {version.current && <Check size={12} strokeWidth={3} className="text-primary" />}
                  {label}
                  <span className="text-text-muted">{version.wordCount.toLocaleString()}w</span>
                </button>
              )
            })}
          </div>
          {dirty && (
            <p className="text-2xs text-text-muted">Save your edits before switching versions.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium text-text-secondary">Script</div>
          <Badge variant="muted">
            {words.toLocaleString()} words · ≈ {minutes} min at {wpm} wpm
          </Badge>
          <Button
            size="sm"
            variant="secondary"
            disabled={!personalizeSettings || !text.trim()}
            onClick={() => {
              if (!personalizeSettings) return
              const result = personalizeText(
                text,
                personalizeSettings.replacements,
                personalizeSettings.disabledContractions,
                personalizeSettings.compoundStyles,
              )
              if (result.count > 0) {
                setText(result.text)
                markDirty(true)
              }
              setPersonalizeNote(
                result.count > 0
                  ? `Applied ${result.count} replacement${result.count === 1 ? '' : 's'}.`
                  : 'Nothing to replace.',
              )
            }}
          >
            <WandSparkles size={13} />
            Personalize text
          </Button>
          {personalizeNote && <span className="text-xs text-text-muted">{personalizeNote}</span>}
        </div>
        <Textarea
          rows={22}
          value={text}
          placeholder="Your script…"
          onChange={(e) => {
            setText(e.target.value)
            markDirty(true)
          }}
        />
        <div className="text-2xs text-text-muted">Cmd/Ctrl+S saves without leaving the page.</div>
      </div>

      <WorkflowActionBar
        dirty={dirty}
        saving={saving}
        readying={readying}
        isReady={stepReady}
        missing={text.trim() ? [] : ['write the script']}
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
