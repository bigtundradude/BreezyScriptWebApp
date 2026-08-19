import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'

async function getOwnedShape(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<'channels'>,
  shapeId: Id<'titleShapes'>,
) {
  const shape = await ctx.db.get(shapeId)
  if (!shape || shape.channelId !== channelId) throw new Error('Shape not found')
  return shape
}

async function getOwnedTemplate(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<'channels'>,
  templateId: Id<'titleTemplates'>,
) {
  const template = await ctx.db.get(templateId)
  if (!template || template.channelId !== channelId) throw new Error('Template not found')
  return template
}

export const listShapes = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const shapes = await ctx.db
      .query('titleShapes')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    return shapes.sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

export const listTemplates = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    return await ctx.db
      .query('titleTemplates')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .order('desc')
      .collect()
  },
})

export const createShape = mutation({
  args: {
    channelId: v.id('channels'),
    name: v.string(),
    tagline: v.string(),
    mechanism: v.string(),
    whatMakesItWork: v.array(v.string()),
    whatUnderminesIt: v.array(v.string()),
  },
  handler: async (ctx, { channelId, ...fields }) => {
    await requireOwner(ctx)
    const shapes = await ctx.db
      .query('titleShapes')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    return await ctx.db.insert('titleShapes', {
      channelId,
      ...fields,
      sortOrder: shapes.length,
      updatedAt: Date.now(),
    })
  },
})

export const updateShape = mutation({
  args: {
    channelId: v.id('channels'),
    shapeId: v.id('titleShapes'),
    name: v.optional(v.string()),
    tagline: v.optional(v.string()),
    mechanism: v.optional(v.string()),
    whatMakesItWork: v.optional(v.array(v.string())),
    whatUnderminesIt: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { channelId, shapeId, ...fields }) => {
    await requireOwner(ctx)
    await getOwnedShape(ctx, channelId, shapeId)
    const patch = Object.fromEntries(Object.entries(fields).filter(([, val]) => val !== undefined))
    await ctx.db.patch(shapeId, { ...patch, updatedAt: Date.now() })
  },
})

// Deleting a custom shape does NOT delete its templates — they become unsorted
// (desktop parity).
export const removeShape = mutation({
  args: { channelId: v.id('channels'), shapeId: v.id('titleShapes') },
  handler: async (ctx, { channelId, shapeId }) => {
    await requireOwner(ctx)
    await getOwnedShape(ctx, channelId, shapeId)
    const templates = await ctx.db
      .query('titleTemplates')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    for (const template of templates) {
      if (template.shapeId === shapeId) await ctx.db.patch(template._id, { shapeId: '' })
    }
    await ctx.db.delete(shapeId)
  },
})

export const createTemplate = mutation({
  args: {
    channelId: v.id('channels'),
    pattern: v.string(),
    shapeId: v.string(),
    exampleTitle: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
    whyItWorks: v.optional(v.string()),
    manual: v.optional(v.boolean()),
  },
  handler: async (ctx, { channelId, pattern, shapeId, exampleTitle, triggers, whyItWorks, manual }) => {
    await requireOwner(ctx)
    if (!pattern.trim()) throw new Error('Give the template a pattern.')
    return await ctx.db.insert('titleTemplates', {
      channelId,
      pattern: pattern.trim(),
      exampleSource: '',
      triggers: triggers ?? [],
      structureNotes: '',
      transferability: '',
      whyItWorks: whyItWorks ?? '',
      outlierStrength: '',
      manual: manual ?? true,
      shapeId,
      whyThisVariant: '',
      exampleTitle: exampleTitle ?? '',
      sortBoost: 0,
      updatedAt: Date.now(),
    })
  },
})

export const updateTemplate = mutation({
  args: {
    channelId: v.id('channels'),
    templateId: v.id('titleTemplates'),
    pattern: v.optional(v.string()),
    shapeId: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
    whyItWorks: v.optional(v.string()),
    exampleTitle: v.optional(v.string()),
  },
  handler: async (ctx, { channelId, templateId, ...fields }) => {
    await requireOwner(ctx)
    await getOwnedTemplate(ctx, channelId, templateId)
    const patch = Object.fromEntries(Object.entries(fields).filter(([, val]) => val !== undefined))
    await ctx.db.patch(templateId, { ...patch, updatedAt: Date.now() })
  },
})

export const removeTemplate = mutation({
  args: { channelId: v.id('channels'), templateId: v.id('titleTemplates') },
  handler: async (ctx, { channelId, templateId }) => {
    await requireOwner(ctx)
    await getOwnedTemplate(ctx, channelId, templateId)
    await ctx.db.delete(templateId)
  },
})
