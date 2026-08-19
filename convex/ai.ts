import { v } from 'convex/values'
import { action } from './_generated/server'
import { internal } from './_generated/api'
import { runChat } from './llm'
import { listAnthropicModels } from './llm/anthropic'
import { listOpenAICompatModels } from './llm/openaiCompat'

// Substrings that mark obviously non-chat models (audio, image, embeddings…)
// so the Settings picker stays usable on a phone.
const NON_CHAT = [
  'whisper',
  'tts',
  'dall-e',
  'embed',
  'moderation',
  'audio',
  'realtime',
  'image',
  'transcribe',
  'babbage',
  'davinci',
]

// Fetch a provider's model list (needs its key) and cache it for the picker.
export const fetchModels = action({
  args: { provider: v.union(v.literal('claude'), v.literal('openai'), v.literal('grok')) },
  handler: async (ctx, { provider }): Promise<{ ok: boolean; count: number; message: string }> => {
    await ctx.runQuery(internal.aiSettings.assertOwner, {})
    try {
      let models: string[]
      switch (provider) {
        case 'claude':
          models = await listAnthropicModels()
          break
        case 'openai':
          models = await listOpenAICompatModels(
            'OpenAI',
            'https://api.openai.com/v1',
            process.env.OPENAI_API_KEY,
            'OPENAI_API_KEY',
          )
          break
        case 'grok':
          models = await listOpenAICompatModels(
            'Grok',
            'https://api.x.ai/v1',
            process.env.XAI_API_KEY,
            'XAI_API_KEY',
          )
          break
      }
      const filtered = [...new Set(models)]
        .filter((id) => !NON_CHAT.some((word) => id.toLowerCase().includes(word)))
        .sort()
      await ctx.runMutation(internal.aiSettings.storeModelCache, { provider, models: filtered })
      return { ok: true, count: filtered.length, message: `${filtered.length} models loaded.` }
    } catch (e) {
      return {
        ok: false,
        count: 0,
        message: e instanceof Error ? e.message : 'Could not load models.',
      }
    }
  },
})

// Provider smoke test for the Settings page: one tiny round-trip through the
// common message format. Returns a result object instead of throwing so the UI
// can render failures inline.
export const testConnection = action({
  args: {
    provider: v.union(v.literal('claude'), v.literal('openai'), v.literal('grok')),
    model: v.string(),
  },
  handler: async (ctx, { provider, model }): Promise<{ ok: boolean; message: string }> => {
    await ctx.runQuery(internal.aiSettings.assertOwner, {})
    const trimmed = model.trim()
    if (!trimmed) return { ok: false, message: 'Enter a model id first.' }
    try {
      const result = await runChat(
        { provider, model: trimmed },
        [{ role: 'user', content: 'Reply with the single word OK.' }],
        { maxTokens: 200 },
      )
      return { ok: true, message: `Connected — ${result.model} replied.` }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Connection failed.' }
    }
  },
})
