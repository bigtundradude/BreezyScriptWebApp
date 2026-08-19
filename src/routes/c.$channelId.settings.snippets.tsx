import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import type { Id } from '../../convex/_generated/dataModel'
import { SnippetsSettings } from '@/features/settings/SnippetsSettings'

export const Route = createFileRoute('/c/$channelId/settings/snippets')({
  component: SnippetsSettingsPage,
})

function SnippetsSettingsPage() {
  const { channelId } = Route.useParams()
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex w-full max-w-190 flex-col gap-4 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void navigate({ to: `/c/${channelId}/settings` })}
          className="flex min-h-11 items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Settings
        </button>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Script snippets</h2>
      </div>
      <SnippetsSettings channelId={channelId as Id<'channels'>} />
    </div>
  )
}
