import { useEffect, useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { Plus, Trash2, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Button, Input, Select } from '@/components/ui'

// Affiliate link editor (docs/affiliate-links-plan.md): title + short title
// entered once, then one row per URL, each with exactly one tag. Standard
// state-driven action bar; every destructive step goes through confirm.

type UrlRow = { url: string; tagId: string }
type Form = { title: string; shortTitle: string; urls: UrlRow[] }

export function LinkEditor({
  channelId,
  link,
  tags,
  confirm,
  onClose,
  onCreated,
}: {
  channelId: Id<'channels'>
  link: Doc<'affiliateLinks'> | null
  tags: Doc<'affiliateTags'>[]
  confirm: (opts: { title: string; message: string; confirmLabel?: string }) => Promise<boolean>
  onClose: () => void
  onCreated: (id: Id<'affiliateLinks'>) => void
}) {
  const save = useMutation(api.affiliateLinks.save)
  const remove = useMutation(api.affiliateLinks.remove)

  const baseline = useMemo<Form>(
    () =>
      link
        ? {
            title: link.title,
            shortTitle: link.shortTitle,
            urls: link.urls.map((u) => ({ url: u.url, tagId: u.tagId as string })),
          }
        : { title: '', shortTitle: '', urls: [{ url: '', tagId: (tags[0]?._id as string) ?? '' }] },
    [link, tags],
  )
  const [form, setForm] = useState<Form>(baseline)
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)

  const addUrlRow = () => {
    // Preselect the first tag no row uses yet, since one URL per placement is
    // the common case; fall back to the first tag.
    const usedTagIds = new Set(form.urls.map((u) => u.tagId))
    const nextTag = tags.find((t) => !usedTagIds.has(t._id as string)) ?? tags[0]
    setForm((f) => ({ ...f, urls: [...f.urls, { url: '', tagId: (nextTag?._id as string) ?? '' }] }))
  }

  const removeUrlRow = async (index: number) => {
    if (form.urls[index].url.trim()) {
      const ok = await confirm({
        title: 'Remove this URL?',
        message: 'The URL and its tag assignment are discarded.',
        confirmLabel: 'Remove',
      })
      if (!ok) return
    }
    setForm((f) => ({ ...f, urls: f.urls.filter((_, i) => i !== index) }))
  }

  const doSave = async (stay: boolean) => {
    setSaving(true)
    try {
      const id = await save({
        channelId,
        linkId: link?._id,
        title: form.title,
        shortTitle: form.shortTitle,
        urls: form.urls
          .filter((u) => u.url.trim() && u.tagId)
          .map((u) => ({ url: u.url, tagId: u.tagId as Id<'affiliateTags'> })),
      })
      if (stay) {
        if (!link) onCreated(id as Id<'affiliateLinks'>)
      } else {
        onClose()
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
        message: 'Your unsaved edits to this link are lost.',
        confirmLabel: 'Discard',
      })
      if (!ok) return
    }
    onClose()
  }

  const confirmRemove = async () => {
    if (!link) return
    const ok = await confirm({
      title: `Delete “${link.title}”?`,
      message: 'The link and all its URLs are permanently removed.',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await remove({ channelId, linkId: link._id })
    onClose()
  }

  const tagOptions = tags.map((t) => ({ value: t._id as string, label: t.name }))

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold text-text-primary">
        {link ? link.title : 'New link'}
      </h3>

      <Input
        label="Title"
        placeholder="e.g. Sony ZV-1 II vlogging camera"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
      />
      <Input
        label="Short title"
        hint="Used by Copy with title, pasted as short title, arrow, URL."
        placeholder="e.g. Sony ZV-1 II"
        value={form.shortTitle}
        onChange={(e) => setForm((f) => ({ ...f, shortTitle: e.target.value }))}
      />

      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-text-secondary">URLs</div>
        {form.urls.length === 0 && (
          <p className="text-xs text-text-muted">No URLs yet. Add one per place this link goes.</p>
        )}
        {form.urls.map((row, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-3"
          >
            <Input
              placeholder="https://…"
              inputMode="url"
              value={row.url}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  urls: f.urls.map((u, i) => (i === index ? { ...u, url: e.target.value } : u)),
                }))
              }
            />
            <div className="flex items-center gap-2">
              <Select
                options={tagOptions}
                value={row.tagId || null}
                onChange={(tagId) =>
                  setForm((f) => ({
                    ...f,
                    urls: f.urls.map((u, i) => (i === index ? { ...u, tagId } : u)),
                  }))
                }
                className="min-w-44 flex-1"
              />
              <button
                aria-label={`Remove URL ${index + 1}`}
                onClick={() => void removeUrlRow(index)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
        <Button size="sm" variant="ghost" className="w-fit" onClick={addUrlRow}>
          <Plus size={13} />
          Add URL
        </Button>
      </div>

      <div className="sticky bottom-0 z-10 mt-1 flex items-center gap-2 border-t border-border bg-bg py-3">
        {link && (
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
              <Button loading={saving} onClick={() => void doSave(false)}>
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
