import { useState } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, Monitor } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge, Button, Markdown, Spinner } from '@/components/ui'
import { Teleprompter } from '@/features/bank/Teleprompter'
import { WorkflowActionBar } from '@/features/bank/WorkflowActionBar'
import { nextStepRoute } from '@/features/bank/steps'

// Workflow step 8 — Ready to Record (docs/idea-workflow-plan.md §5b): the
// current refinement script, strictly read-only (editing lives in step 7),
// with the full ported teleprompter (font size / width / speed controls,
// Space play/pause, Esc close, persistent prefs).
export function RecordStep({
  channelId,
  ideaId,
}: {
  channelId: Id<'channels'>
  ideaId: Id<'bankIdeas'>
}) {
  const idea = useQuery(api.ideaBank.get, { channelId, ideaId })
  const current = useQuery(api.bankDrafts.getCurrentRefinement, { channelId, ideaId })
  const wpm = useQuery(api.pace.getWordsPerMinute, { channelId })
  const markStepReady = useMutation(api.ideaBank.markStepReady)
  const navigate = useNavigate()

  const [teleprompter, setTeleprompter] = useState(false)
  const [readying, setReadying] = useState(false)
  const [error, setError] = useState('')

  if (idea === undefined || current === undefined || wpm === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (idea === null) return <Navigate to="/c/$channelId/bank" params={{ channelId }} />
  const readySteps = idea.readySteps ?? []
  const priorReady = ['idea', 'titles', 'thumbnails', 'questions', 'research', 'draft', 'refine'].every(
    (s) => readySteps.includes(s),
  )
  if (!priorReady || current === null) {
    return (
      <Navigate to="/c/$channelId/bank/$bankIdeaId" params={{ channelId, bankIdeaId: ideaId }} />
    )
  }

  const overviewTo = `/c/${channelId}/bank/${ideaId}`
  const goOverview = () => void navigate({ to: overviewTo })
  const stepReady = readySteps.includes('record')
  const words = current.text.split(/\s+/).filter(Boolean).length
  const minutes = wpm > 0 ? Math.round((words / wpm) * 10) / 10 : 0

  // Ready = mark the step ready (read-only step), go to the next step.
  const ready = async () => {
    setReadying(true)
    setError('')
    try {
      if (!stepReady) await markStepReady({ channelId, ideaId, step: 'record' })
      const next = nextStepRoute('record')
      void navigate({ to: next ? `${overviewTo}/${next}` : overviewTo })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark ready — try again.')
    } finally {
      setReadying(false)
    }
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
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Ready to record</h2>
      </div>
      <p className="-mt-2 text-sm text-text-secondary">
        The final script, read-only. Edits happen in Script Refinement.
      </p>

      {error && (
        <div className="rounded-row border border-danger px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="muted">
          {words.toLocaleString()} words · ≈ {minutes} min at {wpm} wpm
        </Badge>
        <Button size="sm" variant="secondary" onClick={() => setTeleprompter(true)}>
          <Monitor size={13} />
          Teleprompter
        </Button>
      </div>

      <div className="rounded-panel border border-border bg-surface px-4 py-4 text-[15px] leading-relaxed">
        <Markdown>{current.text}</Markdown>
      </div>

      <WorkflowActionBar
        dirty={false}
        saving={false}
        readying={readying}
        isReady={stepReady}
        missing={[]}
        onCancel={goOverview}
        onSave={() => {}}
        onReady={() => void ready()}
      />

      <Teleprompter text={current.text} open={teleprompter} onClose={() => setTeleprompter(false)} />
    </div>
  )
}
