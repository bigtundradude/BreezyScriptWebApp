import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'

// Affiliate Links micro tool (docs/affiliate-links-plan.md). Links and their
// tag library in one module. A tag can never be deleted while a URL uses it.

export const DEFAULT_TAGS = ['Video Description', 'Website', 'Course']

async function tagsOf(ctx: QueryCtx | MutationCtx, channelId: Id<'channels'>) {
  const tags = await ctx.db
    .query('affiliateTags')
    .withIndex('by_channel', (q) => q.eq('channelId', channelId))
    .collect()
  return tags.sort((a, b) => a.sortOrder - b.sortOrder)
}

async function getOwnedTag(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<'channels'>,
  tagId: Id<'affiliateTags'>,
) {
  const tag = await ctx.db.get(tagId)
  if (!tag || tag.channelId !== channelId) throw new Error('Tag not found')
  return tag
}

async function getOwnedLink(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<'channels'>,
  linkId: Id<'affiliateLinks'>,
) {
  const link = await ctx.db.get(linkId)
  if (!link || link.channelId !== channelId) throw new Error('Link not found')
  return link
}

export const listTags = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    return await tagsOf(ctx, channelId)
  },
})

// Idempotent: called on first mount of the links page / tags settings so a
// channel gets the default tags without any owner setup step. Seeds ONCE per
// channel (userPrefs marker), so deleting every tag stays deleted instead of
// the defaults reappearing under the user's finger.
export const ensureDefaultTags = mutation({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const markerKey = `affiliateTagsSeeded:${channelId}`
    const marker = await ctx.db
      .query('userPrefs')
      .withIndex('by_key', (q) => q.eq('key', markerKey))
      .unique()
    if (marker) return
    const existing = await tagsOf(ctx, channelId)
    if (existing.length === 0) {
      for (const [index, name] of DEFAULT_TAGS.entries()) {
        await ctx.db.insert('affiliateTags', {
          channelId,
          name,
          sortOrder: index,
          updatedAt: Date.now(),
        })
      }
    }
    await ctx.db.insert('userPrefs', { key: markerKey, value: true, updatedAt: Date.now() })
  },
})

export const createTag = mutation({
  args: { channelId: v.id('channels'), name: v.string() },
  handler: async (ctx, { channelId, name }) => {
    await requireOwner(ctx)
    const siblings = await tagsOf(ctx, channelId)
    return await ctx.db.insert('affiliateTags', {
      channelId,
      name: name.trim() || 'Untitled',
      sortOrder: (siblings[siblings.length - 1]?.sortOrder ?? -1) + 1,
      updatedAt: Date.now(),
    })
  },
})

export const renameTag = mutation({
  args: { channelId: v.id('channels'), tagId: v.id('affiliateTags'), name: v.string() },
  handler: async (ctx, { channelId, tagId, name }) => {
    await requireOwner(ctx)
    await getOwnedTag(ctx, channelId, tagId)
    await ctx.db.patch(tagId, { name: name.trim() || 'Untitled', updatedAt: Date.now() })
  },
})

export const moveTag = mutation({
  args: {
    channelId: v.id('channels'),
    tagId: v.id('affiliateTags'),
    direction: v.union(v.literal('up'), v.literal('down')),
  },
  handler: async (ctx, { channelId, tagId, direction }) => {
    await requireOwner(ctx)
    await getOwnedTag(ctx, channelId, tagId)
    const tags = await tagsOf(ctx, channelId)
    const index = tags.findIndex((t) => t._id === tagId)
    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || swapWith < 0 || swapWith >= tags.length) return
    // Normalize sortOrder to indexes while swapping, so orders stay dense.
    const reordered = [...tags]
    ;[reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]]
    for (const [i, tag] of reordered.entries()) {
      if (tag.sortOrder !== i) await ctx.db.patch(tag._id, { sortOrder: i })
    }
  },
})

export const removeTag = mutation({
  args: { channelId: v.id('channels'), tagId: v.id('affiliateTags') },
  handler: async (ctx, { channelId, tagId }) => {
    await requireOwner(ctx)
    await getOwnedTag(ctx, channelId, tagId)
    const links = await ctx.db
      .query('affiliateLinks')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    const used = links.filter((link) => link.urls.some((u) => u.tagId === tagId)).length
    if (used > 0) {
      throw new Error(`This tag is used by ${used} link${used === 1 ? '' : 's'}. Retag those URLs first.`)
    }
    await ctx.db.delete(tagId)
  },
})

export const list = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const links = await ctx.db
      .query('affiliateLinks')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    return links.sort((a, b) => a.title.localeCompare(b.title))
  },
})

export const save = mutation({
  args: {
    channelId: v.id('channels'),
    linkId: v.optional(v.id('affiliateLinks')),
    title: v.string(),
    shortTitle: v.string(),
    urls: v.array(v.object({ url: v.string(), tagId: v.id('affiliateTags') })),
  },
  handler: async (ctx, { channelId, linkId, title, shortTitle, urls }) => {
    await requireOwner(ctx)
    const validTagIds = new Set((await tagsOf(ctx, channelId)).map((t) => t._id as string))
    const fields = {
      title: title.trim() || 'Untitled',
      shortTitle: shortTitle.trim(),
      urls: urls
        .map((u) => ({ url: u.url.trim(), tagId: u.tagId }))
        .filter((u) => u.url && validTagIds.has(u.tagId as string)),
      updatedAt: Date.now(),
    }
    if (linkId) {
      await getOwnedLink(ctx, channelId, linkId)
      await ctx.db.patch(linkId, fields)
      return linkId
    }
    return await ctx.db.insert('affiliateLinks', { channelId, ...fields })
  },
})

export const remove = mutation({
  args: { channelId: v.id('channels'), linkId: v.id('affiliateLinks') },
  handler: async (ctx, { channelId, linkId }) => {
    await requireOwner(ctx)
    await getOwnedLink(ctx, channelId, linkId)
    await ctx.db.delete(linkId)
  },
})
