import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { BankIdeaEditor } from '@/features/bank/BankIdeaEditor'

export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId/idea')({
  component: IdeaStepPage,
})

function IdeaStepPage() {
  const { channelId, bankIdeaId } = Route.useParams()
  return (
    <BankIdeaEditor
      key={bankIdeaId}
      channelId={channelId as Id<'channels'>}
      ideaId={bankIdeaId as Id<'bankIdeas'>}
    />
  )
}
