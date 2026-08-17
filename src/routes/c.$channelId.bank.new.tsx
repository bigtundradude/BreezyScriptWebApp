import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { BankIdeaEditor } from '@/features/bank/BankIdeaEditor'

export const Route = createFileRoute('/c/$channelId/bank/new')({
  component: NewBankIdeaPage,
})

function NewBankIdeaPage() {
  const { channelId } = Route.useParams()
  return <BankIdeaEditor channelId={channelId as Id<'channels'>} />
}
