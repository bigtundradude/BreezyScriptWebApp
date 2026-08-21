import { useEffect } from 'react'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Header } from '@/components/layout/Header'
import { Button, Spinner } from '@/components/ui'

export const Route = createFileRoute('/c/$channelId')({
  component: ChannelLayout,
  errorComponent: ChannelError,
})

function ChannelLayout() {
  const { channelId } = Route.useParams()
  const channel = useQuery(api.channels.get, { channelId: channelId as Id<'channels'> })
  const setLastChannel = useMutation(api.channels.setLastChannel)

  // Keep the '/' redirect pointing at the channel most recently visited.
  useEffect(() => {
    if (channel) void setLastChannel({ channelId: channel._id })
  }, [channel?._id])

  if (channel === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-text-muted">
        <Spinner size={20} />
      </div>
    )
  }
  if (channel === null) return <ChannelNotFound />

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <Header activeChannelId={channel._id} />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function ChannelNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg">
      <div className="text-md font-semibold text-text-primary">Channel not found</div>
      <p className="text-sm text-text-secondary">It may have been deleted.</p>
      <Link to="/">
        <Button variant="secondary" size="sm">Back to home</Button>
      </Link>
    </div>
  )
}

// Route error boundary: a crash anywhere under /c used to render the
// misleading "Channel not found" screen — show the actual error instead.
function ChannelError({ error }: { error: Error }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-4">
      <div className="text-md font-semibold text-text-primary">Something went wrong</div>
      <p className="max-w-120 break-words text-center text-sm text-danger">{error.message}</p>
      <Link to="/">
        <Button variant="secondary" size="sm">Back to home</Button>
      </Link>
    </div>
  )
}
