import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { SignIn } from '@/components/auth/SignIn'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { Spinner } from '@/components/ui'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-dvh items-center justify-center bg-bg text-text-muted">
          <Spinner size={20} />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>
        <Outlet />
        <CommandPalette />
      </Authenticated>
    </>
  )
}
