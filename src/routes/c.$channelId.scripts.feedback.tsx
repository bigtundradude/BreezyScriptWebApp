import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { BarChart3, Check, Plus, Trash2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Markdown,
  MegapromptPanel,
  Spinner,
  Textarea,
} from '@/components/ui'
import { usePromptContext } from '@/features/scripts/usePromptContext'
import {
  composeFeedbackPrompt,
  parseJsonLenient,
  renderFeedbackMarkdown,
  toMegaprompt,
  type FeedbackResult,
} from '@/lib/megaprompt'

export const Route = createFileRoute('/c/$channelId/scripts/feedback')({
  validateSearch: (search: Record<string, unknown>): { selected?: string } => ({
    selected: typeof search.selected === 'string' ? search.selected : undefined,
  }),
  component: FeedbackPage,
})

function FeedbackPage() {
  const { channelId } = Route.useParams()
  const { selected } = Route.useSearch()
  const cid = channelId as Id<'channels'>
  const navigate = useNavigate({ from: Route.fullPath })
  const entries = useQuery(api.feedbackFns.list, { channelId: cid })
  const create = useMutation(api.feedbackFns.create)
  const [newTitle, setNewTitle] = useState('')

  const selectedEntry = (entries ?? []).find((e) => e._id === selected) ?? null

  const add = async () => {
    if (!newTitle.trim()) return
    const id = await create({ channelId: cid, title: newTitle })
    setNewTitle('')
    void navigate({ search: { selected: id } })
  }

  return (
    <div className="flex h-full flex-col gap-5 px-8 py-7">
      <div>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Feedback</h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          Post-mortems on published videos. Approved proposals rewrite your audience snippet and
          re-rank your title shapes — the loop that makes the next script better.
        </p>
      </div>

      {entries === undefined ? (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner size={14} /> Loading…
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-5">
          <div className="flex w-64 shrink-0 flex-col gap-2 overflow-y-auto">
            <div className="flex gap-1.5">
              <Input
                placeholder="Video title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void add()}
                className="flex-1"
              />
              <Button size="sm" iconOnly disabled={!newTitle.trim()} onClick={() => void add()} className="h-9 w-9">
                <Plus size={14} />
              </Button>
            </div>
            {entries.map((entry) => (
              <button
                key={entry._id}
                onClick={() => void navigate({ search: { selected: entry._id } })}
                className={`rounded-row border px-3 py-2.5 text-left transition-colors ${
                  entry._id === selectedEntry?._id
                    ? 'border-primary bg-surface'
                    : 'border-border bg-surface hover:bg-surface-raised'
                }`}
              >
                <div className="truncate text-sm text-text-primary">{entry.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {entry.result != null ? (
                    <Badge variant="success">analyzed</Badge>
                  ) : (
                    <Badge variant="muted">pending</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto">
            {selectedEntry ? (
              <FeedbackDetail key={selectedEntry._id} entry={selectedEntry} channelId={cid} />
            ) : (
              <EmptyState
                icon={BarChart3}
                title="Pick a video"
                description="Add a published video on the left, then paste its numbers and fresh comments."
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FeedbackDetail({ entry, channelId }: { entry: Doc<'feedback'>; channelId: Id<'channels'> }) {
  const update = useMutation(api.feedbackFns.update)
  const remove = useMutation(api.feedbackFns.remove)
  const applyResult = useMutation(api.feedbackFns.applyResult)
  const applyAudienceUpdates = useMutation(api.feedbackFns.applyAudienceUpdates)
  const applyReranks = useMutation(api.feedbackFns.applyReranks)
  const ctx = usePromptContext(channelId)
  const navigate = useNavigate()

  const [title, setTitle] = useState(entry.title)
  const [metrics, setMetrics] = useState(entry.metrics)
  const [comments, setComments] = useState(entry.sourceInput)
  const [checkedUpdates, setCheckedUpdates] = useState<Set<string>>(new Set())
  const [applyingUpdates, setApplyingUpdates] = useState(false)
  const [applyingReranks, setApplyingReranks] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const result = (entry.result ?? null) as
    | (FeedbackResult & { applied_audience_updates?: string[]; applied_reranks?: boolean })
    | null

  const proposedUpdates = result?.proposed_audience_updates ?? []
  const appliedUpdates = new Set(result?.applied_audience_updates ?? [])
  const proposedReranks = result?.proposed_template_reranks ?? []

  useEffect(() => {
    setCheckedUpdates(new Set(proposedUpdates.filter((u) => !appliedUpdates.has(u))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.result])

  const persist = () => void update({ channelId, feedbackId: entry._id, title, metrics, sourceInput: comments })

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-end gap-2.5">
        <Input
          label="Video"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={persist}
          className="flex-1"
        />
        <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
          <Trash2 size={13} className="text-danger" />
        </Button>
      </div>
      <Input
        label="Metrics"
        placeholder="e.g. CTR 4.2%, AVD 41%, 12k views in 48h"
        value={metrics}
        onChange={(e) => setMetrics(e.target.value)}
        onBlur={persist}
      />
      <Textarea
        label="New comments"
        rows={6}
        placeholder="Paste fresh comments — signal for what landed and what confused."
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        onBlur={persist}
      />

      <MegapromptPanel
        what="the performance report"
        disabled={!metrics.trim() || !ctx}
        getPrompt={async () => {
          if (!ctx) throw new Error('Still loading channel context — try again in a second.')
          await update({ channelId, feedbackId: entry._id, title, metrics, sourceInput: comments })
          return toMegaprompt(composeFeedbackPrompt(ctx, { title, metrics, comments }))
        }}
        onApply={async (raw) => {
          const parsed = parseJsonLenient(raw) as FeedbackResult | null
          if (!parsed || typeof parsed !== 'object' || !parsed.diagnosis) {
            throw new Error(
              "Couldn't find a report in the reply. Paste the model's entire ```json block and try Apply again.",
            )
          }
          await applyResult({
            channelId,
            feedbackId: entry._id,
            result: parsed,
            resultMarkdown: renderFeedbackMarkdown(metrics, parsed),
          })
        }}
      />

      {entry.resultMarkdown && (
        <div className="rounded-row border border-border bg-surface p-4">
          <Markdown>{entry.resultMarkdown}</Markdown>
        </div>
      )}

      {proposedUpdates.length > 0 && (
        <div className="rounded-row border border-border bg-surface p-4">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Proposed audience updates
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {proposedUpdates.map((proposal) => {
              const applied = appliedUpdates.has(proposal)
              return (
                <label key={proposal} className="flex items-start gap-2 text-sm text-text-secondary">
                  {applied ? (
                    <Check size={14} className="mt-0.5 shrink-0 text-success" />
                  ) : (
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-(--color-primary)"
                      checked={checkedUpdates.has(proposal)}
                      onChange={(e) => {
                        const next = new Set(checkedUpdates)
                        if (e.target.checked) next.add(proposal)
                        else next.delete(proposal)
                        setCheckedUpdates(next)
                      }}
                    />
                  )}
                  <span className={applied ? 'text-text-muted line-through' : ''}>{proposal}</span>
                </label>
              )
            })}
          </div>
          {proposedUpdates.some((u) => !appliedUpdates.has(u)) && (
            <Button
              size="sm"
              className="mt-3"
              loading={applyingUpdates}
              disabled={checkedUpdates.size === 0}
              onClick={() => {
                setApplyingUpdates(true)
                setApplyError('')
                void applyAudienceUpdates({
                  channelId,
                  feedbackId: entry._id,
                  updates: [...checkedUpdates],
                })
                  .catch((e) =>
                    setApplyError(e instanceof Error ? e.message : 'Could not apply the updates.'),
                  )
                  .finally(() => setApplyingUpdates(false))
              }}
            >
              Append {checkedUpdates.size} to audience snippet
            </Button>
          )}
        </div>
      )}

      {proposedReranks.length > 0 && (
        <div className="rounded-row border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
              Proposed template re-ranks
            </span>
            {result?.applied_reranks && <Badge variant="success">applied</Badge>}
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {proposedReranks.map((rerank, i) => (
              <li key={i} className="text-sm text-text-secondary">
                <Badge variant={rerank.direction === 'down' ? 'danger' : 'success'}>
                  {rerank.direction === 'down' ? '↓' : '↑'}
                </Badge>{' '}
                <span className="text-text-primary">{rerank.template}</span> — {rerank.reason}
              </li>
            ))}
          </ul>
          {!result?.applied_reranks && (
            <Button
              size="sm"
              className="mt-3"
              loading={applyingReranks}
              onClick={() => {
                setApplyingReranks(true)
                setApplyError('')
                void applyReranks({
                  channelId,
                  feedbackId: entry._id,
                  // Coerce model-authored fields — a missing direction defaults to 'up'.
                  reranks: proposedReranks.map((r) => ({
                    template: String(r.template ?? ''),
                    direction: String(r.direction ?? 'up'),
                  })),
                })
                  .catch((e) =>
                    setApplyError(e instanceof Error ? e.message : 'Could not apply the re-ranks.'),
                  )
                  .finally(() => setApplyingReranks(false))
              }}
            >
              Apply re-ranks
            </Button>
          )}
        </div>
      )}
      {applyError && <div className="text-sm text-warning">{applyError}</div>}

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          void remove({ channelId, feedbackId: entry._id }).then(() =>
            navigate({ to: '.', search: { selected: undefined } }),
          )
        }}
        title={`Delete “${entry.title}”?`}
        message="The feedback entry and its report are permanently removed. Already-applied changes stay applied."
        confirmLabel="Delete"
      />
    </div>
  )
}
