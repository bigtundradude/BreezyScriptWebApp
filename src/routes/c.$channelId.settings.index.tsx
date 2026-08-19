import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutList,
  Replace,
  ScrollText,
  Tag,
  Timer,
  Type,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

export const Route = createFileRoute('/c/$channelId/settings/')({
  component: SettingsHome,
})

// Grouped by purpose (owner spec 2026-08-18): channel setup first, then the
// templating libraries, personal preferences, and finally app-wide settings
// (things that apply to every channel, not just this one).
const GROUPS: Array<{
  name: string
  blurb: string
  categories: Array<{ slug?: string; to?: string; name: string; blurb: string; icon: LucideIcon }>
}> = [
  {
    name: 'Setup',
    blurb: 'Required before the app can draft for you.',
    categories: [
      {
        slug: 'personas',
        name: 'Personas',
        blurb: 'Who your scripts sound like; one is the default.',
        icon: UserRound,
      },
      {
        slug: 'audience',
        name: 'Audience',
        blurb: 'Who you make videos for and the problem you solve.',
        icon: UsersRound,
      },
    ],
  },
  {
    name: 'Templates',
    blurb: 'The libraries generation draws from.',
    categories: [
      {
        slug: 'shapes',
        name: 'Title shapes',
        blurb: 'The template library behind title generation.',
        icon: Type,
      },
      {
        slug: 'structures',
        name: 'Video structures',
        blurb: 'Structural blueprints the Script Drafter follows.',
        icon: LayoutList,
      },
      {
        slug: 'snippets',
        name: 'Script snippets',
        blurb: 'Reusable text like the legal disclaimer.',
        icon: ScrollText,
      },
      {
        slug: 'tags',
        name: 'Affiliate tags',
        blurb: 'Where each affiliate URL will be used.',
        icon: Tag,
      },
    ],
  },
  {
    name: 'Preferences',
    blurb: 'How the output matches the way you speak.',
    categories: [
      {
        slug: 'words',
        name: 'Word replacement',
        blurb: 'Personalize text: your phrases, then contractions.',
        icon: Replace,
      },
      {
        slug: 'pace',
        name: 'Reading pace',
        blurb: 'Time a sample read to size scripts to your voice.',
        icon: Timer,
      },
    ],
  },
  {
    name: 'App',
    blurb: 'Applies to every channel, not just this one.',
    categories: [
      {
        slug: 'ai',
        name: 'AI integrations',
        blurb: 'Providers, models, and connection tests.',
        icon: Bot,
      },
      {
        to: '/settings',
        name: 'Channels',
        blurb: 'Create, rename, and delete your channels.',
        icon: FolderOpen,
      },
    ],
  },
]

function SettingsHome() {
  const { channelId } = Route.useParams()
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex w-full max-w-190 flex-col gap-5 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void navigate({ to: `/c/${channelId}` })}
          className="flex min-h-11 items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Channel home
        </button>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Settings</h2>
      </div>

      {GROUPS.map((group) => (
        <div key={group.name} className="flex flex-col gap-2">
          <div>
            <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
              {group.name}
            </div>
            <p className="mt-0.5 text-xs text-text-secondary">{group.blurb}</p>
          </div>
          {group.categories.map((category) => (
            <button
              key={category.name}
              onClick={() =>
                void navigate({ to: category.to ?? `/c/${channelId}/settings/${category.slug}` })
              }
              className="flex min-h-16 w-full cursor-pointer select-none items-center gap-3 rounded-row border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-row border border-border bg-surface-raised text-text-secondary">
                <category.icon size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-primary">{category.name}</div>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{category.blurb}</p>
              </div>
              <ChevronRight size={15} className="shrink-0 text-text-muted" />
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
