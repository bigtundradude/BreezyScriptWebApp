import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireOwner } from './lib/owner'

// Personalize-text settings (owner spec 2026-08-18): custom phrase
// replacements plus contraction opt-outs. The transform itself runs client-side
// in the refinement editor (src/features/bank/personalize.ts).

export const getSettings = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const replacements = await ctx.db
      .query('bankReplacements')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    const prefs = await ctx.db
      .query('bankWordPrefs')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .unique()
    // Legacy single-family fields fold into the compoundStyles map.
    const compoundStyles: Record<string, string> = {
      ...(prefs?.wouldHaveStyle ? { wouldHave: prefs.wouldHaveStyle } : {}),
      ...(prefs?.beNotStyle ? { beNot: prefs.beNotStyle } : {}),
      ...(prefs?.compoundStyles ?? {}),
    }
    return {
      replacements: replacements.sort((a, b) => a._creationTime - b._creationTime),
      disabledContractions: prefs?.disabledContractions ?? [],
      compoundStyles,
    }
  },
})

export const setCompoundStyle = mutation({
  args: { channelId: v.id('channels'), family: v.string(), style: v.string() },
  handler: async (ctx, { channelId, family, style }) => {
    await requireOwner(ctx)
    const prefs = await ctx.db
      .query('bankWordPrefs')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .unique()
    const next = { ...(prefs?.compoundStyles ?? {}), [family]: style }
    if (prefs) await ctx.db.patch(prefs._id, { compoundStyles: next, updatedAt: Date.now() })
    else {
      await ctx.db.insert('bankWordPrefs', {
        channelId,
        disabledContractions: [],
        compoundStyles: next,
        updatedAt: Date.now(),
      })
    }
  },
})

export const addReplacement = mutation({
  args: { channelId: v.id('channels'), before: v.string(), after: v.string() },
  handler: async (ctx, { channelId, before, after }) => {
    await requireOwner(ctx)
    if (!before.trim()) throw new Error('Enter the phrase to replace.')
    if (!after.trim()) throw new Error('Enter the replacement.')
    return await ctx.db.insert('bankReplacements', {
      channelId,
      before: before.trim(),
      after: after.trim(),
      updatedAt: Date.now(),
    })
  },
})

export const removeReplacement = mutation({
  args: { channelId: v.id('channels'), replacementId: v.id('bankReplacements') },
  handler: async (ctx, { channelId, replacementId }) => {
    await requireOwner(ctx)
    const replacement = await ctx.db.get(replacementId)
    if (!replacement || replacement.channelId !== channelId) throw new Error('Replacement not found')
    await ctx.db.delete(replacementId)
  },
})

export const toggleContraction = mutation({
  args: { channelId: v.id('channels'), contractionId: v.string() },
  handler: async (ctx, { channelId, contractionId }) => {
    await requireOwner(ctx)
    const prefs = await ctx.db
      .query('bankWordPrefs')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .unique()
    const disabled = prefs?.disabledContractions ?? []
    const next = disabled.includes(contractionId)
      ? disabled.filter((id) => id !== contractionId)
      : [...disabled, contractionId]
    if (prefs) await ctx.db.patch(prefs._id, { disabledContractions: next, updatedAt: Date.now() })
    else {
      await ctx.db.insert('bankWordPrefs', {
        channelId,
        disabledContractions: next,
        updatedAt: Date.now(),
      })
    }
  },
})

// Group-level convenience: enable or disable a whole set of pattern ids.
export const setContractionsDisabled = mutation({
  args: { channelId: v.id('channels'), contractionIds: v.array(v.string()), disabled: v.boolean() },
  handler: async (ctx, { channelId, contractionIds, disabled }) => {
    await requireOwner(ctx)
    const prefs = await ctx.db
      .query('bankWordPrefs')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .unique()
    const current = new Set(prefs?.disabledContractions ?? [])
    for (const id of contractionIds) {
      if (disabled) current.add(id)
      else current.delete(id)
    }
    const next = [...current]
    if (prefs) await ctx.db.patch(prefs._id, { disabledContractions: next, updatedAt: Date.now() })
    else {
      await ctx.db.insert('bankWordPrefs', {
        channelId,
        disabledContractions: next,
        updatedAt: Date.now(),
      })
    }
  },
})
