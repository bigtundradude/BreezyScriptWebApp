import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { MetadataStep } from '@/features/bank/MetadataStep'

export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId/metadata')({
  component: MetadataStepPage,
})

function MetadataStepPage() {
  const { channelId, bankIdeaId } = Route.useParams()
  return (
    <MetadataStep
      key={bankIdeaId}
      channelId={channelId as Id<'channels'>}
      ideaId={bankIdeaId as Id<'bankIdeas'>}
    />
  )
}
