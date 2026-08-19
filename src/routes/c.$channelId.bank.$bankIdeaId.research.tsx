import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { ResearchStep } from '@/features/bank/ResearchStep'

export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId/research')({
  component: ResearchStepPage,
})

function ResearchStepPage() {
  const { channelId, bankIdeaId } = Route.useParams()
  return (
    <ResearchStep
      key={bankIdeaId}
      channelId={channelId as Id<'channels'>}
      ideaId={bankIdeaId as Id<'bankIdeas'>}
    />
  )
}
