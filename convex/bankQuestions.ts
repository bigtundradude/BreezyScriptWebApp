import { v } from 'convex/values'
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { requireOwner } from './lib/owner'
import { NO_DASH_RULE, runChat, stripDashes } from './llm'

// Leading Questions step (docs/idea-workflow-plan.md §5c): two required
// questions plus 25 generated, topic-specific ones that guide the user's
// freeflow audio recording. Selected questions survive regeneration.

export const REQUIRED_QUESTIONS = [
  {
    text:
      'Who or what are you against here? Which people, habits, or popular ideas around this topic are you taking a stand against, and why?',
    category: 'Taking a side',
  },
  {
    text:
      "If you weren't afraid of what anyone thinks: what would you honestly say about this topic? What advice would you give, or what do you want people to finally understand?",
    category: 'Taking a side',
  },
]

// Fixed category set so grouping stays stable across regenerations.
const CATEGORIES = [
  'Origin story',
  'Problems',
  "What doesn't work",
  'Your process',
  'Mistakes & costs',
  'Taking a side',
  'Proof & numbers',
  'Advice & transformation',
  'Closer',
]

export const list = query({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) return []
    const questions = await ctx.db
      .query('bankQuestions')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    return questions.sort((a, b) => a.order - b.order)
  },
})

// Idempotent: creates the two required questions the first time the step opens.
export const ensureRequired = mutation({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) throw new Error('Idea not found')
    const existing = await ctx.db
      .query('bankQuestions')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    if (existing.some((q) => q.source === 'required')) return
    for (const [index, question] of REQUIRED_QUESTIONS.entries()) {
      await ctx.db.insert('bankQuestions', {
        channelId,
        ideaId,
        text: question.text,
        category: question.category,
        source: 'required',
        selected: true, // must-answer by default; still uncheckable
        order: index,
        batch: 0,
      })
    }
  },
})

export const toggleSelected = mutation({
  args: { channelId: v.id('channels'), questionId: v.id('bankQuestions') },
  handler: async (ctx, { channelId, questionId }) => {
    await requireOwner(ctx)
    const question = await ctx.db.get(questionId)
    if (!question || question.channelId !== channelId) throw new Error('Question not found')
    await ctx.db.patch(questionId, { selected: !question.selected })
  },
})

export const generationContext = internalQuery({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) throw new Error('Idea not found')
    return {
      title: idea.title,
      description: idea.description,
      potentialTitles: idea.potentialTitles,
      primaryTitle:
        idea.primaryTitleIndex !== undefined
          ? (idea.potentialTitles[idea.primaryTitleIndex] ?? '')
          : '',
    }
  },
})

export const insertBatch = internalMutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    items: v.array(v.object({ category: v.string(), text: v.string() })),
  },
  handler: async (ctx, { channelId, ideaId, items }) => {
    const existing = await ctx.db
      .query('bankQuestions')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    // Required questions and anything the user selected survive; unselected
    // generated questions from earlier batches are replaced.
    let batch = 0
    let order = 0
    for (const question of existing) {
      batch = Math.max(batch, question.batch)
      order = Math.max(order, question.order)
      if (question.source === 'generated' && !question.selected) await ctx.db.delete(question._id)
    }
    const kept = new Set(
      existing
        .filter((q) => q.source === 'required' || q.selected)
        .map((q) => q.text.trim().toLowerCase()),
    )
    let inserted = 0
    for (const item of items) {
      const text = item.text.trim()
      if (!text || kept.has(text.toLowerCase())) continue
      await ctx.db.insert('bankQuestions', {
        channelId,
        ideaId,
        text,
        category: CATEGORIES.includes(item.category) ? item.category : 'Your process',
        source: 'generated',
        selected: false,
        order: ++order,
        batch: batch + 1,
      })
      inserted++
    }
    return inserted
  },
})

