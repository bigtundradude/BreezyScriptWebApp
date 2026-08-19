import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'
import { interviewBlock } from './schema'

const format = v.union(v.literal('shorts'), v.literal('medium'), v.literal('long'), v.literal('podcast'))
const status = v.union(v.literal('building'), v.literal('ready'), v.literal('archived'))

const metadataShape = v.object({
  description: v.optional(
    v.object({ firstLine: v.string(), body: v.string(), notes: v.optional(v.string()) }),
  ),
  chapters: v.array(v.object({ timestamp: v.string(), title: v.string() })),
  tags: v.array(v.string()),
})

async function getOwnedProduction(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<'channels'>,
  productionId: Id<'productions'>,
) {
  const production = await ctx.db.get(productionId)
  if (!production || production.channelId !== channelId) throw new Error('Production not found')
  return production
}

export const list = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const productions = await ctx.db
      .query('productions')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    // updated_at DESC, desktop parity
    return productions.sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

export const get = query({
  args: { channelId: v.id('channels'), productionId: v.id('productions') },
  handler: async (ctx, { channelId, productionId }) => {
    await requireOwner(ctx)
    const production = await ctx.db.get(productionId)
    if (!production || production.channelId !== channelId) return null
    return production
  },
})

export const create = mutation({
  args: {
    channelId: v.id('channels'),
    name: v.string(),
    ideaId: v.optional(v.id('ideas')),
    angle: v.optional(v.string()),
  },
  handler: async (ctx, { channelId, name, ideaId, angle }) => {
    await requireOwner(ctx)
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Give the video a name.')
    const productionId = await ctx.db.insert('productions', {
      channelId,
      ideaId,
      name: trimmed,
      // One length control in the UI: minutes (default 8) with format derived from it.
      format: 'medium',
      concept: { workingTitle: trimmed, descriptionAngle: angle ?? '', audienceGap: '' },
      titleCandidates: [],
      chosenTitles: [],
      targetMinutes: 8,
      thumbnailCandidates: [],
      chosenThumbnail: undefined,
      interview: [],
      draftMarkdown: '',
      metadata: { chapters: [], tags: [] },
      status: 'building',
      updatedAt: Date.now(),
    })
    if (ideaId) {
      const idea = await ctx.db.get(ideaId)
      if (idea && idea.channelId === channelId) {
        await ctx.db.patch(ideaId, { status: 'in_production', updatedAt: Date.now() })
      }
    }
    return productionId
  },
})

// The autosave patch target: any subset of the editable fields in one call.
export const update = mutation({
  args: {
    channelId: v.id('channels'),
    productionId: v.id('productions'),
    name: v.optional(v.string()),
    format: v.optional(format),
    targetMinutes: v.optional(v.number()),
    concept: v.optional(
      v.object({
        workingTitle: v.string(),
        descriptionAngle: v.string(),
        audienceGap: v.string(),
        scores: v.optional(v.any()),
        rationale: v.optional(v.string()),
      }),
    ),
    chosenTitles: v.optional(v.array(v.object({ text: v.string(), main: v.boolean() }))),
    chosenThumbnail: v.optional(v.any()),
    interview: v.optional(v.array(interviewBlock)),
    draftMarkdown: v.optional(v.string()),
    metadata: v.optional(metadataShape),
  },
  handler: async (ctx, { channelId, productionId, ...fields }) => {
    await requireOwner(ctx)
    await getOwnedProduction(ctx, channelId, productionId)
    if (fields.chosenTitles && fields.chosenTitles.filter((t) => t.main).length > 1) {
      throw new Error('Only one title can be the main title.')
    }
    if (fields.targetMinutes !== undefined) {
      fields.targetMinutes = Math.max(0, Math.round(fields.targetMinutes))
    }
    const patch = Object.fromEntries(Object.entries(fields).filter(([, val]) => val !== undefined))
    await ctx.db.patch(productionId, { ...patch, updatedAt: Date.now() })
  },
})

