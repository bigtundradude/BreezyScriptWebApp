import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'

// Thumbnails step backend (docs/idea-workflow-plan.md §5). Slots reference
// per-idea thumbnail docs; the same doc may fill several slots. Uploads are
// deduped within the idea by the storage sha256.

const SLOT_COUNT = 3

async function getOwnedIdea(ctx: QueryCtx, channelId: Id<'channels'>, ideaId: Id<'bankIdeas'>) {
  const idea = await ctx.db.get(ideaId)
  if (!idea || idea.channelId !== channelId) throw new Error('Idea not found')
  return idea
}

function slotsOf(idea: Doc<'bankIdeas'>): Array<Id<'bankThumbnails'> | null> {
  const slots = idea.thumbnailSlots ?? []
  return Array.from({ length: SLOT_COUNT }, (_, i) => slots[i] ?? null)
}

function slugify(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, '')
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'thumbnail'
  )
}

// Cascade guard shared with ideaBank.ts semantics: clearing the last thumbnail
// demotes the thumbnails step (and everything after it).
async function reconcileAfterThumbnailChange(ctx: MutationCtx, ideaId: Id<'bankIdeas'>) {
  const idea = await ctx.db.get(ideaId)
  if (!idea) return
  const filled = slotsOf(idea).some((slot) => slot !== null)
  const ready = idea.readySteps ?? []
  if (!filled && ready.includes('thumbnails')) {
    await ctx.db.patch(ideaId, { readySteps: ready.slice(0, ready.indexOf('thumbnails')) })
  }
}

export const list = query({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) return null
    const docs = await ctx.db
      .query('bankThumbnails')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    return {
      slots: slotsOf(idea),
      thumbnails: await Promise.all(
        docs.map(async (doc) => ({
          _id: doc._id,
          name: doc.name,
          originalFileName: doc.originalFileName,
          width: doc.width,
          height: doc.height,
          url: await ctx.storage.getUrl(doc.storageId),
        })),
      ),
    }
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const attach = mutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    slot: v.number(),
    storageId: v.id('_storage'),
    originalFileName: v.string(),
    width: v.number(),
    height: v.number(),
  },
  handler: async (ctx, { channelId, ideaId, slot, storageId, originalFileName, width, height }) => {
    await requireOwner(ctx)
    const idea = await getOwnedIdea(ctx, channelId, ideaId)
    if (slot < 0 || slot >= SLOT_COUNT) throw new Error('Bad slot')

    const uploaded = await ctx.db.system.get(storageId)
    if (!uploaded) throw new Error('Upload not found — try again.')

    // Dedupe within the idea: same bytes → reuse the existing doc.
    const existing = await ctx.db
      .query('bankThumbnails')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    let thumbnailId: Id<'bankThumbnails'> | null = null
    for (const doc of existing) {
      const meta = await ctx.db.system.get(doc.storageId)
      if (meta && meta.sha256 === uploaded.sha256) {
        thumbnailId = doc._id
        break
      }
    }
    if (thumbnailId) {
      await ctx.storage.delete(storageId)
    } else {
      thumbnailId = await ctx.db.insert('bankThumbnails', {
        channelId,
        ideaId,
        storageId,
        name: `${ideaId}-${slugify(originalFileName)}`,
        originalFileName,
        width,
        height,
      })
    }

    const slots = slotsOf(idea)
    slots[slot] = thumbnailId
    await ctx.db.patch(ideaId, { thumbnailSlots: slots, updatedAt: Date.now() })
    return thumbnailId
  },
})

// Reference an already-uploaded thumbnail from another slot (no re-upload).
export const assign = mutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    slot: v.number(),
    thumbnailId: v.id('bankThumbnails'),
  },
  handler: async (ctx, { channelId, ideaId, slot, thumbnailId }) => {
    await requireOwner(ctx)
    const idea = await getOwnedIdea(ctx, channelId, ideaId)
    if (slot < 0 || slot >= SLOT_COUNT) throw new Error('Bad slot')
    const doc = await ctx.db.get(thumbnailId)
    if (!doc || doc.ideaId !== ideaId) throw new Error('Thumbnail not found')
    const slots = slotsOf(idea)
    slots[slot] = thumbnailId
    await ctx.db.patch(ideaId, { thumbnailSlots: slots, updatedAt: Date.now() })
  },
})

export const clearSlot = mutation({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas'), slot: v.number() },
  handler: async (ctx, { channelId, ideaId, slot }) => {
    await requireOwner(ctx)
    const idea = await getOwnedIdea(ctx, channelId, ideaId)
    if (slot < 0 || slot >= SLOT_COUNT) throw new Error('Bad slot')
    const slots = slotsOf(idea)
    const removed = slots[slot]
    slots[slot] = null
    await ctx.db.patch(ideaId, { thumbnailSlots: slots, updatedAt: Date.now() })
    // Last reference gone → delete the doc and its stored file.
    if (removed && !slots.includes(removed)) {
      const doc = await ctx.db.get(removed)
      if (doc) {
        await ctx.storage.delete(doc.storageId)
        await ctx.db.delete(doc._id)
      }
    }
    await reconcileAfterThumbnailChange(ctx, ideaId)
  },
})
