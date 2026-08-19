import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { ThumbnailsStep } from '@/features/bank/ThumbnailsStep'

export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId/thumbnails')({
  component: ThumbnailsStepPage,
})

function ThumbnailsStepPage() {
  const { channelId, bankIdeaId } = Route.useParams()
  return (
    <ThumbnailsStep
      key={bankIdeaId}
      channelId={channelId as Id<'channels'>}
      ideaId={bankIdeaId as Id<'bankIdeas'>}
    />
  )
}