export const setStatus = mutation({
  args: { channelId: v.id('channels'), productionId: v.id('productions'), status },
  handler: async (ctx, { channelId, productionId, status: next }) => {
    await requireOwner(ctx)
    await getOwnedProduction(ctx, channelId, productionId)
    await ctx.db.patch(productionId, { status: next, updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { channelId: v.id('channels'), productionId: v.id('productions') },
  handler: async (ctx, { channelId, productionId }) => {
    await requireOwner(ctx)
    const production = await getOwnedProduction(ctx, channelId, productionId)
    // Desktop parity: deleting the production returns its idea to the backlog.
    if (production.ideaId) {
      const idea = await ctx.db.get(production.ideaId)
      if (idea && idea.status === 'in_production') {
        await ctx.db.patch(idea._id, { status: 'new', updatedAt: Date.now() })
      }
    }
    const snapshots = await ctx.db
      .query('draftSnapshots')
      .withIndex('by_production', (q) => q.eq('productionId', productionId))
      .collect()
    for (const snapshot of snapshots) await ctx.db.delete(snapshot._id)
    await ctx.db.delete(productionId)
  },
})

// Package apply: ONE transactional write for titles + thumbnails + working
// description + interview seeding (desktop did this as a single UPDATE).
// Interview seeding is non-destructive: if any existing answer is non-empty,
// only new questions are appended, deduped by trimmed-lowercase question text.
export const applyPackage = mutation({
  args: {
    channelId: v.id('channels'),
    productionId: v.id('productions'),
    titleCandidates: v.array(v.any()),
    thumbnailCandidates: v.array(v.any()),
    description: v.optional(
      v.object({ firstLine: v.string(), body: v.string(), notes: v.optional(v.string()) }),
    ),
    questions: v.array(v.object({ type: v.string(), facet: v.string(), q: v.string() })),
  },
  handler: async (ctx, { channelId, productionId, titleCandidates, thumbnailCandidates, description, questions }) => {
    await requireOwner(ctx)
    const production = await getOwnedProduction(ctx, channelId, productionId)

    const existing = production.interview
    const hasAnswers = existing.some((block) => block.a.trim() !== '')
    const seen = new Set(existing.map((block) => block.q.trim().toLowerCase()))
    const fresh = questions
      .filter((question) => question.q.trim() && !seen.has(question.q.trim().toLowerCase()))
      .map((question) => ({
        id: crypto.randomUUID(),
        type: (
          [
            'informative', 'opinion', 'personal_story', 'third_party_narrative',
            'case_study', 'problem_solving', 'manual', 'story', 'second_brain',
          ] as const
        ).includes(question.type as never)
          ? (question.type as 'informative')
          : 'informative',
        facet: question.facet,
        q: question.q.trim(),
        a: '',
      }))
    const interview = hasAnswers ? [...existing, ...fresh] : fresh.length > 0 ? fresh : existing

    // Reconcile prior picks against the NEW candidate sets so a re-apply can't
    // orphan a chosen title/thumbnail that is no longer selectable in the UI.
    const newTitleTexts = new Set(
      (titleCandidates as Array<{ text?: unknown }>).map((t) => String(t.text ?? '')),
    )
    let chosenTitles = production.chosenTitles.filter((t) => newTitleTexts.has(t.text))
    if (chosenTitles.length > 0 && !chosenTitles.some((t) => t.main)) {
      chosenTitles = chosenTitles.map((t, i) => ({ ...t, main: i === 0 }))
    }
    const newThumbs = new Set(thumbnailCandidates.map((t) => JSON.stringify(t)))
    const chosenThumbnail =
      production.chosenThumbnail !== undefined &&
      newThumbs.has(JSON.stringify(production.chosenThumbnail))
        ? production.chosenThumbnail
        : undefined

    await ctx.db.patch(productionId, {
      titleCandidates,
      thumbnailCandidates,
      chosenTitles,
      chosenThumbnail,
      metadata: { ...production.metadata, description: description ?? production.metadata.description },
      interview,
      updatedAt: Date.now(),
    })
    return { seededQuestions: interview === existing ? 0 : fresh.length, interview }
  },
})

// Draft apply: snapshot the outgoing draft (decision #4), then replace.
export const applyDraft = mutation({
  args: {
    channelId: v.id('channels'),
    productionId: v.id('productions'),
    draftMarkdown: v.string(),
  },
  handler: async (ctx, { channelId, productionId, draftMarkdown }) => {
    await requireOwner(ctx)
    const production = await getOwnedProduction(ctx, channelId, productionId)
    if (!draftMarkdown.trim()) throw new Error('The pasted reply contains no script.')
    if (production.draftMarkdown.trim()) {
      await ctx.db.insert('draftSnapshots', {
        productionId,
        channelId,
        draftMarkdown: production.draftMarkdown,
        reason: 'apply_replace',
      })
    }
    await ctx.db.patch(productionId, { draftMarkdown, updatedAt: Date.now() })
  },
})

export const applyMetadata = mutation({
  args: {
    channelId: v.id('channels'),
    productionId: v.id('productions'),
    metadata: metadataShape,
  },
  handler: async (ctx, { channelId, productionId, metadata }) => {
    await requireOwner(ctx)
    await getOwnedProduction(ctx, channelId, productionId)
    if (!metadata.description) throw new Error('The reply is missing a description.')
    await ctx.db.patch(productionId, { metadata, updatedAt: Date.now() })
  },
})

export const listSnapshots = query({
  args: { channelId: v.id('channels'), productionId: v.id('productions') },
  handler: async (ctx, { channelId, productionId }) => {
    await requireOwner(ctx)
    await getOwnedProduction(ctx, channelId, productionId)
    const snapshots = await ctx.db
      .query('draftSnapshots')
      .withIndex('by_production', (q) => q.eq('productionId', productionId))
      .collect()
    return snapshots
      .sort((a, b) => b._creationTime - a._creationTime)
      .map((snap) => ({
        _id: snap._id,
        createdAt: snap._creationTime,
        reason: snap.reason,
        preview: snap.draftMarkdown.slice(0, 160),
        words: snap.draftMarkdown.split(/\s+/).filter(Boolean).length,
      }))
  },
})

// Restoring snapshots the CURRENT draft first, so a restore is itself undoable.
export const restoreSnapshot = mutation({
  args: {
    channelId: v.id('channels'),
    productionId: v.id('productions'),
    snapshotId: v.id('draftSnapshots'),
  },
  handler: async (ctx, { channelId, productionId, snapshotId }) => {
    await requireOwner(ctx)
    const production = await getOwnedProduction(ctx, channelId, productionId)
    const snapshot = await ctx.db.get(snapshotId)
    if (!snapshot || snapshot.productionId !== productionId) throw new Error('Snapshot not found')
    if (production.draftMarkdown.trim()) {
      await ctx.db.insert('draftSnapshots', {
        productionId,
        channelId,
        draftMarkdown: production.draftMarkdown,
        reason: 'manual',
      })
    }
    await ctx.db.patch(productionId, { draftMarkdown: snapshot.draftMarkdown, updatedAt: Date.now() })
    return snapshot.draftMarkdown
  },
})
