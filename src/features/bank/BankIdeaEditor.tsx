import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button, ConfirmDialog, Input, Select, Spinner, Textarea } from '@/components/ui'
import { GrowInput } from '@/features/bank/GrowInput'
import { RatingPicker } from '@/features/bank/StarRating'
import { STATUS_OPTIONS, type BankIdeaStatus } from '@/features/bank/lib'

const TITLE_SLOTS = 3

function padTitles(titles: string[]) {
  return Array.from({ length: TITLE_SLOTS }, (_, i) => titles[i] ?? '')
}

// Create + edit form for one Idea Bank idea. Same layout in both modes; the
// list is a separate route, so it is never visible behind this view.
export function BankIdeaEditor({
  channelId,
  ideaId,
}: {
  channelId: Id<'channels'>
  ideaId?: Id<'bankIdeas'>
}) {
  const isNew = ideaId === undefined
  const idea = useQuery(api.ideaBank.get, isNew ? 'skip' : { channelId, ideaId })
  const create = useMutation(api.ideaBank.create)
  const update = useMutation(api.ideaBank.update)
  const remove = useMutation(api.ideaBank.remove)
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [potentialTitles, setPotentialTitles] = useState<string[]>(padTitles([]))
  const [rating, setRating] = useState(0)
  const [status, setStatus] = useState<BankIdeaStatus>('new')
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

  // Initialize the form once from the loaded idea; don't clobber in-flight
  // edits when the reactive query re-delivers.
  useEffect(() => {
    if (isNew || loaded || !idea) return
    setTitle(idea.title)
    setDescription(idea.description)
    setPotentialTitles(padTitles(idea.potentialTitles))
    setRating(idea.rating)
    setStatus(idea.status)
    setLoaded(true)
  }, [idea, isNew, loaded])

  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    withResolver: true,
    enableBeforeUnload: () => dirtyRef.current,
  })

  const backToList = useCallback(
    () => void navigate({ to: `/c/${channelId}/bank` }),
    [navigate, channelId],
  )

  const save = useCallback(
    async (stay: boolean) => {
      if (!title.trim()) {
        setError('Give the idea a title.')
        return
      }
      if (!description.trim()) {
        setError('Describe the idea.')
        return
      }
      setSaving(true)
      setError('')
      try {
        const fields = { channelId, title, description, potentialTitles, rating, status }
        if (isNew) {
          await create(fields)
        } else {
          await update({ ...fields, ideaId })
        }
        markDirty(false)
        if (!stay || isNew) backToList()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed — your text is still here. Try again.')
      } finally {
        setSaving(false)
      }
    },
    [title, description, potentialTitles, rating, status, isNew, channelId, ideaId, create, update, backToList],
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

  if (!isNew && idea === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (!isNew && idea === null) {
    return (
      <div className="mx-auto max-w-190 px-4 py-5 md:px-8 md:py-7">
        <div className="rounded-row border border-danger px-4 py-3 text-sm text-danger">
          Idea not found. It may have been deleted.
        </div>
        <Button variant="secondary" size="sm" className="mt-4" onClick={backToList}>
          Back to Idea Bank
        </Button>
      </div>
    )
  }

  const editTitle = (value: string) => {
    setTitle(value)
    markDirty(true)
  }
  const editDescription = (value: string) => {
    setDescription(value)
    markDirty(true)
  }
  const editPotentialTitle = (index: number, value: string) => {
    setPotentialTitles((prev) => prev.map((t, i) => (i === index ? value : t)))
    markDirty(true)
  }
  const editRating = (value: number) => {
    setRating(value)
    markDirty(true)
  }
  const editStatus = (value: BankIdeaStatus) => {
    setStatus(value)
    markDirty(true)
  }

  return (
    <div className="mx-auto flex max-w-190 flex-col gap-4 px-4 py-5 md:px-8 md:py-7">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={backToList}
          className="flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Idea Bank
        </button>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">
          {isNew ? 'New idea' : 'Edit idea'}
        </h2>
      </div>

      {error && (
        <div className="rounded-row border border-danger px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      <Input
        label="Idea title"
        placeholder="e.g. Living a week on 1990s technology"
        value={title}
        onChange={(e) => editTitle(e.target.value)}
      />
      <Textarea
        label="Description"
        rows={6}
        placeholder="What is the video? The premise, the angle, why it could work."
        value={description}
        onChange={(e) => editDescription(e.target.value)}
      />
      <div className="flex items-start gap-6 max-md:flex-col max-md:gap-4">
        <Select<BankIdeaStatus>
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={editStatus}
          className="w-40"
        />
        <RatingPicker label="Rating" value={rating} onChange={editRating} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-text-secondary">Potential video titles</div>
        {potentialTitles.map((t, i) => (
          <GrowInput
            key={i}
            placeholder={`Title idea ${i + 1} (optional)`}
            aria-label={`Title idea ${i + 1}`}
            value={t}
            onChange={(value) => editPotentialTitle(i, value)}
          />
        ))}
      </div>

      <div className="text-2xs text-text-muted">Cmd/Ctrl+S saves without leaving the page.</div>

      {/* Docked action bar, state-driven (see CLAUDE.md): while dirty it offers
          Cancel/Save; once clean (fresh open, or after a Cmd+S save-and-stay)
          those collapse into a single Done — never a disabled Save, never a
          "Cancel" when there is nothing to cancel. Delete stays left-separated. */}
      <div className="sticky bottom-0 z-10 mt-1 flex items-center gap-2 border-t border-border bg-bg py-3">
        {!isNew && (
          <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
            <span className="text-danger">Delete</span>
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {dirty ? (
            <>
              <Button variant="secondary" onClick={backToList}>
                Cancel
              </Button>
              <Button loading={saving} onClick={() => void save(false)}>
                Save
              </Button>
            </>
          ) : (
            <Button onClick={backToList}>Done</Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          if (isNew) return
          setDeleting(true)
          void remove({ channelId, ideaId })
            .then(() => {
              markDirty(false)
              backToList()
            })
            .catch((e) => {
              setDeleting(false)
              setConfirmingDelete(false)
              setError(e instanceof Error ? e.message : 'Delete failed — try again.')
            })
        }}
        title="Delete idea?"
        message="The idea is permanently removed from this channel's Idea Bank."
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
