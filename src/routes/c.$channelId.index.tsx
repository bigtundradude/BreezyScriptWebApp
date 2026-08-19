import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Brain, Clapperboard, Link2, Settings, type LucideIcon } from 'lucide-react'

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
    slug: 'bank',
    name: 'Scripts Pro',
    description: 'Take a video idea from first spark to a script you are ready to record.',
    icon: Clapperboard,
    accentVar: 'var(--color-tool-script)',
  },
  {
    slug: 'brain',
    name: 'Second Brain',
    description: 'Your private notebook of notes, stories, and research for this channel.',
    icon: Brain,
    accentVar: 'var(--color-tool-brain)',
  },
  {
    slug: 'links',
    name: 'Affiliate Links',
    description: 'Your affiliate links, tagged by where they go, one tap to copy.',
    icon: Link2,
    accentVar: 'var(--color-tool-bank)',
  },
  {
    slug: 'settings',
    name: 'Settings',
    description: 'Personas, audience, templates, and AI providers for this channel.',
    icon: Settings,
    accentVar: 'var(--color-tool-settings)',
  },
]

function ChannelHome() {
  const { channelId } = Route.useParams()

  return (
    <div className="mx-auto flex w-full max-w-190 flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <h1 className="text-center text-2xl font-extrabold tracking-[-0.03em] text-text-primary">
        BreezyScript
      </h1>
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
