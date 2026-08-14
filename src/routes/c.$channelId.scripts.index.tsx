import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/c/$channelId/scripts/')({
  component: ScriptsIndex,
})

function ScriptsIndex() {
  const { channelId } = Route.useParams()
  return <Navigate to="/c/$channelId/scripts/build" params={{ channelId }} replace />
}
