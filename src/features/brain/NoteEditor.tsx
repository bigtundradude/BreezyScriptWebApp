import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useBlocker } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, RotateCcw, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Button,
  ConfirmDialog,
  Input,
  PillInput,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import { KIND_OPTIONS, type NoteKind } from '@/features/brain/lib'
import {
  clearDraft,
  draftKey,
  readDraft,
  writeDraft,
  type NoteDraft,
} from '@/components/shared/draftBuffer'

export function NoteEditor({
  channelId,
  noteId,
}: {
  channelId: Id<'channels'>
  noteId?: Id<'notes'>
}) {
  const isNew = noteId === undefined
  const note = useQuery(api.notes.get, isNew ? 'skip' : { channelId, noteId })
  const create = useMutation(api.notes.create)
  const update = useMutation(api.notes.update)
  const remove = useMutation(api.notes.remove)
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<NoteKind>('note')
  const [tags, setTags] = useState<string[]>([])
  const [body, setBody] = useState('')
  const [dirty, setDirty] = useState(false)
  // The router blocker reads dirtiness synchronously at navigate time — state
  // updates land too late after save/delete, so mirror it in a ref.
  const dirtyRef = useRef(false)
  const markDirty = (value: boolean) => {
    dirtyRef.current = value
    setDirty(value)
  }
  const [loaded, setLoaded] = useState(isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [restorable, setRestorable] = useState<NoteDraft | null>(null)

  const bufferKey = draftKey('note', `${channelId}.${noteId ?? 'new'}`)

  // Initialize the form once from the loaded note; don't clobber in-flight edits
  // when the reactive query re-delivers.
  useEffect(() => {
    if (isNew || loaded || !note) return
    setTitle(note.title)
    setKind(note.kind as NoteKind)
    setTags(note.tags)
    setBody(note.body)
    setLoaded(true)
  }, [note, isNew, loaded])

  // Offer (never auto-apply) a local draft buffer newer than the server doc.
  useEffect(() => {
    if (!loaded) return
    const draft = readDraft(bufferKey)
    if (!draft) return
    const newerThanServer = isNew || !note || draft.savedAt > note.updatedAt
    const hasContent = draft.title.trim() || draft.body.trim()
    if (newerThanServer && hasContent) setRestorable(draft)
    else clearDraft(bufferKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  // Draft insurance: write the buffer ~500ms after each change while dirty.
  const bufferTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDraft = useRef<NoteDraft | null>(null)
  const scheduleBuffer = useCallback(
    (next: Partial<NoteDraft>) => {
      latestDraft.current = {
        title,
        body,
        kind,
        tags,
        ...next,
        savedAt: Date.now(),
        baseUpdatedAt: note?.updatedAt ?? 0,
      }
      if (bufferTimer.current) clearTimeout(bufferTimer.current)
      bufferTimer.current = setTimeout(() => {
        if (latestDraft.current) writeDraft(bufferKey, latestDraft.current)
      }, 500)
    },
    [bufferKey, title, body, kind, tags, note?.updatedAt],
  )
  // Cancel any pending buffer tick AND its payload — must run before clearDraft
  // in save/delete, or the 500 ms timer re-creates the buffer that was just cleared.
  const cancelBuffer = () => {
    if (bufferTimer.current) {
      clearTimeout(bufferTimer.current)
      bufferTimer.current = null
    }
    latestDraft.current = null
  }
  useEffect(() => () => {
    // Unmount with a pending buffer tick: write synchronously — this is exactly
    // the "left before the debounce fired" case the buffer exists for.
    if (bufferTimer.current) {
      clearTimeout(bufferTimer.current)
      if (dirtyRef.current && latestDraft.current) writeDraft(bufferKey, latestDraft.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const edit = <T,>(setter: (v: T) => void, field: keyof NoteDraft) => (value: T) => {
    setter(value)
    markDirty(true)
    scheduleBuffer({ [field]: value } as Partial<NoteDraft>)
  }
  const editTitle = edit(setTitle, 'title')
  const editKind = edit(setKind as (v: NoteKind) => void, 'kind')
  const editBody = edit(setBody, 'body')

  // Navigation guard: router blocker + beforeunload while dirty. Reads the ref —
  // the blocker fires synchronously at navigate time, before state updates land.
  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    withResolver: true,
    enableBeforeUnload: () => dirtyRef.current,
  })

  const backToList = useCallback(
    () => void navigate({ to: `/c/${channelId}/brain` }),
    [navigate, channelId],
  )

  const save = useCallback(
    async (stay: boolean) => {
      if (!title.trim()) {
        setError('Give the note a title.')
        return
      }
      setSaving(true)
      setError('')
      try {
        if (isNew) {
          await create({ channelId, title, body, kind, tags })
        } else {
          await update({ channelId, noteId, title, body, kind, tags })
        }
        markDirty(false)
        cancelBuffer()
        clearDraft(bufferKey)
        if (!stay || isNew) backToList()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed — your text is still here. Try again.')
      } finally {
        setSaving(false)
      }
    },
    [title, body, kind, tags, isNew, channelId, noteId, create, update, bufferKey, backToList],
  )

  // Cmd/Ctrl+S saves and stays (decision #5).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (!saving && dirty) void save(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save, saving, dirty])

  if (!isNew && note === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (!isNew && note === null) {
    return (
      <div className="mx-auto max-w-190 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
        <div className="rounded-row border border-danger px-4 py-3 text-sm text-danger">
          Note not found. It may have been deleted.
        </div>
        <Button variant="secondary" size="sm" className="mt-4" onClick={backToList}>
          Back to notes
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-190 flex-col gap-4 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
      <div className="flex items-center gap-3">
        <button
          onClick={backToList}
          className="flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Notes
        </button>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">
          {isNew ? 'New note' : 'Edit note'}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          {!isNew && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
              <span className="text-danger">Delete</span>
            </Button>
          )}
          <Button size="sm" loading={saving} disabled={!dirty && !isNew} onClick={() => void save(false)}>
            Save
          </Button>
        </div>
      </div>

      {restorable && (
        <div className="flex items-center gap-3 rounded-row border border-warning/40 bg-warning/8 px-4 py-2.5 text-sm text-text-secondary">
          <RotateCcw size={14} className="shrink-0 text-warning" />
          <span className="flex-1">
            Unsaved local changes from{' '}
            {new Date(restorable.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{' '}
            were found on this device.
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTitle(restorable.title)
              setKind(restorable.kind as NoteKind)
              setTags(restorable.tags)
              setBody(restorable.body)
              markDirty(true)
              setRestorable(null)
            }}
          >
            Restore
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Discard local draft"
            onClick={() => {
              clearDraft(bufferKey)
              setRestorable(null)
            }}
          >
            <X size={14} />
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-row border border-danger px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      <Input
        label="Title"
        placeholder="e.g. Atomic Habits, key takeaways"
        value={title}
        onChange={(e) => editTitle(e.target.value)}
      />
      <div className="flex gap-3 max-md:flex-col">
        <Select<NoteKind>
          label="Kind"
          options={KIND_OPTIONS}
          value={kind}
          onChange={editKind}
          className="w-50"
        />
        <div className="flex-1">
          <PillInput
            label="Tags"
            pills={tags}
            onAdd={(tag) => {
              const next = [...tags, tag]
              setTags(next)
              markDirty(true)
              scheduleBuffer({ tags: next })
            }}
            onRemove={(tag) => {
              const next = tags.filter((t) => t !== tag)
              setTags(next)
              markDirty(true)
              scheduleBuffer({ tags: next })
            }}
            placeholder="Add a tag and press Enter"
          />
        </div>
      </div>
      <Textarea
        label="Content"
        rows={16}
        placeholder="Write or paste the note."
        value={body}
        onChange={(e) => editBody(e.target.value)}
      />
      <div className="text-2xs text-text-muted">
        Cmd/Ctrl+S saves without leaving the page.
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          if (isNew) return
          setDeleting(true)
          void remove({ channelId, noteId })
            .then(() => {
              markDirty(false)
              cancelBuffer()
              clearDraft(bufferKey)
              backToList()
            })
            .catch((e) => {
              setDeleting(false)
              setConfirmingDelete(false)
              setError(e instanceof Error ? e.message : 'Delete failed — try again.')
            })
        }}
        title="Delete note?"
        message="The note is permanently removed from this channel's Second Brain."
        confirmLabel="Delete"
        loading={deleting}
      />

      <ConfirmDialog
        open={blocker.status === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={() => {
          markDirty(false)
          blocker.proceed?.()
        }}
        title="Unsaved changes"
        message="You have unsaved changes that will be lost if you leave. Are you sure you want to continue?"
        confirmLabel="Leave anyway"
        cancelLabel="Stay here"
      />
    </div>
  )
}

