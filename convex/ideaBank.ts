import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'

// Idea Bank — a standalone vault of video ideas, fully separate from Scripts
// Pro's `ideas` backlog (its own table, functions, and UI).

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

function cleanPotentialTitles(potentialTitles: string[]) {
  return potentialTitles
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_POTENTIAL_TITLES)
}

function clampRating(rating: number) {
  return Math.min(5, Math.max(0, Math.round(rating)))
}

function toListItem(idea: Doc<'bankIdeas'>) {
  return {
    _id: idea._id,
    title: idea.title,
    rating: idea.rating,
    status: idea.status,
    snippet: idea.description.slice(0, SNIPPET_LEN),
    potentialTitleCount: idea.potentialTitles.length,
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
    potentialTitles: v.array(v.string()),
    rating: v.number(),
    status: bankIdeaStatus,
  },
  handler: async (ctx, { channelId, title, description, potentialTitles, rating, status }) => {
    await requireOwner(ctx)
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle) throw new Error('Give the idea a title.')
    if (!trimmedDescription) throw new Error('Describe the idea.')
    const titles = cleanPotentialTitles(potentialTitles)
    return await ctx.db.insert('bankIdeas', {
      channelId,
      title: trimmedTitle,
      description: trimmedDescription,
      potentialTitles: titles,
      rating: clampRating(rating),
      status,
      searchText: buildSearchText(trimmedTitle, trimmedDescription, titles),
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    title: v.string(),
    description: v.string(),
    potentialTitles: v.array(v.string()),
    rating: v.number(),
    status: bankIdeaStatus,
  },
  handler: async (ctx, { channelId, ideaId, title, description, potentialTitles, rating, status }) => {
    await requireOwner(ctx)
    await getOwnedIdea(ctx, channelId, ideaId)
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle) throw new Error('Give the idea a title.')
    if (!trimmedDescription) throw new Error('Describe the idea.')
    const titles = cleanPotentialTitles(potentialTitles)
    await ctx.db.patch(ideaId, {
      title: trimmedTitle,
      description: trimmedDescription,
      potentialTitles: titles,
      rating: clampRating(rating),
      status,
      searchText: buildSearchText(trimmedTitle, trimmedDescription, titles),
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    await getOwnedIdea(ctx, channelId, ideaId)
    await ctx.db.delete(ideaId)
  },
})
