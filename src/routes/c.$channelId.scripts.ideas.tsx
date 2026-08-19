import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Check, Hammer, Lightbulb, Plus, Trash2, X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { ListPage } from '@/components/layout/ListPage'
import { ListCard } from '@/components/layout/ListCard'
import { Badge, Button, EmptyState, Input, MegapromptPanel, Textarea } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'
import { usePromptContext } from '@/features/scripts/usePromptContext'
import {
  composeConceptPrompt,
  parseJsonLenient,
  toMegaprompt,
  type ConceptResult,
} from '@/lib/megaprompt'

export const Route = createFileRoute('/c/$channelId/scripts/ideas')({
  component: IdeasPage,
})

const STATUS_BADGE: Record<Doc<'ideas'>['status'], { label: string; variant: 'muted' | 'info' | 'success' | 'danger' } | null> = {
  new: null,
  in_production: { label: 'in production', variant: 'info' },
  finished: { label: 'finished', variant: 'success' },
  rejected: { label: 'rejected', variant: 'danger' },
}

function IdeasPage() {
  const { channelId } = Route.useParams()
  const cid = channelId as Id<'channels'>
  const navigate = useNavigate()
  const ideas = useQuery(api.ideas.list, { channelId: cid })
  const productions = useQuery(api.productions.list, { channelId: cid })
  const create = useMutation(api.ideas.create)
  const update = useMutation(api.ideas.update)
  const remove = useMutation(api.ideas.remove)
  const applyConcepts = useMutation(api.ideas.applyConcepts)
  const createProduction = useMutation(api.productions.create)
  const ctx = usePromptContext(cid)

  const [title, setTitle] = useState('')
  const [steerNotes, setSteerNotes] = useState('')
  const [applyMessage, setApplyMessage] = useState('')
  const [showDone, setShowDone] = useState(false)
  const { confirm, ConfirmUI } = useConfirm()

  const confirmDelete = async (idea: Doc<'ideas'>) => {
    const ok = await confirm({
      title: `Delete “${idea.title}”?`,
      message: 'The idea is permanently removed from the backlog.',
      confirmLabel: 'Delete',
    })
    if (ok) await remove({ channelId: cid, ideaId: idea._id })
  }

  const submit = async () => {
    if (!title.trim()) return
    await create({ channelId: cid, title })
    setTitle('')
  }

  const build = async (idea: Doc<'ideas'>) => {
    const productionId = await createProduction({
      channelId: cid,
      name: idea.title,
      ideaId: idea._id,
      angle: idea.angle,
    })
    void navigate({ to: `/c/${channelId}/scripts/build/${productionId}` })
  }

  const openProduction = (idea: Doc<'ideas'>) => {
    const production = (productions ?? []).find((p) => p.ideaId === idea._id)
    if (!production) return
    const target =
      production.status === 'building'
        ? `/c/${channelId}/scripts/build/${production._id}`
        : `/c/${channelId}/scripts/review/${production._id}`
    void navigate({ to: target })
  }

  const loading = ideas === undefined
  const visible = (ideas ?? []).filter((idea) =>
    showDone ? true : idea.status === 'new' || idea.status === 'in_production',
  )
  const hiddenCount = (ideas ?? []).length - visible.length

  return (
    <ListPage
      title="Ideas"
      description="The backlog. Build turns an idea into a production."
      action={
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type an idea"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            className="w-72 max-md:w-48"
          />
          <Button disabled={!title.trim()} onClick={() => void submit()}>
            <Plus size={14} />
            Add
          </Button>
        </div>
      }
      loading={loading}
    >
      {/* Empty state renders inline (not via ListPage's isEmpty) so the
          generate-concepts panel below stays visible on an empty backlog. */}
      {visible.length === 0 && (
        <EmptyState
          icon={Lightbulb}
          title="No ideas yet"
          description="Type one above, or generate ranked concepts with your AI below."
        />
      )}
      {visible.map((idea) => {
        const badge = STATUS_BADGE[idea.status]
        const inProduction = idea.status === 'in_production'
        return (
          <ListCard key={idea._id} icon={Lightbulb}>
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-text-primary">{idea.title}</span>
              {idea.sourceRef === 'concept' && <Badge variant="muted">concept</Badge>}
              {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
            </div>
            {idea.angle && (
              <p className="mt-0.5 truncate text-xs text-text-secondary">{idea.angle}</p>
            )}
            <div className="mt-1.5 flex items-center gap-3">
              {idea.status === 'new' && (
                <>
                  <button
                    onClick={() => void build(idea)}
                    className="flex items-center gap-1 text-2xs font-medium text-primary hover:underline"
                  >
                    <Hammer size={11} />
                    Build
                  </button>
                  <button
                    onClick={() => void update({ channelId: cid, ideaId: idea._id, status: 'rejected' })}
                    className="flex items-center gap-1 text-2xs text-text-muted hover:text-danger"
                  >
                    <X size={11} />
                    Reject
                  </button>
                </>
              )}
              {inProduction && (
                <>
                  <button
                    onClick={() => openProduction(idea)}
                    className="text-2xs font-medium text-primary hover:underline"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => void update({ channelId: cid, ideaId: idea._id, status: 'finished' })}
                    className="flex items-center gap-1 text-2xs text-text-muted hover:text-success"
                  >
                    <Check size={11} />
                    Mark finished
                  </button>
                </>
              )}
              {(idea.status === 'finished' || idea.status === 'rejected') && (
                <button
                  onClick={() => void update({ channelId: cid, ideaId: idea._id, status: 'new' })}
                  className="text-2xs text-text-muted hover:text-text-primary"
                >
                  Reopen
                </button>
              )}
              <button
                onClick={() => void confirmDelete(idea)}
                className="flex items-center gap-1 text-2xs text-text-muted hover:text-danger"
              >
                <Trash2 size={11} />
                Delete
              </button>
            </div>
          </ListCard>
        )
      })}

      {hiddenCount > 0 && !showDone && (
        <button
          onClick={() => setShowDone(true)}
          className="self-start text-xs text-text-muted underline underline-offset-2 hover:text-text-secondary"
        >
          Show {hiddenCount} finished/rejected
        </button>
      )}
      {showDone && (
        <button
          onClick={() => setShowDone(false)}
          className="self-start text-xs text-text-muted underline underline-offset-2 hover:text-text-secondary"
        >
          Hide finished/rejected
        </button>
      )}

      <div className="mt-2 flex flex-col gap-2">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Generate concepts
        </div>
        <Textarea
          rows={2}
          placeholder="Steer the concepts (optional): themes, constraints, seeds…"
          value={steerNotes}
          onChange={(e) => setSteerNotes(e.target.value)}
        />
        <MegapromptPanel
          what="video concepts"
          disabled={!ctx}
          hint={applyMessage || 'Produces 8 ranked concepts grounded in your audience and framework.'}
          getPrompt={async () => {
            if (!ctx) throw new Error('Still loading channel context — try again in a second.')
            return toMegaprompt(composeConceptPrompt(ctx, 8, steerNotes))
          }}
          onApply={async (raw) => {
            const parsed = parseJsonLenient(raw) as ConceptResult | null
            const concepts = Array.isArray(parsed?.video_concepts) ? parsed.video_concepts : null
            if (!concepts || concepts.length === 0) {
              throw new Error(
                "Couldn't find a concepts list in the reply. Paste the model's entire ```json block and try Apply again.",
              )
            }
            const result = await applyConcepts({
              channelId: cid,
              concepts: concepts.map((concept) => ({
                title: String(concept.working_title ?? ''),
                angle: String(concept.description_angle ?? ''),
              })),
            })
            setApplyMessage(
              `Added ${result.inserted} idea${result.inserted === 1 ? '' : 's'}${result.rejected ? ` (${result.rejected} duplicates skipped)` : ''}.`,
            )
          }}
        />
      </div>
      {ConfirmUI}
    </ListPage>
  )
}
