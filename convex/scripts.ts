import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'

const DEFAULT_WPM = 140

async function readWpm(ctx: QueryCtx, channelId: Id<'channels'>) {
  const pref = await ctx.db
    .query('userPrefs')
    .withIndex('by_key', (q) => q.eq('key', `wordsPerMinute:${channelId}`))
    .unique()
  const value = Number(pref?.value)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_WPM
}

function defaultSnippet(assets: Doc<'foundationAssets'>[]) {
  const withSnippet = assets.filter((a) => a.promptSnippet.trim())
  withSnippet.sort((a, b) =>
    a.isDefault !== b.isDefault ? (a.isDefault ? -1 : 1) : b.updatedAt - a.updatedAt,
  )
  return withSnippet[0]?.promptSnippet ?? ''
}

// One round trip supplying everything the client-side megaprompt composers need
// (plan §4). Replaces the desktop app's inline SQLite gatherers.
export const promptContext = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const channel = await ctx.db.get(channelId)
    if (!channel) throw new Error('Channel not found')

    const assetsByType = async (type: 'persona' | 'audience' | 'framework') =>
      await ctx.db
        .query('foundationAssets')
        .withIndex('by_channel_type', (q) => q.eq('channelId', channelId).eq('type', type))
        .collect()

    const templates = await ctx.db
      .query('titleTemplates')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    // sort_boost DESC, then created DESC; limit 25 (desktop parity)
    templates.sort((a, b) =>
      b.sortBoost !== a.sortBoost ? b.sortBoost - a.sortBoost : b._creationTime - a._creationTime,
    )

    const itemsByKind = async (kind: 'video_structure' | 'cta' | 'disclosure' | 'description') =>
      await ctx.db
        .query('libraryItems')
        .withIndex('by_channel_kind', (q) => q.eq('channelId', channelId).eq('kind', kind))
        .collect()

    const pickDefault = (items: Doc<'libraryItems'>[]) => {
      const sorted = [...items].sort((a, b) =>
        a.isDefault !== b.isDefault ? (a.isDefault ? -1 : 1) : b.updatedAt - a.updatedAt,
      )
      return sorted[0] ?? null
    }

    const structure = pickDefault(await itemsByKind('video_structure'))
    const structureResult = (structure?.result ?? null) as Record<string, unknown> | null
    const ctas = await itemsByKind('cta')
    const disclosures = await itemsByKind('disclosure')
    const descriptionTemplate = pickDefault(await itemsByKind('description'))
    const descriptionResult = (descriptionTemplate?.result ?? null) as Record<string, unknown> | null

    return {
      identity: channel.identity,
      personaSnippet: defaultSnippet(await assetsByType('persona')),
      audienceSnippet: defaultSnippet(await assetsByType('audience')),
      frameworkSnippet: defaultSnippet(await assetsByType('framework')),
      titlePatterns: templates.slice(0, 25).map((t) => ({ pattern: t.pattern, triggers: t.triggers })),
      defaultStructure: structureResult
        ? {
            name: String(structureResult.name ?? structure?.title ?? ''),
            formatType: String(structureResult.format_type ?? structureResult.formatType ?? ''),
            sections: Array.isArray(structureResult.sections)
              ? (structureResult.sections as Array<{ beat: string; job: string }>)
              : [],
            retentionMechanics:
              structureResult.retention_mechanics ?? structureResult.retentionMechanics ?? undefined,
            pacingNotes: String(structureResult.pacing_notes ?? structureResult.pacingNotes ?? ''),
          }
        : null,
      ctasAndDisclosures: [...ctas, ...disclosures]
        .slice(0, 12)
        .map((item) => ({
          kind: item.kind as 'cta' | 'disclosure',
          title: item.title,
          summary: item.summary,
        })),
      wordsPerMinute: await readWpm(ctx, channelId),
      descriptionTemplateBody: descriptionResult ? String(descriptionResult.body ?? '') : '',
    }
  },
})

export const getWordsPerMinute = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    return await readWpm(ctx, channelId)
  },
})

export const setWordsPerMinute = mutation({
  args: { channelId: v.id('channels'), wordsPerMinute: v.number() },
  handler: async (ctx, { channelId, wordsPerMinute }) => {
    await requireOwner(ctx)
    const value = Math.max(60, Math.min(260, Math.round(wordsPerMinute)))
    const key = `wordsPerMinute:${channelId}`
    const existing = await ctx.db
      .query('userPrefs')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique()
    if (existing) await ctx.db.patch(existing._id, { value, updatedAt: Date.now() })
    else await ctx.db.insert('userPrefs', { key, value, updatedAt: Date.now() })
  },
})
