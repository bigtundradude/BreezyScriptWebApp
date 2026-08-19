import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { QuestionsStep } from '@/features/bank/QuestionsStep'

export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId/questions')({
  component: QuestionsStepPage,
})

function QuestionsStepPage() {
  const { channelId, bankIdeaId } = Route.useParams()
  return (
    <QuestionsStep
      key={bankIdeaId}
      channelId={channelId as Id<'channels'>}
      ideaId={bankIdeaId as Id<'bankIdeas'>}
    />
  )
}
