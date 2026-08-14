import { useState } from 'react'
import { useConvex, useQuery } from 'convex/react'
import { Plus, StickyNote, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge, Button, EmptyState, SearchInput, Select, Spinner } from '@/components/ui'
import { KIND_OPTIONS, kindLabel, type NoteKind } from '@/features/brain/lib'
import type { InterviewAnswer } from '@/lib/megaprompt'

// Ported: pulls Second Brain notes into the production's brain dump BY VALUE.
// Second Brain stays the source of truth; editing a note later does not update
// a script that pulled it. Dedupe is by facet ref. Search is explicit-submit.
export function SecondBrainPicker({
  channelId,
  interview,
  onAdd,
  onRemove,
}: {
  channelId: Id<'channels'>
  interview: InterviewAnswer[]
  onAdd: (block: InterviewAnswer) => void
  onRemove: (id: string) => void
}) {
  const convex = useConvex()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<NoteKind | 'all'>('story') // stories surface first (desktop parity)
  const [adding, setAdding] = useState<string | null>(null)

  const notes = useQuery(api.notes.list, {
    channelId,
    search: query || undefined,
    kind: kind === 'all' ? undefined : kind,
  })

  const pulled = interview.filter((block) => block.type === 'second_brain')
  const pulledFacets = new Set(pulled.map((block) => block.facet))

  const add = async (noteId: string, title: string, snippet: string) => {
    setAdding(noteId)
    let body = snippet // fall back to the snippet if the full-body fetch fails
    try {
      const full = await convex.query(api.notes.get, {
        channelId,
        noteId: noteId as Id<'notes'>,
      })
      if (full?.body) body = full.body
    } catch {
      // keep the snippet fallback
    }
    onAdd({
      id: crypto.randomUUID(),
      type: 'second_brain',
      facet: `note:${noteId}`,
      q: `From Second Brain: ${title}`,
      a: body,
    })
    setAdding(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {pulled.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Pulled into this script
          </div>
          {pulled.map((block) => (
            <div
              key={block.id}
              className="flex items-center gap-3 rounded-row border border-border bg-surface px-4 py-2.5"
            >
              <StickyNote size={14} className="shrink-0 text-tool-brain" />
              <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                {block.q.replace(/^From Second Brain: /, '')}
              </span>
              <button
                onClick={() => onRemove(block.id)}
                title="Remove from this script (the note itself is untouched)"
                className="text-text-muted transition-colors hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setQuery(input.trim())
        }}
      >
        <SearchInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onClear={() => {
            setInput('')
            setQuery('')
          }}
          placeholder="Search this channel's notes… (press Enter)"
          className="flex-1"
        />
        <Select<NoteKind | 'all'>
          options={[{ value: 'all', label: 'All kinds' }, ...KIND_OPTIONS]}
          value={kind}
          onChange={setKind}
          className="w-37"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {notes === undefined ? (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner size={14} /> Loading…
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes match"
          description="Author material in Second Brain to pull it in here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => {
            const alreadyPulled = pulledFacets.has(`note:${note._id}`)
            return (
              <div
                key={note._id}
                className="flex items-center gap-3 rounded-row border border-border bg-surface px-4 py-2.5"
              >
                <StickyNote size={14} className="shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-text-primary">{note.title}</span>
                    <Badge variant="muted">{kindLabel(note.kind)}</Badge>
                  </div>
                  {note.snippet && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">{note.snippet}</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={alreadyPulled}
                  loading={adding === note._id}
                  onClick={() => void add(note._id, note.title, note.snippet)}
                >
                  {alreadyPulled ? 'Added' : (
                    <>
                      <Plus size={13} />
                      Add
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
