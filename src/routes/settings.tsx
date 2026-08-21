import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, FolderOpen, Plus, Trash2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { Header } from '@/components/layout/Header'
import { Button, Input, Spinner } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

// Channel manager (mobile-first list-then-editor pattern, owner 2026-08-18):
// tap a channel card to edit it; the editor uses the standard state-driven
// action bar instead of always-open cards with per-card save buttons.
function SettingsPage() {
  const channels = useQuery(api.channels.list)
  const { confirm, ConfirmUI } = useConfirm()
  // Session keys the editor so saving a NEW channel (editing flips 'new' → id)
  // does not remount it mid-typing.
  const [editing, setEditing] = useState<'new' | Id<'channels'> | null>(null)
  const [session, setSession] = useState(0)
  const openEditor = (target: 'new' | Id<'channels'>) => {
    setSession((s) => s + 1)
    setEditing(target)
  }

  // A channel deleted elsewhere must not leave its editor open as a
  // pre-filled "create" form — fall back to the list.
  const editingResolved =
    editing === 'new' || (editing !== null && channels?.some((c) => c._id === editing))
  if (editing && channels && !editingResolved) setEditing(null)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <Header toolName="Settings" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-190 flex-col gap-4 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
          {editing && editingResolved ? (
            <ChannelEditor
              key={session}
              channel={
                editing === 'new' ? null : (channels?.find((c) => c._id === editing) ?? null)
              }
              confirm={confirm}
              onClose={() => setEditing(null)}
              onCreated={(id) => setEditing(id)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">
                    Channels
                  </h2>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    Each channel has its own Second Brain, script ideas, affiliate links, and
                    settings.
                  </p>
                </div>
                <Button className="shrink-0" onClick={() => openEditor('new')}>
                  <Plus size={14} />
                  Add channel
                </Button>
              </div>

              {channels === undefined ? (
                <div className="flex items-center gap-2 py-6 text-sm text-text-muted">
                  <Spinner size={14} /> Loading…
                </div>
              ) : (
                channels.map((channel) => (
                  <button
                    key={channel._id}
                    onClick={() => openEditor(channel._id)}
                    className="flex min-h-13 items-center gap-3 rounded-panel border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-raised"
                  >
                    <FolderOpen size={16} className="shrink-0 text-text-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {channel.name}
                      </div>
                      {channel.description && (
                        <div className="truncate text-xs text-text-muted">{channel.description}</div>
                      )}
                    </div>
                  </button>
                ))
              )}

            </>
          )}
        </div>
      </main>
      {ConfirmUI}
    </div>
  )
}

function ChannelEditor({
  channel,
  confirm,
  onClose,
  onCreated,
}: {
  channel: Doc<'channels'> | null
  confirm: (opts: { title: string; message: string; confirmLabel?: string }) => Promise<boolean>
  onClose: () => void
  onCreated: (id: Id<'channels'>) => void
}) {
  const create = useMutation(api.channels.create)
  const update = useMutation(api.channels.update)
  const remove = useMutation(api.channels.remove)
  const navigate = useNavigate()

  const baseline = useMemo(
    () => ({ name: channel?.name ?? '', description: channel?.description ?? '' }),
    [channel],
  )
  const [form, setForm] = useState(baseline)
  const [saving, setSaving] = useState(false)

  const dirty = form.name !== baseline.name || form.description !== baseline.description

  const doSave = async (stay: boolean) => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (channel) {
        await update({ channelId: channel._id, name: form.name, description: form.description })
        if (!stay) onClose()
      } else {
        const id = await create({ name: form.name, description: form.description })
        if (stay) onCreated(id as Id<'channels'>)
        else onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  // Cmd/Ctrl+S saves and stays (editor action bar pattern).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (dirty && !saving) void doSave(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const cancel = async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Discard changes?',
        message: 'Your unsaved channel edits are lost.',
        confirmLabel: 'Discard',
      })
      if (!ok) return
    }
    onClose()
  }

  const confirmRemove = async () => {
    if (!channel) return
    const ok = await confirm({
      title: `Delete “${channel.name}”?`,
      message:
        "This permanently deletes the channel and everything in it — notes, ideas, drafts, links, and settings. This can't be undone.",
      confirmLabel: 'Delete everything',
    })
    if (!ok) return
    await remove({ channelId: channel._id })
    void navigate({ to: '/' })
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => void cancel()}
        className="flex min-h-8 w-fit items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        <ChevronLeft size={15} />
        Channels
      </button>
      <h3 className="text-base font-semibold text-text-primary">
        {channel ? channel.name : 'New channel'}
      </h3>

      <Input
        label="Name"
        placeholder="e.g. Big Tundra"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <Input
        label="Description"
        placeholder="What the channel is about (optional)"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />

      <div className="sticky bottom-0 z-10 mt-1 flex items-center gap-2 border-t border-border bg-bg py-3">
        {channel && (
          <Button variant="danger" onClick={() => void confirmRemove()}>
            <Trash2 size={14} />
            Delete
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {dirty ? (
            <>
              <Button variant="secondary" onClick={() => void cancel()}>
                Cancel
              </Button>
              <Button loading={saving} onClick={() => void doSave(true)}>
                Save
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
