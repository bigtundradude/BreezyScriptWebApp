import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { RecordStep } from '@/features/bank/RecordStep'

export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId/record')({
  component: RecordStepPage,
})

function RecordStepPage() {
  const { channelId, bankIdeaId } = Route.useParams()
  return (
    <RecordStep
      key={bankIdeaId}
      channelId={channelId as Id<'channels'>}
      ideaId={bankIdeaId as Id<'bankIdeas'>}
    />
  )
}
