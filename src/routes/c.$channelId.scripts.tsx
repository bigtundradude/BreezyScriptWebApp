import { createFileRoute, Outlet } from '@tanstack/react-router'
import {
  BarChart3,
  Clapperboard,
  Compass,
  FileText,
  Lightbulb,
  LayoutList,
  Megaphone,
  Type,
  UserRound,
  Users,
  Wand2,
} from 'lucide-react'
import { LeftRail } from '@/components/layout/LeftRail'

export const Route = createFileRoute('/c/$channelId/scripts')({
  component: ScriptsLayout,
})

function ScriptsLayout() {
  const { channelId } = Route.useParams()
  const base = `/c/${channelId}/scripts`
  return (
    <div className="flex h-full overflow-hidden max-md:flex-col">
      <LeftRail
        back={{ label: 'Channel home', path: `/c/${channelId}` }}
        sections={[
          {
            items: [
              { label: 'Build', path: `${base}/build`, icon: Clapperboard },
              { label: 'Ideas', path: `${base}/ideas`, icon: Lightbulb },
              { label: 'Feedback', path: `${base}/feedback`, icon: BarChart3 },
            ],
          },
          {
            title: 'Foundations',
            items: [
              { label: 'Personas', path: `${base}/foundations/personas`, icon: UserRound },
              { label: 'Audience', path: `${base}/foundations/audience`, icon: Users },
              { label: 'Framework', path: `${base}/foundations/framework`, icon: Compass },
              { label: 'Titles', path: `${base}/titles`, icon: Type },
            ],
          },
          {
            title: 'Library',
            items: [
              { label: 'Structures', path: `${base}/library/structures`, icon: LayoutList },
              { label: 'CTAs', path: `${base}/library/ctas`, icon: Megaphone },
              { label: 'Descriptions', path: `${base}/library/descriptions`, icon: FileText },
            ],
          },
          {
            title: 'Setup',
            items: [{ label: 'Using your AI', path: `${base}/setup`, icon: Wand2 }],
          },
        ]}
      />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
