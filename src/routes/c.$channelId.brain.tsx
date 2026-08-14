import { createFileRoute, Outlet } from '@tanstack/react-router'
import { StickyNote } from 'lucide-react'
import { LeftRail } from '@/components/layout/LeftRail'

export const Route = createFileRoute('/c/$channelId/brain')({
  component: BrainLayout,
})

function BrainLayout() {
  const { channelId } = Route.useParams()
  return (
    <div className="flex h-full overflow-hidden max-md:flex-col">
      <LeftRail
        back={{ label: 'Channel home', path: `/c/${channelId}` }}
        sections={[
          {
            items: [{ label: 'Notes', path: `/c/${channelId}/brain`, icon: StickyNote }],
          },
        ]}
      />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
