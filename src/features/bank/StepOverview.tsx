import { Navigate, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Check, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge, Spinner } from '@/components/ui'
import { RatingBadge } from '@/features/bank/StarRating'
import { STATUS_BADGE } from '@/features/bank/lib'
import { STEPS, isStepUnlocked } from '@/features/bank/steps'

// The workflow front door once step 1 is ready: stacked step cards, one per
// step, mobile-first (docs/idea-workflow-plan.md §2). Ready → check badge;
// unlocked → tappable; locked → dimmed with a lock.
export function StepOverview({
  channelId,
  ideaId,
}: {
  channelId: Id<'channels'>
  ideaId: Id<'bankIdeas'>
}) {
  const idea = useQuery(api.ideaBank.get, { channelId, ideaId })
  const navigate = useNavigate()

  if (idea === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (idea === null) return <Navigate to="/c/$channelId/bank" params={{ channelId }} />

  const readySteps = idea.readySteps ?? []
  // A fresh idea IS step 1 — no overview until it's ready.
  if (!readySteps.includes('idea')) {
    return (
      <Navigate
        to="/c/$channelId/bank/$bankIdeaId/idea"
        params={{ channelId, bankIdeaId: ideaId }}
        replace
      />
    )
  }

  const statusBadge = STATUS_BADGE[idea.status]

  return (
    <div className="mx-auto flex max-w-190 flex-col gap-4 px-4 py-5 md:px-8 md:py-7">
      <button
        onClick={() => void navigate({ to: `/c/${channelId}/bank` })}
        className="flex min-h-11 w-fit items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        <ChevronLeft size={15} />
        Idea Bank
      </button>

      <div className="flex items-center gap-3">
        <RatingBadge value={idea.rating} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold tracking-[-0.01em] text-text-primary">
              {idea.title}
            </h2>
            {statusBadge && <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>}
          </div>
          <p className="text-xs text-text-muted">
            {readySteps.length} of {STEPS.length} steps ready
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {STEPS.map((step, index) => {
          const isReady = readySteps.includes(step.id)
          const unlocked = isStepUnlocked(index, readySteps)
          const tappable = unlocked && Boolean(step.route)
          const inner = (
            <>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-row border ${
                  isReady
                    ? 'border-success/30 bg-success/10 text-success'
                    : unlocked
                      ? 'border-border bg-surface-raised text-text-secondary'
                      : 'border-border-subtle bg-transparent text-text-muted'
                }`}
              >
                <step.icon size={17} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold text-text-muted">{index + 1}</span>
                  <span className="truncate text-sm font-medium text-text-primary">{step.name}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{step.blurb}</p>
              </div>
              {isReady ? (
                <span className="flex items-center gap-1 text-2xs font-medium text-success">
                  <Check size={13} strokeWidth={3} />
                  Ready
                </span>
              ) : tappable ? (
                <ChevronRight size={15} className="shrink-0 text-text-muted" />
              ) : unlocked ? (
                // Unlocked by the workflow but the step page isn't built yet.
                <span className="shrink-0 text-2xs font-medium text-text-muted">soon</span>
              ) : (
                <Lock size={14} className="shrink-0 text-text-muted" />
              )}
            </>
          )
          if (tappable) {
            return (
              <button
                key={step.id}
                onClick={() =>
                  void navigate({ to: `/c/${channelId}/bank/${ideaId}/${step.route}` })
                }
                className="flex min-h-16 w-full cursor-pointer select-none items-center gap-3 rounded-row border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {inner}
              </button>
            )
          }
          return (
            <div
              key={step.id}
              aria-disabled
              className={`flex min-h-16 items-center gap-3 rounded-row border border-border-subtle bg-surface px-4 py-3 ${
                unlocked ? '' : 'opacity-55'
              }`}
            >
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
