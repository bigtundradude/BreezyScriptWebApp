import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Clapperboard, Plus, Trash2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { ListPage } from '@/components/layout/ListPage'
import { ListCard } from '@/components/layout/ListCard'
import { Badge, Button, ConfirmDialog, EmptyState, Input } from '@/components/ui'
import { Tabs } from '@/components/ui/Tabs'
import { formatDate } from '@/lib/utils'

type BuildTab = 'drafts' | 'ready' | 'archived'
const TAB_STATUS: Record<BuildTab, Doc<'productions'>['status']> = {
  drafts: 'building',
  ready: 'ready',
  archived: 'archived',
}

export const Route = createFileRoute('/c/$channelId/scripts/build/')({
  validateSearch: (search: Record<string, unknown>): { tab?: BuildTab } => ({
    tab: ['drafts', 'ready', 'archived'].includes(search.tab as string)
      ? (search.tab as BuildTab)
      : undefined,
  }),
  component: ProductionsPage,
})

function ProductionsPage() {
  const { channelId } = Route.useParams()
  const { tab = 'drafts' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const productions = useQuery(api.productions.list, { channelId: channelId as Id<'channels'> })
  const create = useMutation(api.productions.create)
  const remove = useMutation(api.productions.remove)

  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Doc<'productions'> | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loading = productions === undefined
  const buckets: Record<BuildTab, Doc<'productions'>[]> = { drafts: [], ready: [], archived: [] }
  for (const production of productions ?? []) {
    const bucket = (Object.keys(TAB_STATUS) as BuildTab[]).find(
      (key) => TAB_STATUS[key] === production.status,
    )
    if (bucket) buckets[bucket].push(production)
  }
  const visible = buckets[tab]

  const submit = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const productionId = await create({ channelId: channelId as Id<'channels'>, name })
      setName('')
      void navigate({ to: `/c/${channelId}/scripts/build/${productionId}` })
    } finally {
      setCreating(false)
    }
  }

  const open = (production: Doc<'productions'>) => {
    // Desktop parity: drafts open the editor; ready/archived open review.
    const target =
      production.status === 'building'
        ? `/c/${channelId}/scripts/build/${production._id}`
        : `/c/${channelId}/scripts/review/${production._id}`
    void navigate({ to: target })
  }

  return (
    <ListPage
      title="Build"
      description="Every video in production for this channel."
      action={
        <div className="flex items-center gap-2">
          <Input
            placeholder="New video name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            className="w-64"
          />
          <Button loading={creating} disabled={!name.trim()} onClick={() => void submit()}>
            <Plus size={14} />
            Create
          </Button>
        </div>
      }
      loading={loading}
    >
      <Tabs
        tabs={[
          { id: 'drafts', label: `Drafts (${buckets.drafts.length})` },
          { id: 'ready', label: `Ready to record (${buckets.ready.length})` },
          { id: 'archived', label: `Archived (${buckets.archived.length})` },
        ]}
        active={tab}
        onChange={(id) =>
          void navigate({ search: { tab: id === 'drafts' ? undefined : (id as BuildTab) } })
        }
      />
      {visible.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title={tab === 'drafts' ? 'Nothing in production' : `No ${tab === 'ready' ? 'ready' : 'archived'} videos`}
          description={
            tab === 'drafts'
              ? 'Create a video here, or Build one from an idea.'
              : 'Videos land here as they move through the pipeline.'
          }
        />
      ) : (
        visible.map((production) => (
          <ListCard key={production._id} icon={Clapperboard} onClick={() => open(production)}>
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-text-primary">{production.name}</span>
              <Badge variant="muted">{production.format}</Badge>
              {production.draftMarkdown.trim() && <Badge variant="success">scripted</Badge>}
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-2xs text-text-muted">Updated {formatDate(production.updatedAt)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleting(production)
                }}
                className="flex items-center gap-1 text-2xs text-text-muted transition-colors hover:text-danger"
              >
                <Trash2 size={11} />
                Delete
              </button>
            </div>
          </ListCard>
        ))
      )}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          setDeleteBusy(true)
          void remove({ channelId: channelId as Id<'channels'>, productionId: deleting._id })
            .then(() => setDeleting(null))
            .catch(() => {
              // Keep the dialog open; the mutation error is transient (offline/auth) —
              // confirming again retries.
            })
            .finally(() => setDeleteBusy(false))
        }}
        title={`Delete “${deleting?.name}”?`}
        message="The production and its packaging, brain dump, and script are permanently removed. Its idea returns to the backlog."
        confirmLabel="Delete"
        loading={deleteBusy}
      />
    </ListPage>
  )
}
