import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'

// Reading pace (words per minute) per channel, stored in userPrefs. Sizes
// script drafts to how fast the creator actually talks (Settings → Reading
// pace measures it with a timed sample read).

const DEFAULT_WPM = 140

async function readWpm(ctx: QueryCtx, channelId: Id<'channels'>) {
  const pref = await ctx.db
    .query('userPrefs')
    .withIndex('by_key', (q) => q.eq('key', `wordsPerMinute:${channelId}`))
    .unique()
  const value = Number(pref?.value)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_WPM
}

export const getWordsPerMinute = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    return await readWpm(ctx, channelId)
  },
})

export const setWordsPerMinute = mutation({
  args: { channelId: v.id('channels'), wordsPerMinute: v.number() },
  handler: async (ctx, { channelId, wordsPerMinute }) => {
    await requireOwner(ctx)
    const value = Math.max(60, Math.min(260, Math.round(wordsPerMinute)))
    const key = `wordsPerMinute:${channelId}`
    const existing = await ctx.db
      .query('userPrefs')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique()
    if (existing) await ctx.db.patch(existing._id, { value, updatedAt: Date.now() })
    else await ctx.db.insert('userPrefs', { key, value, updatedAt: Date.now() })
  },
})
