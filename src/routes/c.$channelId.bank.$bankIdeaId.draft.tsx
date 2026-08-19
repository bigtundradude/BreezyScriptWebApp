import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { ScriptDrafterStep } from '@/features/bank/ScriptDrafterStep'

export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId/draft')({
  component: ScriptDrafterStepPage,
})

function ScriptDrafterStepPage() {
  const { channelId, bankIdeaId } = Route.useParams()
  return (
    <ScriptDrafterStep
      key={bankIdeaId}
      channelId={channelId as Id<'channels'>}
      ideaId={bankIdeaId as Id<'bankIdeas'>}
    />
  )
}
