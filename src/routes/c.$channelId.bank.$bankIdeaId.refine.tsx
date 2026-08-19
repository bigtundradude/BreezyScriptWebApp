import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { RefinementStep } from '@/features/bank/RefinementStep'

export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId/refine')({
  component: RefinementStepPage,
})

function RefinementStepPage() {
  const { channelId, bankIdeaId } = Route.useParams()
  return (
    <RefinementStep
      key={bankIdeaId}
      channelId={channelId as Id<'channels'>}
      ideaId={bankIdeaId as Id<'bankIdeas'>}
    />
  )
}
