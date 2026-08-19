import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'
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
  const { confirm, ConfirmUI } = useConfirm()

  // Dev-only data tools (own bottom section, owner 2026-08-19): hidden in
  // production builds AND server-gated on ALLOW_DEV_DATA (convex/devData.ts).
  const devStatus = useQuery(api.devData.status, import.meta.env.DEV ? {} : 'skip')
  const seedAction = useAction(api.devData.seed)
  const wipeAction = useAction(api.devData.wipeAll)
  const [seeding, setSeeding] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [devError, setDevError] = useState<string | null>(null)

  const runSeed = async () => {
    setSeeding(true)
    setDevError(null)
    try {
      await seedAction({})
    } catch (e) {
      setDevError(e instanceof Error ? e.message : 'Seeding failed.')
    } finally {
      setSeeding(false)
    }
  }

  const runWipe = async () => {
    const ok = await confirm({
      title: 'Wipe ALL app data?',
      message:
        'Every channel, note, idea, draft, link, tag, persona, and setting is permanently deleted, including everything you added by hand. You stay signed in and land on the first-run screen.',
      confirmLabel: 'Wipe everything',
    })
    if (!ok) return
    setWiping(true)
    setDevError(null)
    try {
      await wipeAction({})
      void navigate({ to: '/' })
    } catch (e) {
      setDevError(e instanceof Error ? e.message : 'Wipe failed.')
    } finally {
      setWiping(false)
    }
  }

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

      {import.meta.env.DEV && devStatus?.enabled && (
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
              Developer
            </div>
            <p className="mt-0.5 text-xs text-text-secondary">
              Local development only. Seed the Creator Compass demo channel, or wipe every channel
              and setting to test the new-user state.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-row border border-border bg-surface px-4 py-3">
            <Button variant="secondary" loading={seeding} onClick={() => void runSeed()}>
              Seed demo data
            </Button>
            <Button variant="danger" loading={wiping} onClick={() => void runWipe()}>
              Wipe all data
            </Button>
          </div>
          {devError && <p className="text-xs text-danger">{devError}</p>}
        </div>
      )}
      {ConfirmUI}
    </div>
  )
}
