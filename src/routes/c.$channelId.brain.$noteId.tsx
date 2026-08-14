import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { NoteEditor } from '@/features/brain/NoteEditor'

export const Route = createFileRoute('/c/$channelId/brain/$noteId')({
  component: EditNotePage,
})

function EditNotePage() {
  const { channelId, noteId } = Route.useParams()
  return (
    <NoteEditor
      key={noteId}
      channelId={channelId as Id<'channels'>}
      noteId={noteId as Id<'notes'>}
    />
  )
}
