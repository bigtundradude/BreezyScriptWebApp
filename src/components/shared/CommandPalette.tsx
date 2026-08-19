import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Brain, FolderOpen, Lightbulb, Settings, StickyNote } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

// Cmd/Ctrl+K jump-anywhere palette (phase 4). cmdk supplies filtering and
// keyboard nav; tokens supply the look.
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Derive the active channel from the URL so the palette is channel-aware.
  const channelMatch = pathname.match(/\/c\/([^/]+)/)
  const activeChannelId = (channelMatch?.[1] ?? null) as Id<'channels'> | null

  const channels = useQuery(api.channels.list, open ? {} : 'skip')
  const ideas = useQuery(
    api.ideaBank.list,
    open && activeChannelId ? { channelId: activeChannelId } : 'skip',
  )
  const notes = useQuery(
    api.notes.list,
    open && activeChannelId ? { channelId: activeChannelId } : 'skip',
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (to: string) => {
    setOpen(false)
    void navigate({ to })
  }

  const tools = useMemo(() => {
    if (!activeChannelId) return []
    const base = `/c/${activeChannelId}`
    return [
      { label: 'Second Brain', icon: Brain, to: `${base}/brain` },
      { label: 'Scripts Pro', icon: Lightbulb, to: `${base}/bank` },
      { label: 'New idea', icon: Lightbulb, to: `${base}/bank/new` },
      { label: 'New note', icon: StickyNote, to: `${base}/brain/new` },
      { label: 'Channel settings', icon: Settings, to: `${base}/settings` },
    ]
  }, [activeChannelId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-300 flex items-start justify-center bg-black/60 pt-[18vh]" onClick={() => setOpen(false)}>
      <Command
        label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-140 max-w-[calc(100vw-32px)] overflow-hidden rounded-panel border border-border bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      >
        <Command.Input
          autoFocus
          placeholder="Jump to…"
          className="w-full border-b border-border-subtle bg-transparent px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-sm text-text-muted">
            Nothing matches.
          </Command.Empty>

          <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-text-muted">
            {tools.map((tool) => (
              <Item key={tool.to} icon={<tool.icon size={14} />} onSelect={() => go(tool.to)}>
                {tool.label}
              </Item>
            ))}
            <Item icon={<Settings size={14} />} onSelect={() => go('/settings')}>
              Settings
            </Item>
          </Command.Group>

          {(channels ?? []).length > 0 && (
            <Command.Group heading="Channels" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-text-muted">
              {(channels ?? []).map((channel) => (
                <Item
                  key={channel._id}
                  icon={<FolderOpen size={14} />}
                  onSelect={() => go(`/c/${channel._id}`)}
                >
                  {channel.name}
                </Item>
              ))}
            </Command.Group>
          )}

          {(ideas ?? []).length > 0 && (
            <Command.Group heading="Ideas" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-text-muted">
              {(ideas ?? []).slice(0, 12).map((idea) => (
                <Item
                  key={idea._id}
                  icon={<Lightbulb size={14} />}
                  onSelect={() => go(`/c/${activeChannelId}/bank/${idea._id}`)}
                >
                  {idea.title}
                </Item>
              ))}
            </Command.Group>
          )}

          {(notes ?? []).length > 0 && (
            <Command.Group heading="Notes" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-text-muted">
              {(notes ?? []).slice(0, 12).map((note) => (
                <Item
                  key={note._id}
                  icon={<StickyNote size={14} />}
                  onSelect={() => go(`/c/${activeChannelId}/brain/${note._id}`)}
                >
                  {note.title}
                </Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  )
}

function Item({
  icon,
  onSelect,
  children,
}: {
  icon: React.ReactNode
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-sm text-text-primary data-[selected=true]:bg-surface-raised"
    >
      <span className="text-text-muted">{icon}</span>
      <span className="truncate">{children}</span>
    </Command.Item>
  )
}
