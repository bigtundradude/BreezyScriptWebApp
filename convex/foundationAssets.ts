import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'

export const assetType = v.union(v.literal('persona'), v.literal('audience'), v.literal('framework'))
type AssetType = 'persona' | 'audience' | 'framework'

async function getOwnedAsset(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<'channels'>,
  assetId: Id<'foundationAssets'>,
) {
  const asset = await ctx.db.get(assetId)
  if (!asset || asset.channelId !== channelId) throw new Error('Asset not found')
  return asset
}

function sortAssets(assets: Doc<'foundationAssets'>[]) {
  return assets.sort((a, b) =>
    a.isDefault !== b.isDefault ? (a.isDefault ? -1 : 1) : b.updatedAt - a.updatedAt,
  )
}

export const list = query({
  args: { channelId: v.id('channels'), type: assetType },
  handler: async (ctx, { channelId, type }) => {
    await requireOwner(ctx)
    const assets = await ctx.db
      .query('foundationAssets')
      .withIndex('by_channel_type', (q) => q.eq('channelId', channelId).eq('type', type))
      .collect()
    return sortAssets(assets)
  },
})

export const get = query({
  args: { channelId: v.id('channels'), assetId: v.id('foundationAssets') },
  handler: async (ctx, { channelId, assetId }) => {
    await requireOwner(ctx)
    const asset = await ctx.db.get(assetId)
    if (!asset || asset.channelId !== channelId) return null
    return asset
  },
})

export const create = mutation({
  args: { channelId: v.id('channels'), type: assetType, label: v.string() },
  handler: async (ctx, { channelId, type, label }) => {
    await requireOwner(ctx)
    const siblings = await ctx.db
      .query('foundationAssets')
      .withIndex('by_channel_type', (q) => q.eq('channelId', channelId).eq('type', type))
      .collect()
    return await ctx.db.insert('foundationAssets', {
      channelId,
      type,
      label: label.trim() || 'Untitled',
      sourceInput: '',
      result: {},
      resultMarkdown: '',
      promptSnippet: '',
      isDefault: siblings.length === 0, // first asset becomes the default
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    channelId: v.id('channels'),
    assetId: v.id('foundationAssets'),
    label: v.optional(v.string()),
    sourceInput: v.optional(v.string()),
    promptSnippet: v.optional(v.string()),
  },
  handler: async (ctx, { channelId, assetId, label, sourceInput, promptSnippet }) => {
    await requireOwner(ctx)
    await getOwnedAsset(ctx, channelId, assetId)
    await ctx.db.patch(assetId, {
      ...(label !== undefined ? { label: label.trim() || 'Untitled' } : {}),
      ...(sourceInput !== undefined ? { sourceInput } : {}),
      ...(promptSnippet !== undefined ? { promptSnippet } : {}),
      updatedAt: Date.now(),
    })
  },
})

// Apply path: the pasted model reply lands here after client-side parsing.
// A non-empty promptSnippet is required — an empty apply must not wipe work.
export const applyResult = mutation({
  args: {
    channelId: v.id('channels'),
    assetId: v.id('foundationAssets'),
    result: v.any(),
    resultMarkdown: v.string(),
    promptSnippet: v.string(),
  },
  handler: async (ctx, { channelId, assetId, result, resultMarkdown, promptSnippet }) => {
    await requireOwner(ctx)
    await getOwnedAsset(ctx, channelId, assetId)
    if (!promptSnippet.trim()) throw new Error('The reply is missing a prompt snippet.')
    await ctx.db.patch(assetId, { result, resultMarkdown, promptSnippet, updatedAt: Date.now() })
  },
})

export const setDefault = mutation({
  args: { channelId: v.id('channels'), assetId: v.id('foundationAssets') },
  handler: async (ctx, { channelId, assetId }) => {
    await requireOwner(ctx)
    const asset = await getOwnedAsset(ctx, channelId, assetId)
    const siblings = await ctx.db
      .query('foundationAssets')
      .withIndex('by_channel_type', (q) =>
        q.eq('channelId', channelId).eq('type', asset.type as AssetType),
      )
      .collect()
    for (const sibling of siblings) {
      if (sibling.isDefault && sibling._id !== assetId) {
        await ctx.db.patch(sibling._id, { isDefault: false })
      }
    }
    await ctx.db.patch(assetId, { isDefault: true, updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { channelId: v.id('channels'), assetId: v.id('foundationAssets') },
  handler: async (ctx, { channelId, assetId }) => {
    await requireOwner(ctx)
    await getOwnedAsset(ctx, channelId, assetId)
    await ctx.db.delete(assetId)
  },
})
