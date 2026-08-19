import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'

// Idea Bank — the stepped idea→production workflow (docs/idea-workflow-plan.md).
// Fully separate from Scripts Pro (own tables, functions, and UI).

// Canonical workflow order. A step is unlocked iff every earlier id is in
// readySteps; readiness is validated here, never by the client.
export const STEP_ORDER = [
  'idea',
  'titles',
  'thumbnails',
  'questions',
  'research',
  'draft',
  'refine',
  'record',
  'metadata',
] as const
type StepId = (typeof STEP_ORDER)[number]

const bankIdeaStatus = v.union(
  v.literal('new'),
  v.literal('ready'),
  v.literal('done'),
  v.literal('do_again'),
  v.literal('wont_do'),
)

const SNIPPET_LEN = 200
const LIST_LIMIT = 200
const MAX_POTENTIAL_TITLES = 3

function buildSearchText(title: string, description: string, potentialTitles: string[]) {
  return `${title}\n${potentialTitles.join('\n')}\n${description}`
}

// Drops empty slots while tracking where the primary selection lands in the
// compacted array. primaryIndex is the caller's slot index; -1 = none.
function cleanPotentialTitles(potentialTitles: string[], primaryIndex: number) {
  const titles: string[] = []
  let primary: number | undefined
  potentialTitles.forEach((t, i) => {
    const trimmed = t.trim()
    if (!trimmed || titles.length >= MAX_POTENTIAL_TITLES) return
    if (i === primaryIndex) primary = titles.length
    titles.push(trimmed)
  })
  return { titles, primary }
}

function clampRating(rating: number) {
  return Math.min(5, Math.max(0, Math.round(rating)))
}

// Human-readable unmet requirements for marking a step ready; [] = qualified.
function stepMissing(idea: Doc<'bankIdeas'>, step: StepId): string[] {
  switch (step) {
    case 'idea': {
      const missing: string[] = []
      if (!idea.title.trim()) missing.push('a title')
      if (!idea.description.trim()) missing.push('a description')
      if (idea.rating < 1) missing.push('a rating')
      return missing
    }
    case 'titles': {
      const missing: string[] = []
      if (idea.potentialTitles.length < MAX_POTENTIAL_TITLES) missing.push('three titles')
      if (idea.primaryTitleIndex === undefined) missing.push('a primary title')
      return missing
    }
    case 'thumbnails': {
      const filled = (idea.thumbnailSlots ?? []).some((slot) => slot !== null)
      return filled ? [] : ['at least one thumbnail']
    }
    case 'questions': {
      const pasted = Boolean(idea.questionsTranscript?.trim())
      return pasted ? [] : ['paste the transcript of your recorded answers']
    }
    // Research has no hard requirements — every material is optional; marking
    // ready is the owner's declaration that the drafter has what it needs.
    case 'research':
      return []
    case 'draft':
      return idea.draftSentRef ? [] : ['send a draft to refinement']
    // Refine readiness is validated in bankDrafts.markRefineReady (needs the
    // refinement table); blanking the current script demotes it there too.
    case 'refine':
      return []
    // Record and metadata are review steps: marking ready is the owner's
    // declaration that the script was reviewed / the metadata was copied out.
    case 'record':
    case 'metadata':
      return []
    default:
      return ['this step is not built yet']
  }
}

// Cascade invalidation: readiness survives only as the longest prefix of
// STEP_ORDER that is both still marked and still qualified.
function recomputeReadySteps(idea: Doc<'bankIdeas'>): string[] {
  const marked = idea.readySteps ?? []
  const out: string[] = []
  for (const step of STEP_ORDER) {
    if (!marked.includes(step)) break
    if (stepMissing(idea, step).length > 0) break
    out.push(step)
  }
  return out
}

async function reconcileReadySteps(ctx: MutationCtx, ideaId: Id<'bankIdeas'>) {
  const idea = await ctx.db.get(ideaId)
  if (!idea) return
  const next = recomputeReadySteps(idea)
  const current = idea.readySteps ?? []
  if (next.length !== current.length) await ctx.db.patch(ideaId, { readySteps: next })
}

function toListItem(idea: Doc<'bankIdeas'>) {
  return {
    _id: idea._id,
    title: idea.title,
    rating: idea.rating,
    status: idea.status,
    snippet: idea.description.slice(0, SNIPPET_LEN),
    potentialTitleCount: idea.potentialTitles.length,
    readyCount: (idea.readySteps ?? []).length,
    updatedAt: idea.updatedAt,
  }
}

async function getOwnedIdea(ctx: QueryCtx, channelId: Id<'channels'>, ideaId: Id<'bankIdeas'>) {
  const idea = await ctx.db.get(ideaId)
  if (!idea || idea.channelId !== channelId) throw new Error('Idea not found')
  return idea
}

export const list = query({
  args: { channelId: v.id('channels'), search: v.optional(v.string()) },
  handler: async (ctx, { channelId, search }) => {
    await requireOwner(ctx)
    const term = search?.trim() ?? ''
    if (term) {
      // Explicit-submit search (decision #9): word/prefix matching, relevance order.
      const results = await ctx.db
        .query('bankIdeas')
        .withSearchIndex('search', (q) => q.search('searchText', term).eq('channelId', channelId))
        .take(LIST_LIMIT)
      return results.map(toListItem)
    }
    const ideas = await ctx.db
      .query('bankIdeas')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .order('desc')
      .take(LIST_LIMIT)
    return ideas.map(toListItem)
  },
})

export const get = query({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) return null
    return idea
  },
})

