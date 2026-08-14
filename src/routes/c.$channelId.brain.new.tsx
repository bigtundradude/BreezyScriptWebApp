import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { NoteEditor } from '@/features/brain/NoteEditor'

export const Route = createFileRoute('/c/$channelId/brain/new')({
  component: NewNotePage,
})

function NewNotePage() {
  const { channelId } = Route.useParams()
  return <NoteEditor channelId={channelId as Id<'channels'>} />
}
