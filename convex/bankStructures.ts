import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireOwner } from './lib/owner'

// Custom video-structure blueprints (docs/idea-workflow-plan.md §5e), managed
// in Settings → Video structures. Built-ins live in convex/lib/defaultStructures.

export const list = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    return await ctx.db
      .query('bankStructures')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
  },
})

export const create = mutation({
  args: { channelId: v.id('channels'), name: v.string(), pattern: v.string() },
  handler: async (ctx, { channelId, name, pattern }) => {
    await requireOwner(ctx)
    if (!name.trim()) throw new Error('Give the structure a name.')
    if (!pattern.trim()) throw new Error('Describe the structure.')
    return await ctx.db.insert('bankStructures', {
      channelId,
      name: name.trim(),
      pattern: pattern.trim(),
      updatedAt: Date.now(),
    })
  },
})


export const remove = mutation({
  args: { channelId: v.id('channels'), structureId: v.id('bankStructures') },
  handler: async (ctx, { channelId, structureId }) => {
    await requireOwner(ctx)
    const structure = await ctx.db.get(structureId)
    if (!structure || structure.channelId !== channelId) throw new Error('Structure not found')
    await ctx.db.delete(structureId)
  },
})
