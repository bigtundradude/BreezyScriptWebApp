import { useState } from 'react'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button, Input, Spinner } from '@/components/ui'

export const Route = createFileRoute('/')({
  component: RootRedirect,
})

// '/' resolves to the last-used channel, the first channel, or first-run onboarding.
function RootRedirect() {
  const channels = useQuery(api.channels.list)
  const lastChannelId = useQuery(api.channels.getLastChannel)

  if (channels === undefined || lastChannelId === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-text-muted">
        <Spinner size={20} />
      </div>
    )
  }

  if (channels.length === 0) return <CreateFirstChannel />

  const target = channels.find((c) => c._id === lastChannelId)?._id ?? channels[0]._id
  return <Navigate to="/c/$channelId" params={{ channelId: target }} replace />
}

function CreateFirstChannel() {
  const create = useMutation(api.channels.create)
  const setLastChannel = useMutation(api.channels.setLastChannel)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim()) {
      setError('Give the channel a name.')
      return
    }
    setBusy(true)
    try {
      const channelId = await create({ name, description })
      await setLastChannel({ channelId })
      // Root query re-renders reactively and redirects into the new channel.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="flex w-105 max-w-full flex-col gap-4 rounded-panel border border-border bg-surface p-8">
        <div className="text-lg font-bold tracking-tight text-text-primary">Create your first channel</div>
        <p className="text-sm leading-relaxed text-text-secondary">
          Everything in BreezyScript — notes, ideas, scripts — lives inside a channel. Name it after
          your YouTube channel.
        </p>
        <Input
          label="Channel name"
          placeholder="e.g. Big Tundra"
          value={name}
          error={error || undefined}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          autoFocus
        />
        <Input
          label="Description"
          placeholder="What the channel is about (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
        <Button loading={busy} onClick={() => void submit()}>
          Create channel
        </Button>
      </div>
    </div>
  )
}