// ——— The reusable leading-questions prompt (plan §5c) ———
// Designed to transfer across any topic: it encodes interview craft, not the
// subject matter. Kept as one function so future steps can reuse/extend it.
export function composeQuestionsPrompt(idea: {
  title: string
  description: string
  potentialTitles: string[]
  primaryTitle: string
}) {
  const system =
    'You are a world-class interviewer and story extractor for a solo video creator. ' +
    'Your questions pull out the creator’s OWN perspective, lived experience, opinions, process, and stories: ' +
    'material no one else could provide and no search engine could answer. ' +
    'You never ask questions whose answers could be researched; you only ask what the creator alone knows. ' +
    NO_DASH_RULE

  const user =
    `THE VIDEO IDEA\n` +
    `Working title: ${idea.title}\n` +
    `Description: ${idea.description}\n` +
    (idea.primaryTitle ? `Primary video title: ${idea.primaryTitle}\n` : '') +
    (idea.potentialTitles.length
      ? `Other candidate titles: ${idea.potentialTitles.join(' | ')}\n`
      : '') +
    `\nTASK\n` +
    `Write exactly 25 interview questions that will lead the creator into detailed, informative answers that ` +
    `comprehensively bring out their knowledge, experiences, and point of view on this exact topic.\n` +
    `\nRULES\n` +
    `- Every question must be specific to THIS topic, never generic interview filler.\n` +
    `- Only ask what the creator alone can answer: their experiences, opinions, process, numbers, stories.\n` +
    `- Open-ended only (how / why / what / walk me through). Never yes/no. One thing per question.\n` +
    `- Anchor questions in specific moments where possible ("describe the exact moment…", "walk me through the last time…"). Moments produce stories, abstractions produce platitudes.\n` +
    `- Dig into the audience's PROBLEMS around this topic: what they struggle with, what they typically try that DOESN'T work and why, and how the creator would actually solve it.\n` +
    `- Include at least one steel-man question: the strongest argument against the creator's position and why it doesn't change their mind.\n` +
    `- Fish for receipts: concrete numbers, costs, timelines, before/afters the creator can share.\n` +
    `- Ask what mistakes cost them (time, money, embarrassment). Stakes come from cost.\n` +
    `- Order questions from easy/warm-up to deep/vulnerable.\n` +
    `- End with exactly one Closer: a question inviting anything important that wasn't asked.\n` +
    `- Do NOT duplicate these two questions (they are already asked separately):\n` +
    REQUIRED_QUESTIONS.map((q) => `  • ${q.text}`).join('\n') +
    `\n\nCATEGORIES\n` +
    `Assign each question exactly one of: ${CATEGORIES.join(', ')}.\n` +
    `\nOUTPUT\n` +
    `Return ONLY a JSON array, no other text: [{"category": "...", "question": "..."}, ...] with exactly 25 entries.`

  return { system, user }
}

function extractJsonArray(raw: string): unknown[] | null {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end <= start) return null
  try {
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

// Returns failures as data (not throws) so the client shows the message alone.
export const generate = action({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }): Promise<{ inserted: number; error?: string }> => {
    try {
      const context = await ctx.runQuery(internal.bankQuestions.generationContext, {
        channelId,
        ideaId,
      })
      const resolved = await ctx.runQuery(internal.aiSettings.resolve, { task: 'simple' })
      const prompt = composeQuestionsPrompt(context)
      const result = await runChat(
        resolved,
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        { maxTokens: 6000 },
      )
      const parsed = extractJsonArray(result.text)
      if (!parsed) throw new Error('The model reply had no usable JSON — try Generate again.')
      const items: Array<{ category: string; text: string }> = []
      for (const entry of parsed) {
        if (typeof entry !== 'object' || entry === null) continue
        const question = (entry as { question?: unknown }).question
        const category = (entry as { category?: unknown }).category
        if (typeof question !== 'string' || !question.trim()) continue
        items.push({
          category: typeof category === 'string' ? category : '',
          text: stripDashes(question),
        })
      }
      if (items.length === 0) {
        throw new Error('The model reply had no usable questions — try Generate again.')
      }
      const inserted: number = await ctx.runMutation(internal.bankQuestions.insertBatch, {
        channelId,
        ideaId,
        items,
      })
      return { inserted }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Generation failed — try again.'
      const cleaned = raw.replace(/^.*Uncaught Error:\s*/s, '').replace(/\s+at handler.*$/s, '')
      return { inserted: 0, error: cleaned.trim() || 'Generation failed — try again.' }
    }
  },
})
