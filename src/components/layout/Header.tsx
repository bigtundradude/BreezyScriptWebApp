import { Link } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { LogOut } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'
import { ChannelSwitcher } from './ChannelSwitcher'
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator'

// 48px header ported from the desktop app — minus the macOS traffic-light
// inset and drag region, which have no web equivalent.
export function Header({
  toolName,
  activeChannelId,
  right,
}: {
  toolName?: string
  activeChannelId?: Id<'channels'>
  right?: React.ReactNode
}) {
  const { signOut } = useAuthActions()
  return (
    <header className="flex h-12 shrink-0 select-none items-center gap-3 border-b border-border-subtle bg-header px-4">
      <Link
        to="/"
        className="text-md font-bold tracking-[-0.02em] text-primary"
      >
        BreezyScript
      </Link>
      {toolName && (
        <>
          <span className="text-border">/</span>
          <span className="text-base font-medium text-text-secondary">{toolName}</span>
        </>
      )}
      <div className="ml-auto flex items-center gap-2.5">
        <ConnectionIndicator />
        {right}
        <ChannelSwitcher activeChannelId={activeChannelId} />
        <button
          onClick={() => void signOut()}
          title="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  )
}
