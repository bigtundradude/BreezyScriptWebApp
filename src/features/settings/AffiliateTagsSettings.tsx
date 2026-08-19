import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button, Input, Spinner } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'

// Affiliate link tags (docs/affiliate-links-plan.md): where each URL of a link
// will be used. Defaults seed on first visit; a tag in use cannot be deleted.
export function AffiliateTagsSettings({ channelId }: { channelId: Id<'channels'> }) {
  const tags = useQuery(api.affiliateLinks.listTags, { channelId })
  const links = useQuery(api.affiliateLinks.list, { channelId })
  const ensureDefaults = useMutation(api.affiliateLinks.ensureDefaultTags)
  const createTag = useMutation(api.affiliateLinks.createTag)
  const renameTag = useMutation(api.affiliateLinks.renameTag)
  const moveTag = useMutation(api.affiliateLinks.moveTag)
  const removeTag = useMutation(api.affiliateLinks.removeTag)
  const { confirm, ConfirmUI } = useConfirm()

  const [edits, setEdits] = useState<Record<string, string>>({})
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const seededRef = useRef(false)
  useEffect(() => {
    if (!seededRef.current && tags && tags.length === 0) {
      seededRef.current = true
      void ensureDefaults({ channelId })
    }
  }, [tags, ensureDefaults, channelId])

  if (!tags || !links) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner size={14} /> Loading tags…
      </div>
    )
  }

  const usedCount = (tagId: string) =>
    links.filter((link) => link.urls.some((u) => (u.tagId as string) === tagId)).length

  const commitRename = async (tagId: Id<'affiliateTags'>, original: string) => {
    const edit = edits[tagId as string]
    if (edit === undefined || edit.trim() === original) return
    await renameTag({ channelId, tagId, name: edit })
    setEdits((prev) => {
      const next = { ...prev }
      delete next[tagId as string]
      return next
    })
  }

  const confirmRemove = async (tagId: Id<'affiliateTags'>, name: string) => {
    const ok = await confirm({
      title: `Delete tag “${name}”?`,
      message: 'The tag is removed from the library. Tags in use by a link cannot be deleted.',
      confirmLabel: 'Delete',
    })
    if (ok) await removeTag({ channelId, tagId })
  }

  const add = async () => {
    setAdding(true)
    try {
      await createTag({ channelId, name: newName })
      setNewName('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        Where each affiliate URL will be used. Every URL on a link carries exactly one of
        these tags, so the right tracking link is always one tap away.
      </p>

      {tags.map((tag, index) => {
        const used = usedCount(tag._id as string)
        return (
          <div
            key={tag._id}
            className="flex items-center gap-2 rounded-panel border border-border bg-surface p-2 pl-3"
          >
            <Input
              value={edits[tag._id as string] ?? tag.name}
              onChange={(e) => setEdits((prev) => ({ ...prev, [tag._id as string]: e.target.value }))}
              onBlur={() => void commitRename(tag._id, tag.name)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commitRename(tag._id, tag.name)
              }}
              className="min-w-0 flex-1"
            />
            {used > 0 && (
              <span className="shrink-0 text-2xs text-text-muted">
                {used} link{used === 1 ? '' : 's'}
              </span>
            )}
            <button
              aria-label={`Move ${tag.name} up`}
              disabled={index === 0}
              onClick={() => void moveTag({ channelId, tagId: tag._id, direction: 'up' })}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-30"
            >
              <ArrowUp size={14} />
            </button>
            <button
              aria-label={`Move ${tag.name} down`}
              disabled={index === tags.length - 1}
              onClick={() => void moveTag({ channelId, tagId: tag._id, direction: 'down' })}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-30"
            >
              <ArrowDown size={14} />
            </button>
            <button
              aria-label={`Delete tag ${tag.name}`}
              disabled={used > 0}
              title={used > 0 ? `Used by ${used} link${used === 1 ? '' : 's'}` : undefined}
              onClick={() => void confirmRemove(tag._id, tag.name)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      })}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (newName.trim()) void add()
        }}
        className="flex gap-2 rounded-panel border border-border bg-surface p-3"
      >
        <Input
          placeholder="New tag, e.g. Newsletter"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" disabled={!newName.trim()} loading={adding}>
          <Plus size={14} />
          Add
        </Button>
      </form>
      {ConfirmUI}
    </div>
  )
}
