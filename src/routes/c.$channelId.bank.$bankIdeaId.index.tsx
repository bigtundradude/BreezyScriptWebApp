import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { StepOverview } from '@/features/bank/StepOverview'

export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId/')({
  component: OverviewPage,
})

function OverviewPage() {
  const { channelId, bankIdeaId } = Route.useParams()
  return (
    <StepOverview
      channelId={channelId as Id<'channels'>}
      ideaId={bankIdeaId as Id<'bankIdeas'>}
    />
  )
}