export const create = mutation({
  args: {
    channelId: v.id('channels'),
    title: v.string(),
    description: v.string(),
    rating: v.number(),
    status: bankIdeaStatus,
  },
  handler: async (ctx, { channelId, title, description, rating, status }) => {
    await requireOwner(ctx)
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle) throw new Error('Give the idea a title.')
    if (!trimmedDescription) throw new Error('Describe the idea.')
    return await ctx.db.insert('bankIdeas', {
      channelId,
      title: trimmedTitle,
      description: trimmedDescription,
      potentialTitles: [],
      rating: clampRating(rating),
      status,
      readySteps: [],
      searchText: buildSearchText(trimmedTitle, trimmedDescription, []),
      updatedAt: Date.now(),
    })
  },
})

// Step 1 fields. Potential titles are owned by the titles step (updateTitles).
export const updateIdea = mutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    title: v.string(),
    description: v.string(),
    rating: v.number(),
    status: bankIdeaStatus,
  },
  handler: async (ctx, { channelId, ideaId, title, description, rating, status }) => {
    await requireOwner(ctx)
    const idea = await getOwnedIdea(ctx, channelId, ideaId)
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle) throw new Error('Give the idea a title.')
    if (!trimmedDescription) throw new Error('Describe the idea.')
    await ctx.db.patch(ideaId, {
      title: trimmedTitle,
      description: trimmedDescription,
      rating: clampRating(rating),
      status,
      searchText: buildSearchText(trimmedTitle, trimmedDescription, idea.potentialTitles),
      updatedAt: Date.now(),
    })
    await reconcileReadySteps(ctx, ideaId)
  },
})

// Step 2 fields (potential titles + primary selection).
export const updateTitles = mutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    potentialTitles: v.array(v.string()),
    primaryIndex: v.number(), // slot index into potentialTitles; -1 = none
  },
  handler: async (ctx, { channelId, ideaId, potentialTitles, primaryIndex }) => {
    await requireOwner(ctx)
    const idea = await getOwnedIdea(ctx, channelId, ideaId)
    const { titles, primary } = cleanPotentialTitles(potentialTitles, primaryIndex)
    await ctx.db.patch(ideaId, {
      potentialTitles: titles,
      primaryTitleIndex: primary,
      searchText: buildSearchText(idea.title, idea.description, titles),
      updatedAt: Date.now(),
    })
    await reconcileReadySteps(ctx, ideaId)
  },
})

// Leading-questions step field: the pasted transcript of the recorded answers.
export const updateQuestionsTranscript = mutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    transcript: v.string(),
  },
  handler: async (ctx, { channelId, ideaId, transcript }) => {
    await requireOwner(ctx)
    await getOwnedIdea(ctx, channelId, ideaId)
    await ctx.db.patch(ideaId, { questionsTranscript: transcript, updatedAt: Date.now() })
    await reconcileReadySteps(ctx, ideaId)
  },
})

// Research step fields (plan §5d). Notes are references into the Second
// Brain — the notes themselves are never copied or modified.
export const updateResearch = mutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    researchNoteIds: v.array(v.id('notes')),
    researchText: v.string(),
    midwayCta: v.string(),
    outroCta: v.string(),
    includeDisclaimer: v.boolean(),
  },
  handler: async (ctx, { channelId, ideaId, researchNoteIds, researchText, midwayCta, outroCta, includeDisclaimer }) => {
    await requireOwner(ctx)
    await getOwnedIdea(ctx, channelId, ideaId)
    await ctx.db.patch(ideaId, {
      researchNoteIds,
      researchText,
      midwayCta: midwayCta.trim(),
      outroCta: outroCta.trim(),
      includeDisclaimer,
      updatedAt: Date.now(),
    })
    await reconcileReadySteps(ctx, ideaId)
  },
})

// Titles + kinds for the research step's attached-notes list. Notes deleted
// from the Second Brain after attachment surface as `deleted`.
export const researchNotes = query({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) return []
    return await Promise.all(
      (idea.researchNoteIds ?? []).map(async (noteId) => {
        const note = await ctx.db.get(noteId)
        return note && note.channelId === channelId
          ? { _id: noteId, title: note.title, kind: note.kind, deleted: false }
          : { _id: noteId, title: 'Deleted note', kind: 'note', deleted: true }
      }),
    )
  },
})

export const markStepReady = mutation({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas'), step: v.string() },
  handler: async (ctx, { channelId, ideaId, step }) => {
    await requireOwner(ctx)
    const idea = await getOwnedIdea(ctx, channelId, ideaId)
    const stepId = STEP_ORDER.find((s) => s === step)
    if (!stepId) throw new Error('Unknown step')
    const ready = idea.readySteps ?? []
    if (ready.includes(stepId)) return
    const index = STEP_ORDER.indexOf(stepId)
    for (const prior of STEP_ORDER.slice(0, index)) {
      if (!ready.includes(prior)) throw new Error('Earlier steps must be marked ready first.')
    }
    const missing = stepMissing(idea, stepId)
    if (missing.length > 0) throw new Error(`Still needed: ${missing.join(', ')}.`)
    await ctx.db.patch(ideaId, { readySteps: [...ready, stepId], updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    await getOwnedIdea(ctx, channelId, ideaId)
    // Fan out over the idea's workflow children.
    const candidates = await ctx.db
      .query('bankTitleCandidates')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    for (const candidate of candidates) await ctx.db.delete(candidate._id)
    const questions = await ctx.db
      .query('bankQuestions')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    for (const question of questions) await ctx.db.delete(question._id)
    for (const table of ['bankDrafts', 'bankRefinementDrafts'] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
        .collect()
      for (const row of rows) await ctx.db.delete(row._id)
    }
    const thumbnails = await ctx.db
      .query('bankThumbnails')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    for (const thumbnail of thumbnails) {
      await ctx.storage.delete(thumbnail.storageId)
      await ctx.db.delete(thumbnail._id)
    }
    await ctx.db.delete(ideaId)
  },
})
