import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { TitlesStep } from '@/features/bank/TitlesStep'

export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId/titles')({
  component: TitlesStepPage,
})

function TitlesStepPage() {
  const { channelId, bankIdeaId } = Route.useParams()
  return (
    <TitlesStep
      key={bankIdeaId}
      channelId={channelId as Id<'channels'>}
      ideaId={bankIdeaId as Id<'bankIdeas'>}
    />
  )
}
