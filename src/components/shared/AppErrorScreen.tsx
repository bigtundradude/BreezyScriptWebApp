import { useAuthActions } from '@convex-dev/auth/react'
import { ConvexError } from 'convex/values'
import { Button } from '@/components/ui'

// Shared error boundary screen. The one case worth special-casing is the
// owner gate rejecting the signed-in Google account (ConvexError not_owner):
// it hits every page at once and needs a Sign out action, not a stack trace.
export function AppErrorScreen({ error }: { error: Error }) {
  const { signOut } = useAuthActions()

  const data = error instanceof ConvexError ? (error.data as { code?: string; email?: string }) : null

  if (data?.code === 'not_owner' || data?.code === 'not_signed_in') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-4">
        <div className="text-md font-semibold text-text-primary">Wrong Google account</div>
        <p className="max-w-105 text-center text-sm text-text-secondary">
          {data.code === 'not_owner' && data.email
            ? `You are signed in as ${data.email}, which is not the owner account for this app.`
            : 'Your session is not signed in with the owner account.'}{' '}
          Sign out, then sign back in with the owner Google account.
        </p>
        <Button variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-4">
      <div className="text-md font-semibold text-text-primary">Something went wrong</div>
      <p className="max-w-120 break-words text-center text-sm text-danger">{error.message}</p>
      <Button variant="secondary" onClick={() => window.location.assign('/app/')}>
        Back to home
      </Button>
    </div>
  )
}
