import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button, ConfirmDialog, Input, Select, Spinner, Textarea } from '@/components/ui'
import { RatingPicker } from '@/features/bank/StarRating'
import { STATUS_OPTIONS, type BankIdeaStatus } from '@/features/bank/lib'
import { WorkflowActionBar } from '@/features/bank/WorkflowActionBar'

// Workflow step 1 — the idea itself (title, description, status, rating).
// Potential titles live in step 2 (TitlesStep). Doubles as the create form.
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
  const updateIdea = useMutation(api.ideaBank.updateIdea)
  const markStepReady = useMutation(api.ideaBank.markStepReady)
  const remove = useMutation(api.ideaBank.remove)
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<BankIdeaStatus>('new')
  const [rating, setRating] = useState(0)
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
  const [readying, setReadying] = useState(false)
  const [error, setError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Initialize the form once from the loaded idea; don't clobber in-flight
  // edits when the reactive query re-delivers.
  useEffect(() => {
    if (isNew || loaded || !idea) return
    setTitle(idea.title)
    setDescription(idea.description)
    setStatus(idea.status)
    setRating(idea.rating)
    setLoaded(true)
  }, [idea, isNew, loaded])

  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    withResolver: true,
    enableBeforeUnload: () => dirtyRef.current,
  })

  const stepReady = Boolean(idea?.readySteps?.includes('idea'))
  // Done goes to the overview once the workflow exists, otherwise back to the list.
  const doneTarget = stepReady ? `/c/${channelId}/bank/${ideaId}` : `/c/${channelId}/bank`
  const doneLabel = stepReady ? 'Idea' : 'Scripts Pro'
  const goDone = useCallback(
    () => void navigate({ to: doneTarget }),
    [navigate, doneTarget],
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
        if (isNew) {
          const newId = await create({ channelId, title, description, rating, status })
          markDirty(false)
          // Land in the saved step-1 view (clean state) so Ready is one tap away.
          void navigate({ to: `/c/${channelId}/bank/${newId}/idea`, replace: true })
          return
        }
        await updateIdea({ channelId, ideaId, title, description, rating, status })
        markDirty(false)
        if (!stay) goDone()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed — your text is still here. Try again.')
      } finally {
        setSaving(false)
      }
    },
    [title, description, rating, status, isNew, channelId, ideaId, create, updateIdea, navigate, goDone],
  )

  // Ready = save unsaved edits (creating the idea if new), mark step 1 ready,
  // and advance straight into Potential Titles (owner, 2026-08-21).
  const ready = async () => {
    setReadying(true)
    setError('')
    try {
      let id = ideaId
      if (isNew) {
        id = await create({ channelId, title, description, rating, status })
        markDirty(false)
      } else if (dirtyRef.current && ideaId) {
        await updateIdea({ channelId, ideaId, title, description, rating, status })
        markDirty(false)
      }
      if (!id) return
      await markStepReady({ channelId, ideaId: id, step: 'idea' })
      void navigate({ to: `/c/${channelId}/bank/${id}/titles` })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark ready — try again.')
    } finally {
      setReadying(false)
    }
  }

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
      <div className="mx-auto max-w-190 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
        <div className="rounded-row border border-danger px-4 py-3 text-sm text-danger">
          Idea not found. It may have been deleted.
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => void navigate({ to: `/c/${channelId}/bank` })}
        >
          Back to Scripts Pro
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
  const editStatus = (value: BankIdeaStatus) => {
    setStatus(value)
    markDirty(true)
  }
  const editRating = (value: number) => {
    setRating(value)
    markDirty(true)
  }

  // Ready criteria for step 1, mirrored client-side for the hint line.
  const missing: string[] = []
  if (!title.trim()) missing.push('add a title')
  if (!description.trim()) missing.push('add a description')
  if (rating < 1) missing.push('set a rating')

  return (
    <div className="mx-auto flex max-w-190 flex-col gap-4 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={goDone}
          className="flex min-h-11 items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          {isNew ? 'Scripts Pro' : doneLabel}
        </button>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">
          {isNew ? 'New idea' : 'Idea'}
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

      <div className="text-2xs text-text-muted">Cmd/Ctrl+S saves without leaving the page.</div>

      <WorkflowActionBar
        dirty={dirty}
        saving={saving}
        readying={readying}
        isReady={stepReady}
        missing={missing}
        onCancel={goDone}
        onSave={() => void save(true)}
        onReady={() => void ready()}
        left={
          !isNew && (
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
              <span className="text-danger">Delete</span>
            </Button>
          )
        }
      />

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          if (isNew) return
          setDeleting(true)
          void remove({ channelId, ideaId })
            .then(() => {
              markDirty(false)
              void navigate({ to: `/c/${channelId}/bank` })
            })
            .catch((e) => {
              setDeleting(false)
              setConfirmingDelete(false)
              setError(e instanceof Error ? e.message : 'Delete failed — try again.')
            })
        }}
        title="Delete idea?"
        message="The idea and its whole workflow are permanently removed from this channel."
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
