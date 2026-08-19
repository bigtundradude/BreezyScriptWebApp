import { v } from 'convex/values'
import { action, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { requireOwner } from './lib/owner'
import { NO_DASH_RULE, runChat, stripDashes } from './llm'

// Target audience (owner spec 2026-08-18): one description per channel of who
// the viewer is, the problem they have, and the creator's framework for
// solving it. Typed or pasted directly, or composed by the AI walkthrough from
// the creator's interview answers; the description stays editable either way.

const interviewEntry = v.object({ question: v.string(), answer: v.string() })

export const get = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    return await ctx.db
      .query('bankAudiences')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .unique()
  },
})

export const save = mutation({
  args: {
    channelId: v.id('channels'),
    description: v.string(),
    interview: v.optional(v.array(interviewEntry)),
  },
  handler: async (ctx, { channelId, description, interview }) => {
    await requireOwner(ctx)
    const existing = await ctx.db
      .query('bankAudiences')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .unique()
    const fields = {
      description,
      ...(interview !== undefined ? { interview } : {}),
      updatedAt: Date.now(),
    }
    if (existing) {
      await ctx.db.patch(existing._id, fields)
      return existing._id
    }
    return await ctx.db.insert('bankAudiences', { channelId, ...fields })
  },
})

// Compose an audience description from the walkthrough answers. Returns
// failures as data so the client shows the message alone.
export const compose = action({
  args: { interview: v.array(interviewEntry) },
  handler: async (ctx, { interview }): Promise<{ text?: string; error?: string }> => {
    try {
      await ctx.runQuery(internal.aiSettings.assertOwner, {})
      const answered = interview.filter((entry) => entry.answer.trim())
      if (answered.length === 0) {
        throw new Error('Answer at least one question first.')
      }
      const resolved = await ctx.runQuery(internal.aiSettings.resolve, { task: 'simple' })

      const transcript = answered
        .map((entry) => `Q: ${entry.question}\nA: ${entry.answer.trim()}`)
        .join('\n\n')

      const result = await runChat(
        resolved,
        [
          {
            role: 'system',
            content:
              'You are a positioning strategist for YouTube creators. From a creator interview you write a tight target audience description that guides every script the creator writes. Use only what the creator said, never invent details they did not give. ' +
              NO_DASH_RULE,
          },
          {
            role: 'user',
            content:
              `CREATOR INTERVIEW\n\n${transcript}\n\n` +
              'Write the target audience description in three short plain-text paragraphs: first who the viewer is (their situation, what they know, what they believe), second the problem they have (what it feels like, what they have tried, what it costs them), third the creator\'s framework for solving it (the approach and why it works for this viewer). ' +
              'Write in plain prose, no headings or bullets, under 250 words. No preamble, output the description only.',
          },
        ],
        { maxTokens: 2000 },
      )

      const text = stripDashes(result.text).trim()
      if (!text) throw new Error('The model returned nothing. Try again.')
      return { text }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Composition failed. Try again.'
      const cleaned = raw.replace(/^.*Uncaught Error:\s*/s, '').replace(/\s+at handler.*$/s, '')
      return { error: cleaned.trim() || 'Composition failed. Try again.' }
    }
  },
})
