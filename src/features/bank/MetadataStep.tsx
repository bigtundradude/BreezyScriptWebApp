import { useState } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Check, ChevronLeft, Copy } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge, Spinner } from '@/components/ui'
import { WorkflowActionBar } from '@/features/bank/WorkflowActionBar'

// Workflow step 9 — Publish Metadata (owner spec 2026-08-18): titles,
// thumbnails, and description in an easy copy-paste form for YouTube Studio.
// Thumbnails are small reference copies; the original file name tells the
// owner which full-size files to upload.
export function MetadataStep({
  channelId,
  ideaId,
}: {
  channelId: Id<'channels'>
  ideaId: Id<'bankIdeas'>
}) {
  const idea = useQuery(api.ideaBank.get, { channelId, ideaId })
  const thumbnails = useQuery(api.bankThumbnails.list, { channelId, ideaId })
  const markStepReady = useMutation(api.ideaBank.markStepReady)
  const navigate = useNavigate()

  const [copied, setCopied] = useState<string | null>(null)
  const [readying, setReadying] = useState(false)
  const [error, setError] = useState('')

  if (idea === undefined || thumbnails === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (idea === null || thumbnails === null) {
    return <Navigate to="/c/$channelId/bank" params={{ channelId }} />
  }
  const readySteps = idea.readySteps ?? []
  const priorReady = STEPS_BEFORE_METADATA.every((s) => readySteps.includes(s))
  if (!priorReady) {
    return (
      <Navigate to="/c/$channelId/bank/$bankIdeaId" params={{ channelId, bankIdeaId: ideaId }} />
    )
  }

  const overviewTo = `/c/${channelId}/bank/${ideaId}`
  const goOverview = () => void navigate({ to: overviewTo })
  const stepReady = readySteps.includes('metadata')

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 2000)
    } catch {
      setError('Copy failed — long-press the text to copy manually.')
    }
  }

  const ready = async () => {
    setReadying(true)
    setError('')
    try {
      await markStepReady({ channelId, ideaId, step: 'metadata' })
      goOverview()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark ready — try again.')
    } finally {
      setReadying(false)
    }
  }

  const copyRow = (key: string, label: string | null, text: string) => (
    <div key={key} className="flex items-start gap-1 rounded-row border border-border bg-surface py-1.5 pl-3 pr-1">
      <div className="min-w-0 flex-1 pt-1.5">
        {label && <div className="text-2xs text-text-muted">{label}</div>}
        <div className="whitespace-pre-wrap text-sm text-text-primary">{text}</div>
      </div>
      <button
        aria-label={`Copy ${label ?? 'text'}`}
        onClick={() => void copy(key, text)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
      >
        {copied === key ? <Check size={15} className="text-success" /> : <Copy size={15} />}
      </button>
    </div>
  )

  const slotThumbs = (thumbnails.slots ?? [])
    .map((slotId, index) => ({
      slot: ['A', 'B', 'C'][index],
      thumb: slotId ? thumbnails.thumbnails.find((t) => t._id === slotId) : undefined,
      title: idea.potentialTitles[index],
    }))
    .filter((entry) => entry.thumb)

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
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Publish metadata</h2>
      </div>
      <p className="-mt-3 text-sm text-text-secondary">
        Everything for YouTube Studio, ready to copy. Thumbnails are small reference copies:
        upload the original files named below.
      </p>

      {error && (
        <div className="rounded-row border border-danger px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">Titles</div>
        {idea.potentialTitles.map((title, index) =>
          copyRow(
            `title-${index}`,
            idea.primaryTitleIndex === index ? 'Main title' : `Alternate ${index + 1}`,
            title,
          ),
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Description
        </div>
        {copyRow('description', null, idea.description)}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Thumbnails (for reference)
        </div>
        {slotThumbs.length === 0 && (
          <p className="text-xs text-text-muted">No thumbnails uploaded.</p>
        )}
        {slotThumbs.map(({ slot, thumb, title }) => (
          <div key={slot} className="flex items-center gap-3 rounded-row border border-border bg-surface p-2.5">
            <img
              src={thumb!.url ?? undefined}
              alt={thumb!.originalFileName}
              className="h-14 w-auto shrink-0 rounded-control border border-border-subtle object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="muted">{slot}</Badge>
                <span className="truncate text-sm font-medium text-text-primary">
                  {thumb!.originalFileName}
                </span>
              </div>
              {title && <p className="mt-0.5 truncate text-xs text-text-secondary">{title}</p>}
            </div>
          </div>
        ))}
      </div>

      <WorkflowActionBar
        dirty={false}
        saving={false}
        readying={readying}
        isReady={stepReady}
        missing={[]}
        onCancel={goOverview}
        onSave={() => {}}
        onDone={goOverview}
        onReady={() => void ready()}
      />
    </div>
  )
}

const STEPS_BEFORE_METADATA = [
  'idea',
  'titles',
  'thumbnails',
  'questions',
  'research',
  'draft',
  'refine',
  'record',
]
