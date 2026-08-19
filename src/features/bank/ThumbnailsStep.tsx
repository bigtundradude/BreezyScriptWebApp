import { useRef, useState } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Check, ChevronLeft, ImagePlus, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge, ConfirmDialog, Spinner } from '@/components/ui'
import { WorkflowActionBar } from '@/features/bank/WorkflowActionBar'
import { resizeToThumbnail } from '@/features/bank/resizeImage'

const SLOT_LABELS = ['A', 'B', 'C']

// Workflow step 3 — thumbnails, laid out like YouTube's A/B test: three
// variants pairing a thumbnail slot with a (read-only) title from step 2.
// Tap-first uploads; drag-and-drop is a desktop extra, never the only path.
export function ThumbnailsStep({
  channelId,
  ideaId,
}: {
  channelId: Id<'channels'>
  ideaId: Id<'bankIdeas'>
}) {
  const idea = useQuery(api.ideaBank.get, { channelId, ideaId })
  const data = useQuery(api.bankThumbnails.list, { channelId, ideaId })
  const generateUploadUrl = useMutation(api.bankThumbnails.generateUploadUrl)
  const attach = useMutation(api.bankThumbnails.attach)
  const assign = useMutation(api.bankThumbnails.assign)
  const clearSlot = useMutation(api.bankThumbnails.clearSlot)
  const markStepReady = useMutation(api.ideaBank.markStepReady)
  const navigate = useNavigate()

  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [readying, setReadying] = useState(false)
  const [error, setError] = useState('')
  const [confirmClear, setConfirmClear] = useState<number | null>(null)
  const fileInputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  const overviewTo = `/c/${channelId}/bank/${ideaId}`
  const goOverview = () => void navigate({ to: overviewTo })

  if (idea === undefined || data === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }
  if (idea === null || data === null) {
    return <Navigate to="/c/$channelId/bank" params={{ channelId }} />
  }
  const ready = idea.readySteps ?? []
  if (!ready.includes('idea') || !ready.includes('titles')) {
    return (
      <Navigate to="/c/$channelId/bank/$bankIdeaId" params={{ channelId, bankIdeaId: ideaId }} />
    )
  }

  const thumbnailById = new Map(data.thumbnails.map((t) => [t._id, t]))
  const filledCount = data.slots.filter(Boolean).length
  const stepReady = ready.includes('thumbnails')
  const missing = filledCount > 0 ? [] : ['upload at least one thumbnail']

  const upload = async (slot: number, file: File) => {
    setUploadingSlot(slot)
    setError('')
    try {
      const { blob, width, height } = await resizeToThumbnail(file)
      const uploadUrl = await generateUploadUrl({})
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'content-type': 'image/jpeg' },
        body: blob,
      })
      if (!response.ok) throw new Error('Upload failed — check your connection and try again.')
      const { storageId } = (await response.json()) as { storageId: Id<'_storage'> }
      await attach({
        channelId,
        ideaId,
        slot,
        storageId,
        originalFileName: file.name,
        width,
        height,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed — try again.')
    } finally {
      setUploadingSlot(null)
    }
  }

  const onFilePicked = (slot: number, files: FileList | null) => {
    const file = files?.[0]
    if (file) void upload(slot, file)
    const input = fileInputs[slot].current
    if (input) input.value = ''
  }

  const markReady = async () => {
    setReadying(true)
    setError('')
    try {
      await markStepReady({ channelId, ideaId, step: 'thumbnails' })
      // Next step (Leading Questions) isn't built yet — land on the overview.
      goOverview()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark ready — try again.')
    } finally {
      setReadying(false)
    }
  }

  const clearingThumb = confirmClear !== null ? thumbnailById.get(data.slots[confirmClear] ?? ('' as never)) : undefined
  const clearingIsLastRef =
    confirmClear !== null &&
    data.slots.filter((s) => s === data.slots[confirmClear]).length === 1

  return (
    <div className="mx-auto flex max-w-190 flex-col gap-4 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={goOverview}
          className="flex min-h-11 items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Idea
        </button>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Thumbnails</h2>
      </div>
      <p className="-mt-2 text-sm text-text-secondary">
        Pair each title with a thumbnail, YouTube A/B style. Titles are edited in the previous step.
      </p>

      {error && (
        <div className="rounded-row border border-danger px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {data.slots.map((slotThumbId, slot) => {
          const thumb = slotThumbId ? thumbnailById.get(slotThumbId) : undefined
          const title = idea.potentialTitles[slot]
          const isPrimary = idea.primaryTitleIndex === slot
          const reusable = data.thumbnails.filter((t) => t._id !== slotThumbId)
          return (
            <div key={slot} className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-raised text-2xs font-bold text-text-secondary">
                  {SLOT_LABELS[slot]}
                </span>
                {isPrimary && <Badge variant="primary">primary title</Badge>}
              </div>

              {thumb ? (
                <div className="relative">
                  <img
                    src={thumb.url ?? undefined}
                    alt={thumb.originalFileName}
                    width={thumb.width}
                    height={thumb.height}
                    className="aspect-video w-full rounded-row border border-border-subtle object-cover"
                  />
                  <button
                    aria-label={`Remove thumbnail from slot ${SLOT_LABELS[slot]}`}
                    onClick={() => setConfirmClear(slot)}
                    className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-bg/70 text-text-primary backdrop-blur transition-colors hover:bg-danger hover:text-text-inverse"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputs[slot].current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) void upload(slot, file)
                  }}
                  className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-row border border-dashed border-border text-text-muted transition-colors hover:border-primary hover:text-text-secondary"
                >
                  {uploadingSlot === slot ? (
                    <Spinner size={18} />
                  ) : (
                    <>
                      <ImagePlus size={20} />
                      <span className="text-xs">Tap to add a thumbnail</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputs[slot]}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFilePicked(slot, e.target.files)}
              />

              {!thumb && reusable.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-2xs text-text-muted">or reuse:</span>
                  {reusable.map((t) => (
                    <button
                      key={t._id}
                      aria-label={`Use ${t.originalFileName} in slot ${SLOT_LABELS[slot]}`}
                      onClick={() => void assign({ channelId, ideaId, slot, thumbnailId: t._id })}
                      className="h-11 overflow-hidden rounded-control border border-border transition-colors hover:border-primary"
                    >
                      <img src={t.url ?? undefined} alt="" className="h-full w-auto object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-1.5">
                {isPrimary && <Check size={13} strokeWidth={3} className="mt-0.5 shrink-0 text-primary" />}
                <p className="text-sm leading-snug text-text-primary">
                  {title ?? <span className="text-text-muted">No title {SLOT_LABELS[slot]}</span>}
                </p>
              </div>
              {thumb && (
                <p className="truncate text-2xs text-text-muted" title={thumb.originalFileName}>
                  {thumb.originalFileName}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <WorkflowActionBar
        dirty={false}
        saving={false}
        readying={readying}
        isReady={stepReady}
        missing={missing}
        onCancel={goOverview}
        onSave={() => {}}
        onDone={goOverview}
        onReady={() => void markReady()}
      />

      <ConfirmDialog
        open={confirmClear !== null}
        onClose={() => setConfirmClear(null)}
        onConfirm={() => {
          if (confirmClear === null) return
          const slot = confirmClear
          setConfirmClear(null)
          void clearSlot({ channelId, ideaId, slot }).catch((e) =>
            setError(e instanceof Error ? e.message : 'Remove failed — try again.'),
          )
        }}
        title={`Remove thumbnail ${confirmClear !== null ? SLOT_LABELS[confirmClear] : ''}?`}
        message={
          clearingIsLastRef
            ? `“${clearingThumb?.originalFileName ?? 'This image'}” is only used here — removing it deletes the upload.`
            : 'The slot is cleared; the image stays available in its other slot.'
        }
        confirmLabel="Remove"
      />
    </div>
  )
}
