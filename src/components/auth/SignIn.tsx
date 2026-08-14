import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { Button } from '@/components/ui'

export function SignIn() {
  const { signIn } = useAuthActions()
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <div className="flex w-90 max-w-[calc(100vw-32px)] flex-col items-center gap-5 rounded-panel border border-border bg-surface p-8">
        <div className="text-lg font-bold tracking-tight text-primary">BreezyScript</div>
        <p className="text-center text-sm text-text-secondary">
          Sign in with the owner Google account to continue.
        </p>
        <Button
          size="lg"
          loading={busy}
          onClick={() => {
            setBusy(true)
            void signIn('google').catch(() => setBusy(false))
          }}
          className="w-full"
        >
          Continue with Google
        </Button>
      </div>
    </div>
  )
}
