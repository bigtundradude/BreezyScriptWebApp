import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Link2,
  Plus,
  SlidersHorizontal,
} from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ListPage } from '@/components/layout/ListPage'
import { Badge, Button, EmptyState, SearchInput, Select } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'
import { CopyAction } from '@/features/links/CopyAction'
import { useLiveSearch } from '@/lib/useLiveSearch'
import { LinkEditor } from '@/features/links/LinkEditor'

// Affiliate Links (docs/affiliate-links-plan.md): searchable by title and
// short title, filterable by tag, one-tap copy actions on every URL.

type LinksSearch = { q?: string; tag?: string }

export const Route = createFileRoute('/c/$channelId/links')({
  validateSearch: (search: Record<string, unknown>): LinksSearch => ({
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
    tag: typeof search.tag === 'string' && search.tag ? search.tag : undefined,
  }),
  component: LinksPage,
})

// Copy-with-title separator: rightwards arrow U+2192 (&rarr;) with one space
// on each side (owner, 2026-08-18).
const SEPARATOR = ' → '

function LinksPage() {
  const { channelId } = Route.useParams()
  const { q, tag } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { confirm, ConfirmUI } = useConfirm()

  const links = useQuery(api.affiliateLinks.list, { channelId: channelId as Id<'channels'> })
  const tags = useQuery(api.affiliateLinks.listTags, { channelId: channelId as Id<'channels'> })
  const ensureDefaults = useMutation(api.affiliateLinks.ensureDefaultTags)

  // Debounced live search (owner, 2026-08-18); filters hide behind the toggle.
  const { input, setInput } = useLiveSearch(q, (value) =>
    void navigate({ search: (prev) => ({ ...prev, q: value }), replace: true }),
  )
  const [showFilters, setShowFilters] = useState(Boolean(tag))
  // Session keys the editor so saving a NEW link (editing flips 'new' → id)
  // does not remount it and drop in-flight typing.
  const [editing, setEditing] = useState<'new' | Id<'affiliateLinks'> | null>(null)
  const [session, setSession] = useState(0)
  const openEditor = (target: 'new' | Id<'affiliateLinks'>) => {
    setSession((s) => s + 1)
    setEditing(target)
  }

  // First visit seeds the default tags (once per channel, marker-guarded
  // server-side; the ref keeps a failing mutation from re-firing every render).
  const seededRef = useRef(false)
  useEffect(() => {
    if (!seededRef.current && tags && tags.length === 0) {
      seededRef.current = true
      void ensureDefaults({ channelId: channelId as Id<'channels'> })
    }
  }, [tags, ensureDefaults, channelId])

  const setTagFilter = (value: string) =>
    void navigate({ search: (prev) => ({ ...prev, tag: value === 'all' ? undefined : value }) })

  const tagName = new Map((tags ?? []).map((t) => [t._id as string, t.name]))

  // Search matches title + short title only (owner, 2026-08-18); tag filter
  // shows links having at least one URL with that tag. Client-side over the
  // channel's (single-user small) list.
  const needle = (q ?? '').toLowerCase()
  const visible = (links ?? []).filter((link) => {
    if (needle && !link.title.toLowerCase().includes(needle) && !link.shortTitle.toLowerCase().includes(needle))
      return false
    if (tag && !link.urls.some((u) => (u.tagId as string) === tag)) return false
    return true
  })

  const filtered = Boolean(q || tag)
  const loading = links === undefined || tags === undefined

  if (editing && tags) {
    const link = editing === 'new' ? null : (links?.find((l) => l._id === editing) ?? null)
    if (editing !== 'new' && links && !link) setEditing(null)
    return (
      <div className="mx-auto flex w-full max-w-190 flex-col gap-4 px-4 py-5 pb-10 md:px-8 md:py-7 md:pb-12">
        <button
          onClick={() => setEditing(null)}
          className="flex min-h-8 w-fit items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Affiliate Links
        </button>
        <LinkEditor
          key={session}
          channelId={channelId as Id<'channels'>}
          link={link}
          tags={tags}
          confirm={confirm}
          onClose={() => setEditing(null)}
          onCreated={(id) => setEditing(id)}
        />
        {ConfirmUI}
      </div>
    )
  }

  return (
    <>
    <ListPage
      search={
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => void navigate({ to: `/c/${channelId}` })}
            className="flex min-h-8 w-fit items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            <ChevronLeft size={15} />
            Channel home
          </button>
          <div className="flex gap-2">
            <SearchInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onClear={() => setInput('')}
              placeholder="Search links…"
              className="flex-1"
            />
            <Button
              type="button"
              variant={tag ? 'primary' : showFilters ? 'secondary' : 'ghost'}
              iconOnly
              aria-label="Toggle filters"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal size={15} />
            </Button>
            <Button type="button" className="max-md:hidden" onClick={() => openEditor('new')}>
              <Plus size={14} />
              New link
            </Button>
          </div>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                options={[
                  { value: 'all', label: 'All tags' },
                  ...(tags ?? []).map((t) => ({ value: t._id as string, label: t.name })),
                ]}
                value={tag ?? 'all'}
                onChange={setTagFilter}
                className="min-w-40"
              />
            </div>
          )}
        </div>
      }
      loading={loading}
      isEmpty={!loading && visible.length === 0}
      empty={
        filtered ? (
          <EmptyState
            icon={Link2}
            title="No matching links"
            description="Try a different search or tag."
          />
        ) : (
          <EmptyState
            icon={Link2}
            title="No affiliate links yet"
            description="Add a link once, tag each URL by where it goes, then copy from anywhere."
            action={{ label: 'New link', onClick: () => openEditor('new') }}
          />
        )
      }
    >
      {visible.map((link) => (
        <div key={link._id} className="rounded-panel border border-border bg-surface">
          <button
            onClick={() => openEditor(link._id)}
            className="flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised"
          >
            <Link2 size={16} className="shrink-0 text-text-muted" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text-primary">{link.title}</div>
              {link.shortTitle && (
                <div className="truncate text-xs text-text-muted">{link.shortTitle}</div>
              )}
            </div>
            <ChevronRight size={15} className="shrink-0 text-text-muted" />
          </button>
          {link.urls.map((u, index) => (
            <div
              key={index}
              className="flex items-center gap-2 border-t border-border-subtle px-4 py-2"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Badge variant="muted" className="w-fit">
                  {tagName.get(u.tagId as string) ?? 'Untagged'}
                </Badge>
                <span className="truncate text-xs text-text-muted">{u.url}</span>
              </div>
              <CopyAction text={u.url} label="Copy link" icon={Link2} />
              <CopyAction
                text={`${link.shortTitle || link.title}${SEPARATOR}${u.url}`}
                label="Copy short title and link"
                icon={ArrowRight}
              />
            </div>
          ))}
        </div>
      ))}
      {/* Keeps the floating button from covering the last row when scrolled to the end. */}
      <div aria-hidden className="h-14 md:hidden" />
    </ListPage>
    <button
      aria-label="New link"
      onClick={() => openEditor('new')}
      className="fixed bottom-5 right-5 z-20 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-text-inverse shadow-[0_4px_16px_rgba(0,0,0,0.55)] transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none md:hidden"
    >
      <Plus size={22} />
    </button>
    {ConfirmUI}
    </>
  )
}
