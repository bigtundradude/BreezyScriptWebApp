import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireOwner } from './lib/owner'

// Channel-scoped reusable snippets (docs/idea-workflow-plan.md §5d), managed
// in Settings → Script snippets. The research step's disclaimer toggle and the
// future Script Drafter read the 'disclaimer' snippet from here.

export const get = query({
  args: { channelId: v.id('channels'), key: v.string() },
  handler: async (ctx, { channelId, key }) => {
    await requireOwner(ctx)
    const snippet = await ctx.db
      .query('bankSnippets')
      .withIndex('by_channel_key', (q) => q.eq('channelId', channelId).eq('key', key))
      .unique()
    return snippet?.text ?? ''
  },
})

export const set = mutation({
  args: { channelId: v.id('channels'), key: v.string(), text: v.string() },
  handler: async (ctx, { channelId, key, text }) => {
    await requireOwner(ctx)
    const existing = await ctx.db
      .query('bankSnippets')
      .withIndex('by_channel_key', (q) => q.eq('channelId', channelId).eq('key', key))
      .unique()
    if (existing) await ctx.db.patch(existing._id, { text, updatedAt: Date.now() })
    else await ctx.db.insert('bankSnippets', { channelId, key, text, updatedAt: Date.now() })
  },
})
