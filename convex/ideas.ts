import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireOwner } from './lib/owner'

const ideaStatus = v.union(
  v.literal('new'),
  v.literal('in_production'),
  v.literal('finished'),
  v.literal('rejected'),
)

export const list = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    return await ctx.db
      .query('ideas')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .order('desc')
      .collect()
  },
})

export const create = mutation({
  args: { channelId: v.id('channels'), title: v.string(), angle: v.optional(v.string()) },
  handler: async (ctx, { channelId, title, angle }) => {
    await requireOwner(ctx)
    const trimmed = title.trim()
    if (!trimmed) throw new Error('Give the idea a title.')
    return await ctx.db.insert('ideas', {
      channelId,
      title: trimmed,
      angle: angle?.trim() ?? '',
      sourceRef: '',
      status: 'new',
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('ideas'),
    title: v.optional(v.string()),
    angle: v.optional(v.string()),
    status: v.optional(ideaStatus),
  },
  handler: async (ctx, { channelId, ideaId, title, angle, status }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) throw new Error('Idea not found')
    await ctx.db.patch(ideaId, {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(angle !== undefined ? { angle } : {}),
      ...(status !== undefined ? { status } : {}),
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { channelId: v.id('channels'), ideaId: v.id('ideas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) throw new Error('Idea not found')
    // Explicit SET NULL semantics: unlink any production pointing at this idea.
    const productions = await ctx.db
      .query('productions')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    for (const prod of productions) {
      if (prod.ideaId === ideaId) await ctx.db.patch(prod._id, { ideaId: undefined })
    }
    await ctx.db.delete(ideaId)
  },
})

// Apply path for the concept megaprompt: inserts accepted concepts as ideas.
export const applyConcepts = mutation({
  args: {
    channelId: v.id('channels'),
    concepts: v.array(v.object({ title: v.string(), angle: v.string() })),
  },
  handler: async (ctx, { channelId, concepts }) => {
    await requireOwner(ctx)
    const existing = await ctx.db
      .query('ideas')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    const seen = new Set(existing.map((i) => i.title.trim().toLowerCase()))
    let inserted = 0
    for (const concept of concepts) {
      const key = concept.title.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      await ctx.db.insert('ideas', {
        channelId,
        title: concept.title.trim(),
        angle: concept.angle,
        sourceRef: 'concept',
        status: 'new',
        updatedAt: Date.now(),
      })
      inserted++
    }
    return { inserted, rejected: concepts.length - inserted }
  },
})
