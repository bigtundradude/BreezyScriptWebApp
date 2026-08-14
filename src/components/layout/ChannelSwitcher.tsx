import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Check, ChevronDown, FolderOpen, Settings } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

export function ChannelSwitcher({ activeChannelId }: { activeChannelId?: Id<'channels'> }) {
  const channels = useQuery(api.channels.list)
  const setLastChannel = useMutation(api.channels.setLastChannel)
  const navigate = useNavigate()

  const active = channels?.find((c) => c._id === activeChannelId)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex h-8 max-w-55 items-center gap-1.5 rounded-control border border-border bg-surface-raised px-2.5 text-xs text-text-primary transition-colors hover:bg-sidebar-active">
          <FolderOpen size={13} className="shrink-0 text-primary" />
          <span className="truncate">{active?.name ?? 'Channels'}</span>
          <ChevronDown size={12} className="shrink-0 text-text-muted" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-100 w-60 rounded-field border border-border bg-surface p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        >
          <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted">
            Channel
          </div>
          {(channels ?? []).map((channel) => (
            <DropdownMenu.Item
              key={channel._id}
              className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-1.5 text-sm text-text-primary outline-none data-highlighted:bg-surface-raised"
              onSelect={() => {
                void setLastChannel({ channelId: channel._id })
                void navigate({ to: '/c/$channelId', params: { channelId: channel._id } })
              }}
            >
              <span className="flex-1 truncate">{channel.name}</span>
              {channel._id === activeChannelId && <Check size={14} className="text-primary" />}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-1.5 text-sm text-text-secondary outline-none data-highlighted:bg-surface-raised"
            onSelect={() => void navigate({ to: '/settings' })}
          >
            <Settings size={13} />
            Manage channels
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
