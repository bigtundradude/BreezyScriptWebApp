import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ChevronLeft, Plus, SlidersHorizontal, StickyNote } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ListPage } from '@/components/layout/ListPage'
import { ListCard } from '@/components/layout/ListCard'
import { Badge, Button, EmptyState, SearchInput, Select } from '@/components/ui'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { KIND_OPTIONS, kindLabel, sourceLabel, type NoteKind, NOTE_KINDS } from '@/features/brain/lib'
import { formatDate } from '@/lib/utils'

type NotesSearch = { q?: string; kind?: NoteKind }

export const Route = createFileRoute('/c/$channelId/brain/')({
  validateSearch: (search: Record<string, unknown>): NotesSearch => ({
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
    kind: NOTE_KINDS.includes(search.kind as NoteKind) ? (search.kind as NoteKind) : undefined,
  }),
  component: NotesPage,
})

// Compact list-page toolbar (CLAUDE.md pattern; reference: the Scripts Pro
// ideas list). No page heading; content starts at the toolbar, create is a FAB
// on phones and a toolbar button on md+.
function NotesPage() {
  const { channelId } = Route.useParams()
  const { q, kind } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  // Debounced live search (owner, 2026-08-18): typing filters after a short
  // pause; clearing the box resets.
  const [input, setInput] = useState(q ?? '')
  const debouncedQ = useDebouncedValue(input.trim(), 250)
  useEffect(() => {
    if (debouncedQ === (q ?? '')) return
    void navigate({
      search: (prev) => ({ ...prev, q: debouncedQ || undefined }),
      replace: true,
    })
  }, [debouncedQ, q, navigate])
  // Filters hide behind a toggle to save vertical space on the phone; start
  // open when the URL already carries an active filter.
  const [showFilters, setShowFilters] = useState(Boolean(kind))

  const notes = useQuery(api.notes.list, {
    channelId: channelId as Id<'channels'>,
    search: q,
    kind,
  })

  const setKind = (value: NoteKind | 'all') =>
    void navigate({ search: (prev) => ({ ...prev, kind: value === 'all' ? undefined : value }) })

  const filtered = Boolean(q || kind)
  const loading = notes === undefined

  return (
    <>
    <ListPage
      search={
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => void navigate({ to: `/c/${channelId}` })}
            className="flex min-h-8 w-fit items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            <ChevronLeft size={15} />
            Channel home
          </button>
          <div className="flex gap-2">
            <SearchInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onClear={() => setInput('')}
              placeholder="Search notes…"
              className="flex-1"
            />
            <Button
              type="button"
              variant={kind ? 'primary' : showFilters ? 'secondary' : 'ghost'}
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
              onClick={() => void navigate({ to: `/c/${channelId}/brain/new` })}
            >
              <Plus size={14} />
              New note
            </Button>
          </div>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Select<NoteKind | 'all'>
                options={[{ value: 'all', label: 'All kinds' }, ...KIND_OPTIONS]}
                value={kind ?? 'all'}
                onChange={setKind}
                className="min-w-37"
              />
            </div>
          )}
        </div>
      }
      loading={loading}
      isEmpty={!loading && notes.length === 0}
      empty={
        filtered ? (
          <EmptyState
            icon={StickyNote}
            title="No matching notes"
            description="Try a different search or filter."
          />
        ) : (
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Add your first note to start building this channel's Second Brain."
            action={{ label: 'New note', onClick: () => void navigate({ to: `/c/${channelId}/brain/new` }) }}
          />
        )
      }
    >
      {(notes ?? []).map((note) => {
        const origin = sourceLabel(note.sourceRef)
        return (
          <ListCard
            key={note._id}
            icon={StickyNote}
            onClick={() => void navigate({ to: `/c/${channelId}/brain/${note._id}` })}
          >
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-text-primary">{note.title}</span>
              <Badge variant="muted">{kindLabel(note.kind)}</Badge>
              {origin && <Badge variant="info">{origin}</Badge>}
            </div>
            {note.snippet && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                {note.snippet}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-2xs text-text-muted">Updated {formatDate(note.updatedAt)}</span>
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-raised px-2 py-px text-2xs text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </ListCard>
        )
      })}
      {/* Keeps the floating button from covering the last row when scrolled to the end. */}
      <div aria-hidden className="h-14 md:hidden" />
    </ListPage>
    <button
      aria-label="New note"
      onClick={() => void navigate({ to: `/c/${channelId}/brain/new` })}
      className="fixed bottom-5 right-5 z-20 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-text-inverse shadow-[0_4px_16px_rgba(0,0,0,0.55)] transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none md:hidden"
    >
      <Plus size={22} />
    </button>
    </>
  )
}
