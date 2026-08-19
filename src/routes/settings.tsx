import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Plus } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { Header } from '@/components/layout/Header'
import { Button, Card, ConfirmDialog, Input, Spinner, Textarea } from '@/components/ui'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const channels = useQuery(api.channels.list)
  const create = useMutation(api.channels.create)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <Header toolName="Settings" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-190 flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
          <div>
            <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Channels</h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              Each channel has its own Second Brain, foundations, and productions. The identity text
              is injected into every megaprompt for that channel.
            </p>
          </div>

          <div className="flex items-end gap-2.5">
            <Input
              label="New channel"
              placeholder="Channel name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  setCreating(true)
                  void create({ name: newName }).finally(() => {
                    setNewName('')
                    setCreating(false)
                  })
                }
              }}
              className="max-w-80 flex-1"
            />
            <Button
              loading={creating}
              disabled={!newName.trim()}
              onClick={() => {
                setCreating(true)
                void create({ name: newName }).finally(() => {
                  setNewName('')
                  setCreating(false)
                })
              }}
            >
              <Plus size={14} />
              Add
            </Button>
          </div>

          {channels === undefined ? (
            <div className="flex items-center gap-2 py-6 text-sm text-text-muted">
              <Spinner size={14} /> Loading…
            </div>
          ) : (
            channels.map((channel) => <ChannelCard key={channel._id} channel={channel} />)
          )}
        </div>
      </main>
    </div>
  )
}

function ChannelCard({ channel }: { channel: Doc<'channels'> }) {
  const update = useMutation(api.channels.update)
  const remove = useMutation(api.channels.remove)
  const navigate = useNavigate()

  const [name, setName] = useState(channel.name)
  const [description, setDescription] = useState(channel.description)
  const [identity, setIdentity] = useState(channel.identity)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const dirty =
    name !== channel.name || description !== channel.description || identity !== channel.identity

  const save = async () => {
    setSaving(true)
    try {
      await update({ channelId: channel._id, name, description, identity })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3 max-md:flex-col">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className="flex-2"
          />
        </div>
        <Textarea
          label="Identity"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          rows={4}
          placeholder={'Who this channel is: brand, point of view, what it stands for and against.\nInjected as the IDENTITY block in every megaprompt. Leave blank to omit.'}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" loading={saving} disabled={!dirty && !saving} onClick={() => void save()}>
            {saved ? 'Saved' : 'Save'}
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
            <span className="text-danger">Delete channel</span>
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setDeleting(true)
          void remove({ channelId: channel._id })
            .then(() => navigate({ to: '/' }))
            .finally(() => setDeleting(false))
        }}
        title={`Delete “${channel.name}”?`}
        message="This permanently deletes the channel and everything in it — notes, ideas, foundations, productions, and feedback. This can't be undone."
        confirmLabel="Delete everything"
        loading={deleting}
      />
    </Card>
  )
}
