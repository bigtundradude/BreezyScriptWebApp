import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'
import { PROVIDER_ENV_KEYS, type AiProvider, type ResolvedModel, type TaskClass } from './llm/types'

// AI integration settings (docs/idea-workflow-plan.md §6b). Model choices live
// in aiProviderSettings; the active provider per task class lives in userPrefs;
// API keys live ONLY in deployment env vars — the UI sees presence, never values.

const aiProvider = v.union(v.literal('claude'), v.literal('openai'), v.literal('grok'))
const taskClass = v.union(v.literal('simple'), v.literal('scripts'))

const ACTIVE_PREF_KEY: Record<TaskClass, string> = {
  simple: 'ai:activeSimple',
  scripts: 'ai:activeScripts',
}

async function readActive(ctx: QueryCtx, task: TaskClass): Promise<AiProvider | null> {
  const pref = await ctx.db
    .query('userPrefs')
    .withIndex('by_key', (q) => q.eq('key', ACTIVE_PREF_KEY[task]))
    .unique()
  return (pref?.value as AiProvider | undefined) ?? null
}

// Owner gate for actions (they have no ctx.db, so they can't run requireOwner
// directly — the email fallback path needs the users table).
export const assertOwner = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx)
    return null
  },
})

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx)
    const rows = await ctx.db.query('aiProviderSettings').collect()
    const cacheRows = await ctx.db.query('aiModelCache').collect()
    const providers = {} as Record<AiProvider, { simpleModel: string; scriptModel: string }>
    const models = {} as Record<AiProvider, { list: string[]; fetchedAt: number | null }>
    for (const p of ['claude', 'openai', 'grok'] as const) {
      const row = rows.find((r) => r.provider === p)
      providers[p] = {
        simpleModel: row?.simpleModel ?? '',
        scriptModel: row?.scriptModel ?? '',
      }
      const cache = cacheRows.find((r) => r.provider === p)
      models[p] = { list: cache?.models ?? [], fetchedAt: cache?.fetchedAt ?? null }
    }
    return {
      providers,
      models,
      active: {
        simple: await readActive(ctx, 'simple'),
        scripts: await readActive(ctx, 'scripts'),
      },
      // Presence only — key values never leave the server.
      keys: Object.fromEntries(
        (['claude', 'openai', 'grok'] as const).map((p) => [
          p,
          Boolean(process.env[PROVIDER_ENV_KEYS[p]]),
        ]),
      ) as Record<AiProvider, boolean>,
    }
  },
})

export const storeModelCache = internalMutation({
  args: { provider: aiProvider, models: v.array(v.string()) },
  handler: async (ctx, { provider, models }) => {
    const existing = await ctx.db
      .query('aiModelCache')
      .withIndex('by_provider', (q) => q.eq('provider', provider))
      .unique()
    const fields = { models, fetchedAt: Date.now() }
    if (existing) await ctx.db.patch(existing._id, fields)
    else await ctx.db.insert('aiModelCache', { provider, ...fields })
  },
})

export const setProviderModels = mutation({
  args: { provider: aiProvider, simpleModel: v.string(), scriptModel: v.string() },
  handler: async (ctx, { provider, simpleModel, scriptModel }) => {
    await requireOwner(ctx)
    const existing = await ctx.db
      .query('aiProviderSettings')
      .withIndex('by_provider', (q) => q.eq('provider', provider))
      .unique()
    const fields = {
      simpleModel: simpleModel.trim(),
      scriptModel: scriptModel.trim(),
      updatedAt: Date.now(),
    }
    if (existing) await ctx.db.patch(existing._id, fields)
    else await ctx.db.insert('aiProviderSettings', { provider, ...fields })
  },
})

export const setActive = mutation({
  args: { task: taskClass, provider: aiProvider },
  handler: async (ctx, { task, provider }) => {
    await requireOwner(ctx)
    const key = ACTIVE_PREF_KEY[task]
    const existing = await ctx.db
      .query('userPrefs')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique()
    if (existing) await ctx.db.patch(existing._id, { value: provider, updatedAt: Date.now() })
    else await ctx.db.insert('userPrefs', { key, value: provider, updatedAt: Date.now() })
  },
})

// Resolution used by LLM actions: task class → {provider, model}, with
// friendly errors that point at the Settings page.
export const resolve = internalQuery({
  args: { task: taskClass },
  handler: async (ctx, { task }): Promise<ResolvedModel> => {
    const provider = await readActive(ctx, task)
    if (!provider) {
      throw new Error(
        `No AI provider selected for ${task === 'simple' ? 'simple tasks' : 'script writing'} — pick one in Settings → AI integrations.`,
      )
    }
    const row = await ctx.db
      .query('aiProviderSettings')
      .withIndex('by_provider', (q) => q.eq('provider', provider))
      .unique()
    const model = task === 'simple' ? row?.simpleModel : row?.scriptModel
    if (!model) {
      throw new Error(
        `No ${task === 'simple' ? 'simple-tasks' : 'script-writing'} model set for ${provider} — add one in Settings → AI integrations.`,
      )
    }
    return { provider, model }
  },
})
