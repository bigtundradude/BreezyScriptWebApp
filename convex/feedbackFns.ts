import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'

async function getOwnedFeedback(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<'channels'>,
  feedbackId: Id<'feedback'>,
) {
  const entry = await ctx.db.get(feedbackId)
  if (!entry || entry.channelId !== channelId) throw new Error('Feedback entry not found')
  return entry
}

export const list = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const entries = await ctx.db
      .query('feedback')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .order('desc')
      .collect()
    return entries
  },
})

export const create = mutation({
  args: { channelId: v.id('channels'), title: v.string() },
  handler: async (ctx, { channelId, title }) => {
    await requireOwner(ctx)
    return await ctx.db.insert('feedback', {
      channelId,
      title: title.trim() || 'Untitled video',
      metrics: '',
      sourceInput: '',
      result: undefined,
      resultMarkdown: '',
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    channelId: v.id('channels'),
    feedbackId: v.id('feedback'),
    title: v.optional(v.string()),
    metrics: v.optional(v.string()),
    sourceInput: v.optional(v.string()),
  },
  handler: async (ctx, { channelId, feedbackId, ...fields }) => {
    await requireOwner(ctx)
    await getOwnedFeedback(ctx, channelId, feedbackId)
    const patch = Object.fromEntries(Object.entries(fields).filter(([, val]) => val !== undefined))
    await ctx.db.patch(feedbackId, { ...patch, updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { channelId: v.id('channels'), feedbackId: v.id('feedback') },
  handler: async (ctx, { channelId, feedbackId }) => {
    await requireOwner(ctx)
    await getOwnedFeedback(ctx, channelId, feedbackId)
    await ctx.db.delete(feedbackId)
  },
})

export const applyResult = mutation({
  args: {
    channelId: v.id('channels'),
    feedbackId: v.id('feedback'),
    result: v.any(),
    resultMarkdown: v.string(),
  },
  handler: async (ctx, { channelId, feedbackId, result, resultMarkdown }) => {
    await requireOwner(ctx)
    await getOwnedFeedback(ctx, channelId, feedbackId)
    await ctx.db.patch(feedbackId, { result, resultMarkdown, updatedAt: Date.now() })
  },
})

// Approve-applier 1 (desktop parity): append accepted audience updates to the
// DEFAULT audience asset's prompt snippet, then stamp them applied on the report.
export const applyAudienceUpdates = mutation({
  args: {
    channelId: v.id('channels'),
    feedbackId: v.id('feedback'),
    updates: v.array(v.string()),
  },
  handler: async (ctx, { channelId, feedbackId, updates }) => {
    await requireOwner(ctx)
    const entry = await getOwnedFeedback(ctx, channelId, feedbackId)
    const accepted = updates.map((u) => u.trim()).filter(Boolean)
    if (accepted.length === 0) return

    const audiences = await ctx.db
      .query('foundationAssets')
      .withIndex('by_channel_type', (q) => q.eq('channelId', channelId).eq('type', 'audience'))
      .collect()
    const target =
      audiences.find((a) => a.isDefault && a.promptSnippet.trim()) ??
      audiences
        .filter((a) => a.promptSnippet.trim())
        .sort((a, b) => b.updatedAt - a.updatedAt)[0]
    if (!target) throw new Error('No audience profile with a prompt snippet to update.')

    const addition = accepted.map((u) => `- ${u}`).join('\n')
    await ctx.db.patch(target._id, {
      promptSnippet: `${target.promptSnippet.trimEnd()}\n\nRecent audience signals:\n${addition}`,
      updatedAt: Date.now(),
    })

    const result = (entry.result ?? {}) as Record<string, unknown>
    const applied = Array.isArray(result.applied_audience_updates)
      ? (result.applied_audience_updates as string[])
      : []
    await ctx.db.patch(feedbackId, {
      result: { ...result, applied_audience_updates: [...applied, ...accepted] },
      updatedAt: Date.now(),
    })
  },
})

// Approve-applier 2: ±1 sortBoost on templates matched by pattern text.
export const applyReranks = mutation({
  args: {
    channelId: v.id('channels'),
    feedbackId: v.id('feedback'),
    reranks: v.array(v.object({ template: v.string(), direction: v.string() })),
  },
  handler: async (ctx, { channelId, feedbackId, reranks }) => {
    await requireOwner(ctx)
    const entry = await getOwnedFeedback(ctx, channelId, feedbackId)
    const templates = await ctx.db
      .query('titleTemplates')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    let applied = 0
    for (const rerank of reranks) {
      const match = templates.find(
        (t) => t.pattern.trim().toLowerCase() === rerank.template.trim().toLowerCase(),
      )
      if (!match) continue
      const delta = rerank.direction === 'down' ? -1 : 1
      await ctx.db.patch(match._id, { sortBoost: match.sortBoost + delta, updatedAt: Date.now() })
      applied++
    }
    const result = (entry.result ?? {}) as Record<string, unknown>
    await ctx.db.patch(feedbackId, {
      result: { ...result, applied_reranks: true },
      updatedAt: Date.now(),
    })
    return { applied }
  },
})
