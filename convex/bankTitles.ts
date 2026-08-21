import { v } from 'convex/values'
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { requireOwner } from './lib/owner'
import { BUILTIN_TITLE_SHAPES } from './lib/builtinTitleShapes'
import { NO_DASH_RULE, extractJsonArray, runChat, stripDashes } from './llm'

// Title generation for the Scripts Pro titles step (docs/idea-workflow-plan.md §4):
// every title template of the channel is instantiated into a concrete title for
// the idea via the configured simple-tasks model.

export const listCandidates = query({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) return []
    return await ctx.db
      .query('bankTitleCandidates')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
  },
})

export const toggleHeart = mutation({
  args: { channelId: v.id('channels'), candidateId: v.id('bankTitleCandidates') },
  handler: async (ctx, { channelId, candidateId }) => {
    await requireOwner(ctx)
    const candidate = await ctx.db.get(candidateId)
    if (!candidate || candidate.channelId !== channelId) throw new Error('Candidate not found')
    await ctx.db.patch(candidateId, { hearted: !candidate.hearted })
  },
})

export const generationContext = internalQuery({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) throw new Error('Idea not found')
    const shapes = await ctx.db
      .query('titleShapes')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    const templates = await ctx.db
      .query('titleTemplates')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    // The built-in shape library first (Scripts Pro defaults, always present),
    // then the channel's custom templates.
    const builtin = BUILTIN_TITLE_SHAPES.flatMap((shape) =>
      shape.templates.map((template, index) => ({
        id: `${shape.id}#${index}`,
        pattern: template.text,
        exampleTitle: template.example,
        whyItWorks: template.why,
        shapeName: shape.name,
        mechanism: shape.mechanism,
      })),
    )
    const custom = templates.map((t) => {
      const shape = shapes.find((s) => s._id === t.shapeId)
      return {
        id: t._id as string,
        pattern: t.pattern,
        exampleTitle: t.exampleTitle,
        whyItWorks: t.whyItWorks,
        shapeName: shape?.name ?? 'Unsorted',
        mechanism: shape?.mechanism ?? '',
      }
    })
    return {
      idea: { title: idea.title, description: idea.description },
      templates: [...builtin, ...custom],
    }
  },
})

export const insertBatch = internalMutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    items: v.array(v.object({ shapeName: v.string(), templateRef: v.string(), text: v.string() })),
  },
  handler: async (ctx, { channelId, ideaId, items }) => {
    const existing = await ctx.db
      .query('bankTitleCandidates')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    // Hearts survive regeneration; unhearted old candidates are cleared.
    let batch = 0
    for (const candidate of existing) {
      batch = Math.max(batch, candidate.batch)
      if (!candidate.hearted) await ctx.db.delete(candidate._id)
    }
    const kept = new Set(
      existing.filter((c) => c.hearted).map((c) => c.text.trim().toLowerCase()),
    )
    let inserted = 0
    for (const item of items) {
      const text = item.text.trim()
      if (!text || kept.has(text.toLowerCase())) continue
      await ctx.db.insert('bankTitleCandidates', {
        channelId,
        ideaId,
        shapeName: item.shapeName,
        templateRef: item.templateRef,
        text,
        hearted: false,
        batch: batch + 1,
      })
      inserted++
    }
    return inserted
  },
})

// Returns failures as data (not throws) so the client shows the message alone,
// without Convex's dev-mode server-error wrapper.
export const generate = action({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }): Promise<{ inserted: number; error?: string }> => {
    try {
    const context = await ctx.runQuery(internal.bankTitles.generationContext, { channelId, ideaId })
    if (context.templates.length === 0) {
      throw new Error('No title templates yet — add some in Settings → Title shapes first.')
    }
    const resolved = await ctx.runQuery(internal.aiSettings.resolve, { task: 'simple' })

    const templateLines = context.templates
      .map(
        (t, i) =>
          `${i + 1}. [${t.shapeName}] Pattern: ${t.pattern}` +
          (t.exampleTitle ? ` | Example: ${t.exampleTitle}` : '') +
          (t.whyItWorks ? ` | Why it works: ${t.whyItWorks}` : ''),
      )
      .join('\n')

    const result = await runChat(
      resolved,
      [
        {
          role: 'system',
          content:
            'You are a YouTube title strategist. You turn title templates into concrete, honest, high-curiosity titles for a specific video idea. Titles must be under 70 characters, specific to the idea, and never promise what the idea cannot deliver. ' +
            NO_DASH_RULE,
        },
        {
          role: 'user',
          content:
            `VIDEO IDEA\nTitle: ${context.idea.title}\nDescription: ${context.idea.description}\n\n` +
            `TITLE TEMPLATES\n${templateLines}\n\n` +
            'Write exactly one title per template, adapting each pattern to this idea. ' +
            'Return ONLY a JSON array, no other text: [{"i": 1, "title": "..."}, ...] ' +
            'where "i" is the template number.',
        },
      ],
      // ~120 templates → one title each; give the reply plenty of room.
      { maxTokens: 16000 },
    )

    const parsed = extractJsonArray(result.text, 'bankTitles.generate')
    if (!parsed) {
      throw new Error('The model reply had no usable JSON — try Generate again.')
    }
    const items: Array<{ shapeName: string; templateRef: string; text: string }> = []
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue
      const index = Number((entry as { i?: unknown }).i)
      const title = (entry as { title?: unknown }).title
      const template = context.templates[index - 1]
      if (!template || typeof title !== 'string' || !title.trim()) continue
      items.push({ shapeName: template.shapeName, templateRef: template.id, text: stripDashes(title) })
    }
    if (items.length === 0) {
      throw new Error('The model reply had no usable titles — try Generate again.')
    }
    const inserted: number = await ctx.runMutation(internal.bankTitles.insertBatch, {
      channelId,
      ideaId,
      items,
    })
    return { inserted }
    } catch (e) {
      // Strip Convex's "Uncaught Error:" prefix when the message came from a
      // nested runQuery throw (e.g. aiSettings.resolve).
      const raw = e instanceof Error ? e.message : 'Generation failed — try again.'
      const cleaned = raw.replace(/^.*Uncaught Error:\s*/s, '').replace(/\s+at handler.*$/s, '')
      return { inserted: 0, error: cleaned.trim() || 'Generation failed — try again.' }
    }
  },
})
