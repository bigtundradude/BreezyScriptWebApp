import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Plus, StickyNote } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ListPage } from '@/components/layout/ListPage'
import { ListCard } from '@/components/layout/ListCard'
import { Badge, Button, EmptyState, SearchInput, Select } from '@/components/ui'
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

function NotesPage() {
  const { channelId } = Route.useParams()
  const { q, kind } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  // Explicit-submit search (decision #9): typing edits local state; Enter or the
  // Search button commits it to the URL, which is what actually queries.
  const [input, setInput] = useState(q ?? '')

  const notes = useQuery(api.notes.list, {
    channelId: channelId as Id<'channels'>,
    search: q,
    kind,
  })

  const submit = (value: string) =>
    void navigate({ search: (prev) => ({ ...prev, q: value.trim() || undefined }) })
  const setKind = (value: NoteKind | 'all') =>
    void navigate({ search: (prev) => ({ ...prev, kind: value === 'all' ? undefined : value }) })

  const filtered = Boolean(q || kind)
  const loading = notes === undefined

  return (
    <ListPage
      title="Notes"
      description="Everything in this channel's Second Brain: notes, articles, thoughts, and stories."
      action={
        <Button onClick={() => void navigate({ to: `/c/${channelId}/brain/new` })}>
          <Plus size={14} />
          New note
        </Button>
      }
      search={
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
            placeholder="Search notes… (press Enter)"
            className="flex-1"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      }
      filters={
        <Select<NoteKind | 'all'>
          options={[{ value: 'all', label: 'All kinds' }, ...KIND_OPTIONS]}
          value={kind ?? 'all'}
          onChange={setKind}
          className="min-w-37"
        />
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
            <div className="mt-1.5 flex items-center gap-2">
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
    </ListPage>
  )
}
