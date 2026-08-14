import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'

export const libraryKind = v.union(
  v.literal('video_structure'),
  v.literal('cta'),
  v.literal('disclosure'),
  v.literal('description'),
)
type LibraryKind = 'video_structure' | 'cta' | 'disclosure' | 'description'

async function getOwnedItem(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<'channels'>,
  itemId: Id<'libraryItems'>,
) {
  const item = await ctx.db.get(itemId)
  if (!item || item.channelId !== channelId) throw new Error('Library item not found')
  return item
}

export const list = query({
  args: { channelId: v.id('channels'), kinds: v.array(libraryKind) },
  handler: async (ctx, { channelId, kinds }) => {
    await requireOwner(ctx)
    const results = []
    for (const kind of kinds) {
      const items = await ctx.db
        .query('libraryItems')
        .withIndex('by_channel_kind', (q) => q.eq('channelId', channelId).eq('kind', kind))
        .collect()
      results.push(...items)
    }
    return results.sort((a, b) =>
      a.isDefault !== b.isDefault ? (a.isDefault ? -1 : 1) : b.updatedAt - a.updatedAt,
    )
  },
})

export const create = mutation({
  args: {
    channelId: v.id('channels'),
    kind: libraryKind,
    title: v.string(),
    summary: v.string(),
    result: v.any(),
  },
  handler: async (ctx, { channelId, kind, title, summary, result }) => {
    await requireOwner(ctx)
    return await ctx.db.insert('libraryItems', {
      channelId,
      kind,
      title: title.trim() || 'Untitled',
      summary,
      result,
      isDefault: false,
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    channelId: v.id('channels'),
    itemId: v.id('libraryItems'),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    result: v.optional(v.any()),
  },
  handler: async (ctx, { channelId, itemId, title, summary, result }) => {
    await requireOwner(ctx)
    await getOwnedItem(ctx, channelId, itemId)
    await ctx.db.patch(itemId, {
      ...(title !== undefined ? { title: title.trim() || 'Untitled' } : {}),
      ...(summary !== undefined ? { summary } : {}),
      ...(result !== undefined ? { result } : {}),
      updatedAt: Date.now(),
    })
  },
})

// Default is scoped per (channel, kind) — desktop parity.
export const setDefault = mutation({
  args: { channelId: v.id('channels'), itemId: v.id('libraryItems') },
  handler: async (ctx, { channelId, itemId }) => {
    await requireOwner(ctx)
    const item = await getOwnedItem(ctx, channelId, itemId)
    const siblings = await ctx.db
      .query('libraryItems')
      .withIndex('by_channel_kind', (q) =>
        q.eq('channelId', channelId).eq('kind', item.kind as LibraryKind),
      )
      .collect()
    for (const sibling of siblings) {
      if (sibling.isDefault && sibling._id !== itemId) {
        await ctx.db.patch(sibling._id, { isDefault: false })
      }
    }
    await ctx.db.patch(itemId, { isDefault: true, updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { channelId: v.id('channels'), itemId: v.id('libraryItems') },
  handler: async (ctx, { channelId, itemId }) => {
    await requireOwner(ctx)
    await getOwnedItem(ctx, channelId, itemId)
    await ctx.db.delete(itemId)
  },
})

// Apply path for structure/cta megaprompts: batch-insert model-proposed items.
export const applyResult = mutation({
  args: {
    channelId: v.id('channels'),
    items: v.array(
      v.object({ kind: libraryKind, title: v.string(), summary: v.string(), result: v.any() }),
    ),
  },
  handler: async (ctx, { channelId, items }) => {
    await requireOwner(ctx)
    let inserted = 0
    for (const item of items) {
      if (!item.title.trim()) continue
      await ctx.db.insert('libraryItems', {
        channelId,
        kind: item.kind,
        title: item.title.trim(),
        summary: item.summary,
        result: item.result,
        isDefault: false,
        updatedAt: Date.now(),
      })
      inserted++
    }
    return { inserted }
  },
})
