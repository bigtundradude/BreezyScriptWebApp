import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Lightbulb } from 'lucide-react'
import { LeftRail } from '@/components/layout/LeftRail'

export const Route = createFileRoute('/c/$channelId/bank')({
  component: BankLayout,
})

function BankLayout() {
  const { channelId } = Route.useParams()
  return (
    <div className="flex h-full overflow-hidden max-md:flex-col">
      <LeftRail
        back={{ label: 'Channel home', path: `/c/${channelId}` }}
        sections={[
          {
            items: [{ label: 'Ideas', path: `/c/${channelId}/bank`, icon: Lightbulb }],
          },
        ]}
      />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
