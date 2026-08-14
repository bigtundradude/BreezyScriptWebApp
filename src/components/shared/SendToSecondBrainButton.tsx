import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Check } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui'
import type { NoteKind } from '@/features/brain/lib'

// Ported label state machine: Send → Update → In Second Brain.
// Uses the ingest upsert — the only sanctioned cross-tool write path.
export function SendToSecondBrainButton({
  channelId,
  sourceRef,
  kind,
  title,
  body,
  tags,
  size = 'sm',
}: {
  channelId: Id<'channels'>
  sourceRef: string
  kind: NoteKind
  title: string
  body: string
  tags?: string[]
  size?: 'sm' | 'md'
}) {
  const existing = useQuery(api.notes.ingestLookup, { channelId, sourceRef })
  const push = useMutation(api.notes.ingestPush)
  const [busy, setBusy] = useState(false)
  const [justSent, setJustSent] = useState(false)
  const [error, setError] = useState('')

  const label = justSent ? 'In Second Brain' : existing ? 'Update in Second Brain' : 'Send to Second Brain'

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant="secondary"
        size={size}
        disabled={!body.trim() || busy || justSent}
        loading={busy}
        onClick={() => {
          setBusy(true)
          setError('')
          void push({ channelId, sourceRef, kind, title, body, tags })
            .then(() => setJustSent(true))
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to send'))
            .finally(() => setBusy(false))
        }}
      >
        {justSent && <Check size={13} className="text-success" />}
        {label}
      </Button>
      {error && <span className="text-xs text-warning">{error}</span>}
    </span>
  )
}
