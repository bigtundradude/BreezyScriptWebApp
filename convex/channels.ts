import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { requireOwner } from './lib/owner'

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx)
    const channels = await ctx.db.query('channels').collect()
    return channels.sort((a, b) => b._creationTime - a._creationTime)
  },
})

export const get = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    return await ctx.db.get(channelId)
  },
})

export const create = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, { name, description }) => {
    await requireOwner(ctx)
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Give the channel a name')
    return await ctx.db.insert('channels', {
      name: trimmed,
      description: description?.trim() ?? '',
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    channelId: v.id('channels'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { channelId, name, description }) => {
    await requireOwner(ctx)
    const channel = await ctx.db.get(channelId)
    if (!channel) throw new Error('Channel not found')
    const patch: Partial<typeof channel> = { updatedAt: Date.now() }
    if (name !== undefined) {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Give the channel a name')
      patch.name = trimmed
    }
    if (description !== undefined) patch.description = description
    await ctx.db.patch(channelId, patch)
  },
})

// Convex has no FK cascades — deleting a channel fans out over every scoped
// table explicitly (plan §4). Channel data volumes are single-user small.
export const remove = mutation({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const channel = await ctx.db.get(channelId)
    if (!channel) return

    for (const table of ['notes', 'bankIdeas', 'bankTitleCandidates', 'bankQuestions', 'bankSnippets', 'bankStructures', 'bankDrafts', 'bankRefinementDrafts', 'bankReplacements', 'bankWordPrefs', 'bankPersonas', 'bankAudiences', 'affiliateTags', 'affiliateLinks', 'titleShapes', 'titleTemplates'] as const) {
      const docs = await ctx.db
        .query(table)
        .withIndex('by_channel', (q) => q.eq('channelId', channelId))
        .collect()
      for (const doc of docs) await ctx.db.delete(doc._id)
    }

    // Thumbnails also own storage files.
    const thumbnails = await ctx.db
      .query('bankThumbnails')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    for (const thumbnail of thumbnails) {
      await ctx.storage.delete(thumbnail.storageId)
      await ctx.db.delete(thumbnail._id)
    }

    // Clear prefs that point at this channel.
    const prefs = await ctx.db.query('userPrefs').collect()
    for (const pref of prefs) {
      if (pref.key === 'lastChannelId' && pref.value === channelId) await ctx.db.delete(pref._id)
      if (pref.key === `wordsPerMinute:${channelId}`) await ctx.db.delete(pref._id)
    }

    await ctx.db.delete(channelId)
  },
})

export const setLastChannel = mutation({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const existing = await ctx.db
      .query('userPrefs')
      .withIndex('by_key', (q) => q.eq('key', 'lastChannelId'))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, { value: channelId, updatedAt: Date.now() })
    } else {
      await ctx.db.insert('userPrefs', { key: 'lastChannelId', value: channelId, updatedAt: Date.now() })
    }
  },
})

export const getLastChannel = query({
  args: {},
  handler: async (ctx): Promise<Id<'channels'> | null> => {
    await requireOwner(ctx)
    const pref = await ctx.db
      .query('userPrefs')
      .withIndex('by_key', (q) => q.eq('key', 'lastChannelId'))
      .unique()
    if (!pref) return null
    const channel = await ctx.db.get(pref.value as Id<'channels'>)
    return channel?._id ?? null
  },
})
