import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, MonitorPlay } from 'lucide-react'
import { ScriptPreview } from '@/features/scripts/ScriptPreview'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Badge, Button, CopyBlock, CopyButton, Markdown, Spinner } from '@/components/ui'
import { SendToSecondBrainButton } from '@/components/shared/SendToSecondBrainButton'

export const Route = createFileRoute('/c/$channelId/scripts/review/$productionId')({
  component: ReviewPage,
})

function ReviewPage() {
  const { channelId, productionId } = Route.useParams()
  const cid = channelId as Id<'channels'>
  const pid = productionId as Id<'productions'>
  const production = useQuery(api.productions.get, { channelId: cid, productionId: pid })
  const setStatus = useMutation(api.productions.setStatus)
  const navigate = useNavigate()
  const [teleprompterOpen, setTeleprompterOpen] = useState(false)

  if (production === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (production === null) {
    return <div className="px-8 py-7 text-sm text-danger">Production not found.</div>
  }

  const mainTitle = production.chosenTitles.find((t) => t.main)?.text || production.name
  const alternates = production.chosenTitles.filter((t) => !t.main)
  const thumb = production.chosenThumbnail as Record<string, unknown> | undefined
  const meta = production.metadata
  const descriptionText = meta.description
    ? `${meta.description.firstLine}\n\n${meta.description.body}`
    : ''
  const chaptersText = meta.chapters.map((c) => `${c.timestamp} ${c.title}`).join('\n')
  const tagsText = meta.tags.join(', ')

  return (
    <div className="mx-auto flex max-w-200 flex-col gap-5 px-8 py-7">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void navigate({ to: `/c/${channelId}/scripts/build` })}
          className="flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Build
        </button>
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold tracking-[-0.01em] text-text-primary">
          {production.name}
        </h2>
        <Badge variant={production.status === 'ready' ? 'success' : 'muted'}>
          {production.status === 'ready' ? 'ready to record' : 'archived'}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            void setStatus({ channelId: cid, productionId: pid, status: 'building' }).then(() =>
              navigate({ to: `/c/${channelId}/scripts/build/${productionId}` }),
            )
          }
        >
          {production.status === 'archived' ? 'Restore to draft' : 'Back to draft'}
        </Button>
        {production.status === 'ready' ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void setStatus({ channelId: cid, productionId: pid, status: 'archived' })}
          >
            Archive
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void setStatus({ channelId: cid, productionId: pid, status: 'ready' })}
          >
            Mark ready again
          </Button>
        )}
        <div className="flex-1" />
        <SendToSecondBrainButton
          channelId={cid}
          sourceRef={`scriptpro:${production._id}`}
          kind="script"
          title={mainTitle}
          body={production.draftMarkdown}
          size="md"
        />
      </div>

      <div className="rounded-row border border-border bg-surface p-4">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Packaging
        </div>
        <div className="mt-2 flex items-start gap-2">
          <p className="flex-1 text-md font-semibold text-text-primary">{mainTitle}</p>
          <CopyButton text={mainTitle} label="Copy title" />
        </div>
        {alternates.length > 0 && (
          <div className="mt-1 text-xs text-text-muted">
            A/B alternates: {alternates.map((t) => t.text).join(' · ')}
          </div>
        )}
        {thumb && (
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            <span className="text-text-muted">Thumbnail:</span>{' '}
            {String(thumb.direction ?? '')} — {String(thumb.depicts ?? '')}
            {typeof thumb.text_overlay === 'string' && thumb.text_overlay
              ? ` · overlay: “${thumb.text_overlay}”`
              : ''}
          </p>
        )}
      </div>

      <div className="rounded-row border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Script
          </span>
          <span className="text-2xs text-text-muted">
            {production.draftMarkdown.split(/\s+/).filter(Boolean).length.toLocaleString()} words
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setTeleprompterOpen(true)}
            disabled={!production.draftMarkdown.trim()}
            className="flex items-center gap-1.5 rounded-control p-1 text-xs text-text-muted transition-colors hover:text-text-primary disabled:opacity-40"
          >
            <MonitorPlay size={13} />
            Teleprompter
          </button>
          <CopyButton text={production.draftMarkdown} label="Copy script" showLabel />
        </div>
        <div className="mt-3 max-h-100 overflow-y-auto">
          <Markdown>{production.draftMarkdown || '*No script.*'}</Markdown>
        </div>
      </div>

      {meta.description && (
        <div className="flex flex-col gap-3">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Metadata
          </div>
          <CopyBlock text={descriptionText} label="Copy description" maxHeight={180} />
          {chaptersText && <CopyBlock text={chaptersText} label="Copy chapters" maxHeight={140} />}
          {tagsText && <CopyBlock text={tagsText} label="Copy tags" maxHeight={80} />}
        </div>
      )}
      <ScriptPreview
        text={production.draftMarkdown}
        open={teleprompterOpen}
        onClose={() => setTeleprompterOpen(false)}
      />
    </div>
  )
}
