import { v } from 'convex/values'
import { action, internalMutation, query } from './_generated/server'
import { internal } from './_generated/api'
import type { TableNames } from './_generated/dataModel'
import { requireOwner } from './lib/owner'

// Dev-only data tools (owner spec 2026-08-19): seed the demo fixture and wipe
// the app back to the first-run state, from Settings. Double-gated: the UI
// renders only in dev builds, and every function here throws unless the
// deployment sets ALLOW_DEV_DATA (never set it on prod). Seed content lives in
// convex/seedIdeaBank.ts — checked into git, deployed server-side, never part
// of the browser bundle.

function assertDevData() {
  if (!process.env.ALLOW_DEV_DATA) {
    throw new Error('Dev data tools are disabled on this deployment (ALLOW_DEV_DATA is not set).')
  }
}

export const status = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx)
    return { enabled: Boolean(process.env.ALLOW_DEV_DATA) }
  },
})

// Every app table except the auth tables: the owner stays signed in and lands
// on the first-run splash. bankThumbnails is wiped separately for its files.
const APP_TABLES: TableNames[] = [
  'channels',
  'notes',
  'bankIdeas',
  'bankQuestions',
  'bankStructures',
  'bankDrafts',
  'bankRefinementDrafts',
  'bankReplacements',
  'bankWordPrefs',
  'bankSnippets',
  'bankTitleCandidates',
  'bankPersonas',
  'bankAudiences',
  'affiliateTags',
  'affiliateLinks',
  'titleShapes',
  'titleTemplates',
  'aiProviderSettings',
  'aiModelCache',
  'userPrefs',
]

export const wipeTable = internalMutation({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    assertDevData()
    if (!APP_TABLES.includes(table as TableNames)) throw new Error(`Not a wipeable table: ${table}`)
    const docs = await ctx.db.query(table as TableNames).collect()
    for (const doc of docs) await ctx.db.delete(doc._id)
    return docs.length
  },
})

export const wipeThumbnails = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertDevData()
    const thumbnails = await ctx.db.query('bankThumbnails').collect()
    for (const thumbnail of thumbnails) {
      await ctx.storage.delete(thumbnail.storageId)
      await ctx.db.delete(thumbnail._id)
    }
    return thumbnails.length
  },
})

// Full reset to the new-user state: removes seed data AND everything added by
// hand. One table per mutation keeps each transaction small.
export const wipeAll = action({
  args: {},
  handler: async (ctx): Promise<{ deleted: number }> => {
    await ctx.runQuery(internal.aiSettings.assertOwner, {})
    assertDevData()
    let deleted: number = await ctx.runMutation(internal.devData.wipeThumbnails, {})
    for (const table of APP_TABLES) {
      deleted += await ctx.runMutation(internal.devData.wipeTable, { table })
    }
    return { deleted }
  },
})

export const seed = action({
  args: {},
  handler: async (ctx): Promise<{ ok: true }> => {
    await ctx.runQuery(internal.aiSettings.assertOwner, {})
    assertDevData()
    await ctx.runMutation(internal.seedIdeaBank.run, {})
    await ctx.runMutation(internal.seedIdeaBank.researchFixtures, {})
    return { ok: true }
  },
})
