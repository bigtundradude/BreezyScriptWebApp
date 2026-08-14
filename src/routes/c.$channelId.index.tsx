import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ArrowRight, Brain, Clapperboard, type LucideIcon } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/c/$channelId/')({
  component: ChannelHome,
})

const TOOLS: Array<{
  slug: string
  name: string
  description: string
  icon: LucideIcon
  accentVar: string
}> = [
  {
    slug: 'scripts',
    name: 'Scripts Pro',
    description: 'Idea to finished script: packaging, brain dump, draft, and metadata — powered by your own AI.',
    icon: Clapperboard,
    accentVar: 'var(--color-tool-script)',
  },
  {
    slug: 'brain',
    name: 'Second Brain',
    description: 'This channel’s private notebook: notes, stories, research, and finished scripts.',
    icon: Brain,
    accentVar: 'var(--color-tool-brain)',
  },
]

function ChannelHome() {
  const { channelId } = Route.useParams()
  const channel = useQuery(api.channels.get, { channelId: channelId as Id<'channels'> })

  return (
    <div className="mx-auto flex w-full max-w-190 flex-col gap-8 px-8 py-12">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-0.04em] text-text-primary">
          {channel?.name ?? ' '}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">Pick a tool to get to work.</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        {TOOLS.map((tool) => (
          <Link
            key={tool.slug}
            to={`/c/$channelId/${tool.slug}` as string}
            params={{ channelId }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5"
            style={{
              // Accent identity per tool — hover border + faint glow, ported recipe.
              ['--accent' as string]: tool.accentVar,
            }}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-30 w-30 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--accent) 4%, transparent)' }}
            />
            <div
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-row border"
              style={{
                background: 'color-mix(in srgb, var(--accent) 9%, transparent)',
                borderColor: 'color-mix(in srgb, var(--accent) 19%, transparent)',
              }}
            >
              <tool.icon size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-md font-semibold text-text-primary">{tool.name}</div>
              <ArrowRight
                size={14}
                className="text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
