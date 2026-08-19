import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { Button, Spinner } from '@/components/ui'

export function SignIn() {
  const { signIn } = useAuthActions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Returning from Google with ?code=: the provider is still exchanging the
  // code but already reports "unauthenticated", which used to flash this card
  // and invite a pointless second click. Show a signing-in state instead.
  const exchangingCode = new URLSearchParams(window.location.search).has('code')
  if (exchangingCode && !error) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-2 bg-bg text-sm text-text-muted">
        <Spinner size={16} /> Signing you in…
      </div>
    )
  }
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
            setError(null)
            // Surface failures instead of swallowing them — a silent catch
            // here looks like an endless spinner (deploy debugging, 2026-08-19).
            void signIn('google').catch((e: unknown) => {
              setBusy(false)
              setError(e instanceof Error ? e.message : 'Sign-in failed. Try again.')
            })
          }}
          className="w-full"
        >
          Continue with Google
        </Button>
        {error && <p className="text-center text-xs text-danger">{error}</p>}
      </div>
    </div>
  )
}
