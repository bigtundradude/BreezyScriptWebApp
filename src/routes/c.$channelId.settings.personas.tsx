import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import type { Id } from '../../convex/_generated/dataModel'
import { PersonasSettings } from '@/features/settings/PersonasSettings'

export const Route = createFileRoute('/c/$channelId/settings/personas')({
  component: PersonasSettingsPage,
})

function PersonasSettingsPage() {
  const { channelId } = Route.useParams()
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex w-full max-w-190 flex-col gap-4 px-4 py-5 md:px-8 md:py-7">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void navigate({ to: `/c/${channelId}/settings` })}
          className="flex min-h-11 items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Settings
        </button>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Personas</h2>
      </div>
      <PersonasSettings channelId={channelId as Id<'channels'>} />
    </div>
  )
}
