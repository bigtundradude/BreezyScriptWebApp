import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ChevronLeft, Lightbulb, Plus, Search as SearchIcon, SlidersHorizontal } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ListPage } from '@/components/layout/ListPage'
import { ListCard } from '@/components/layout/ListCard'
import { Badge, Button, EmptyState, SearchInput, Select } from '@/components/ui'
import { RatingBadge } from '@/features/bank/StarRating'
import { BANK_STATUSES, STATUS_BADGE, STATUS_OPTIONS, type BankIdeaStatus } from '@/features/bank/lib'
import { formatDate } from '@/lib/utils'

// Rating filter: 'unrated' | minimum-stars. Kept in the URL like the notes filters.
const RATING_FILTERS = ['unrated', '1', '2', '3', '4', '5'] as const
type RatingFilter = (typeof RATING_FILTERS)[number]

const RATING_OPTIONS: Array<{ value: RatingFilter | 'all'; label: string }> = [
  { value: 'all', label: 'All ratings' },
  { value: '5', label: '★ 5' },
  { value: '4', label: '★ 4+' },
  { value: '3', label: '★ 3+' },
  { value: '2', label: '★ 2+' },
  { value: '1', label: '★ 1+' },
  { value: 'unrated', label: 'Unrated' },
]

type BankSearch = { q?: string; r?: RatingFilter; s?: BankIdeaStatus }

export const Route = createFileRoute('/c/$channelId/bank/')({
  validateSearch: (search: Record<string, unknown>): BankSearch => ({
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
    r: RATING_FILTERS.includes(search.r as RatingFilter) ? (search.r as RatingFilter) : undefined,
    s: BANK_STATUSES.includes(search.s as BankIdeaStatus) ? (search.s as BankIdeaStatus) : undefined,
  }),
  component: BankIdeasPage,
})

function BankIdeasPage() {
  const { channelId } = Route.useParams()
  const { q, r, s } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  // Explicit-submit search (decision #9): typing edits local state; Enter or the
  // Search button commits it to the URL, which is what actually queries.
  const [input, setInput] = useState(q ?? '')
  // Filters hide behind a toggle to save vertical space on the phone; start
  // open when the URL already carries an active filter.
  const [showFilters, setShowFilters] = useState(Boolean(r || s))

  const ideas = useQuery(api.ideaBank.list, {
    channelId: channelId as Id<'channels'>,
    search: q,
  })

  const submit = (value: string) =>
    void navigate({ search: (prev) => ({ ...prev, q: value.trim() || undefined }) })
  const setRatingFilter = (value: RatingFilter | 'all') =>
    void navigate({ search: (prev) => ({ ...prev, r: value === 'all' ? undefined : value }) })
  const setStatusFilter = (value: BankIdeaStatus | 'all') =>
    void navigate({ search: (prev) => ({ ...prev, s: value === 'all' ? undefined : value }) })

  // Rating/status filtering happens client-side over the (bounded) result set.
  const visible = (ideas ?? []).filter((idea) => {
    if (s && idea.status !== s) return false
    if (!r) return true
    if (r === 'unrated') return idea.rating === 0
    return idea.rating >= Number(r)
  })

  const filtered = Boolean(q || r || s)
  const loading = ideas === undefined

  return (
    <>
    <ListPage
      search={
        <div className="flex flex-col gap-2.5">
          {/* The bank tool has no left rail — this is the way back out. */}
          <button
            onClick={() => void navigate({ to: `/c/${channelId}` })}
            className="flex min-h-8 w-fit items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            <ChevronLeft size={15} />
            Channel home
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(input)
            }}
            className="flex gap-2"
          >
            <SearchInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onClear={() => {
                setInput('')
                submit('')
              }}
              placeholder="Search ideas… (press Enter)"
              className="flex-1"
            />
            <Button type="submit" variant="secondary" className="max-md:hidden">
              Search
            </Button>
            <Button
              type="submit"
              variant="secondary"
              iconOnly
              aria-label="Search"
              className="md:hidden"
            >
              <SearchIcon size={15} />
            </Button>
            <Button
              type="button"
              variant={r || s ? 'primary' : showFilters ? 'secondary' : 'ghost'}
              iconOnly
              aria-label="Toggle filters"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal size={15} />
            </Button>
            <Button
              type="button"
              className="max-md:hidden"
              onClick={() => void navigate({ to: `/c/${channelId}/bank/new` })}
            >
              <Plus size={14} />
              New idea
            </Button>
          </form>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Select<BankIdeaStatus | 'all'>
                options={[{ value: 'all', label: 'All statuses' }, ...STATUS_OPTIONS]}
                value={s ?? 'all'}
                onChange={setStatusFilter}
                className="min-w-32"
              />
              <Select<RatingFilter | 'all'>
                options={RATING_OPTIONS}
                value={r ?? 'all'}
                onChange={setRatingFilter}
                className="min-w-32"
              />
            </div>
          )}
        </div>
      }
      loading={loading}
      isEmpty={!loading && visible.length === 0}
      empty={
        filtered ? (
          <EmptyState
            icon={Lightbulb}
            title="No matching ideas"
            description="Try a different search or rating filter."
          />
        ) : (
          <EmptyState
            icon={Lightbulb}
            title="No ideas yet"
            description="Bank your first video idea so it's here when you need it."
            action={{ label: 'New idea', onClick: () => void navigate({ to: `/c/${channelId}/bank/new` }) }}
          />
        )
      }
    >
      {visible.map((idea) => {
        const badge = STATUS_BADGE[idea.status]
        return (
        <ListCard
          key={idea._id}
          onClick={() => void navigate({ to: `/c/${channelId}/bank/${idea._id}` })}
        >
          <div className="flex items-center gap-3">
            <RatingBadge value={idea.rating} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-text-primary">{idea.title}</span>
                {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
              </div>
              {idea.snippet && (
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                  {idea.snippet}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-2xs text-text-muted">Updated {formatDate(idea.updatedAt)}</span>
                {idea.readyCount > 0 && (
                  <Badge variant="primary">step {idea.readyCount}/9</Badge>
                )}
                {idea.potentialTitleCount > 0 && (
                  <Badge variant="muted">
                    {idea.potentialTitleCount} title{idea.potentialTitleCount === 1 ? '' : 's'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </ListCard>
        )
      })}
      {/* Keeps the floating button from covering the last row when scrolled to the end. */}
      <div aria-hidden className="h-14 md:hidden" />
    </ListPage>
    <button
      aria-label="New idea"
      onClick={() => void navigate({ to: `/c/${channelId}/bank/new` })}
      className="fixed bottom-5 right-5 z-20 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-text-inverse shadow-[0_4px_16px_rgba(0,0,0,0.55)] transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none md:hidden"
    >
      <Plus size={22} />
    </button>
    </>
  )
}
