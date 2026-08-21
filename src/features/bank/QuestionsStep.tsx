import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useBlocker, useNavigate } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Check, ChevronLeft, Sparkles } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Button, ConfirmDialog, Spinner, Textarea } from '@/components/ui'
import { WorkflowActionBar } from '@/features/bank/WorkflowActionBar'
import { nextStepRoute } from '@/features/bank/steps'

// Workflow step 4 — Leading Questions (docs/idea-workflow-plan.md §5c).
// Flow: review the two must-answer questions → generate 25 topic-specific
// ones → multi-select the ones to answer → record a freeflow audio answer
// elsewhere → paste the transcript here → Ready.
export function QuestionsStep({
  channelId,
  ideaId,
}: {
  channelId: Id<'channels'>
  ideaId: Id<'bankIdeas'>
}) {
  const idea = useQuery(api.ideaBank.get, { channelId, ideaId })
  const questions = useQuery(api.bankQuestions.list, { channelId, ideaId })
  const ensureRequired = useMutation(api.bankQuestions.ensureRequired)
  const toggleSelected = useMutation(api.bankQuestions.toggleSelected)
  const generateQuestions = useAction(api.bankQuestions.generate)
  const updateTranscript = useMutation(api.ideaBank.updateQuestionsTranscript)
  const markStepReady = useMutation(api.ideaBank.markStepReady)
  const navigate = useNavigate()

  const [transcript, setTranscript] = useState('')
  const [dirty, setDirty] = useState(false)
  const dirtyRef = useRef(false)
  const markDirty = (value: boolean) => {
    dirtyRef.current = value
    setDirty(value)
  }
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [readying, setReadying] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateMessage, setGenerateMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (loaded || !idea) return
    setTranscript(idea.questionsTranscript ?? '')
    setLoaded(true)
  }, [idea, loaded])

  // Seed the two required questions the first time the step opens.
  const ensuredRef = useRef(false)
  useEffect(() => {
    if (ensuredRef.current || !idea) return
    ensuredRef.current = true
    void ensureRequired({ channelId, ideaId })
  }, [idea, channelId, ideaId, ensureRequired])

  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    withResolver: true,
    enableBeforeUnload: () => dirtyRef.current,
  })

  const overviewTo = `/c/${channelId}/bank/${ideaId}`
  const goOverview = useCallback(() => void navigate({ to: overviewTo }), [navigate, overviewTo])
  // Ready always advances to the next step (owner, 2026-08-21).
  const goNext = useCallback(() => {
    const next = nextStepRoute('questions')
    void navigate({ to: next ? `${overviewTo}/${next}` : overviewTo })
  }, [navigate, overviewTo])

  const save = useCallback(
    async (stay: boolean) => {
      setSaving(true)
      setError('')
      try {
        await updateTranscript({ channelId, ideaId, transcript })
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
    [channelId, ideaId, transcript, updateTranscript, goOverview],
  )

  // Ready = save unsaved edits, mark the step ready, go to the next step.
  const ready = async () => {
    setReadying(true)
    setError('')
    try {
      if (dirtyRef.current && !(await save(true))) return
      if (!(idea?.readySteps ?? []).includes('questions')) {
        await markStepReady({ channelId, ideaId, step: 'questions' })
      }
      goNext()
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

  if (idea === undefined || questions === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (idea === null) return <Navigate to="/c/$channelId/bank" params={{ channelId }} />
  const readySteps = idea.readySteps ?? []
  if (!readySteps.includes('idea') || !readySteps.includes('titles') || !readySteps.includes('thumbnails')) {
    return (
      <Navigate to="/c/$channelId/bank/$bankIdeaId" params={{ channelId, bankIdeaId: ideaId }} />
    )
  }

  const required = questions.filter((q) => q.source === 'required')
  const generated = questions.filter((q) => q.source === 'generated')
  const generatedGroups = new Map<string, Doc<'bankQuestions'>[]>()
  for (const question of generated) {
    const list = generatedGroups.get(question.category) ?? []
    list.push(question)
    generatedGroups.set(question.category, list)
  }
  const selectedCount = questions.filter((q) => q.selected).length

  const stepReady = readySteps.includes('questions')
  const missing = transcript.trim() ? [] : ['paste the transcript of your recorded answers']

  const questionRow = (question: Doc<'bankQuestions'>) => (
    <div
      key={question._id}
      className="flex items-start gap-1 rounded-row border border-border bg-surface py-1.5 pl-3 pr-1"
    >
      <span className="min-w-0 flex-1 pt-2 text-sm leading-snug text-text-primary">
        {question.text}
      </span>
      <button
        role="checkbox"
        aria-checked={question.selected}
        aria-label={question.selected ? 'Remove from your answer plan' : 'Plan to answer this question'}
        onClick={() => void toggleSelected({ channelId, questionId: question._id })}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control transition-colors hover:bg-surface-raised"
      >
        <span
          className={`flex h-5.5 w-5.5 items-center justify-center rounded-full border-2 transition-colors ${
            question.selected ? 'border-primary bg-primary' : 'border-border bg-transparent'
          }`}
        >
          {question.selected && <Check size={13} strokeWidth={3} className="text-text-inverse" />}
        </span>
      </button>
    </div>
  )

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
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Leading questions</h2>
      </div>
      <p className="-mt-2 text-sm text-text-secondary">
        Pick the questions you'll answer, then record a freeflow audio take using them as your
        guide. Convert the audio to text and paste the transcript below.
      </p>

      {error && (
        <div className="rounded-row border border-danger px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Must-answer questions
        </div>
        {required.map(questionRow)}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Topic questions
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={generating}
            onClick={async () => {
              setGenerating(true)
              setGenerateMessage('')
              setError('')
              try {
                const result = await generateQuestions({ channelId, ideaId })
                if (result.error) setError(result.error)
                else setGenerateMessage(`Generated ${result.inserted} questions.`)
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Generation failed — try again.')
              } finally {
                setGenerating(false)
              }
            }}
          >
            <Sparkles size={13} />
            {generated.length > 0 ? 'Regenerate' : 'Generate 25 questions'}
          </Button>
          {generateMessage && <span className="text-xs text-text-muted">{generateMessage}</span>}
          {selectedCount > 0 && (
            <span className="text-xs text-text-muted">{selectedCount} selected</span>
          )}
        </div>
        {generated.length === 0 && !generating && (
          <p className="text-xs text-text-secondary">
            25 questions built for this exact topic: your stories, your process, the problems your
            viewers hit, and what you'd do about them. Selected questions survive regeneration.
          </p>
        )}
        {[...generatedGroups.entries()].map(([category, list]) => (
          <div key={category} className="flex flex-col gap-1.5">
            <div className="text-xs font-semibold text-text-secondary">{category}</div>
            {list.map(questionRow)}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <Textarea
          label="Have you recorded your answers and converted them to text? Paste here."
          rows={10}
          placeholder="Paste the transcript of your freeflow answers…"
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value)
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
        missing={missing}
        onCancel={goOverview}
        onSave={() => void save(true)}
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
