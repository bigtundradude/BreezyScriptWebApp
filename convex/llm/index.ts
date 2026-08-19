import { chatAnthropic } from './anthropic'
import { chatOpenAICompat } from './openaiCompat'
import type { ChatMessage, ChatOptions, ChatResult, ResolvedModel } from './types'

export * from './types'

// Single dispatch point: callers hold a ResolvedModel (from
// internal.aiSettings.resolve) and the common message list; providers are
// interchangeable behind this call.
export async function runChat(
  resolved: ResolvedModel,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult> {
  let text: string
  switch (resolved.provider) {
    case 'claude':
      text = await chatAnthropic(resolved.model, messages, options)
      break
    case 'openai':
      text = await chatOpenAICompat(
        'OpenAI',
        'https://api.openai.com/v1',
        process.env.OPENAI_API_KEY,
        'OPENAI_API_KEY',
        resolved.model,
        messages,
        options,
      )
      break
    case 'grok':
      text = await chatOpenAICompat(
        'Grok',
        'https://api.x.ai/v1',
        process.env.XAI_API_KEY,
        'XAI_API_KEY',
        resolved.model,
        messages,
        options,
      )
      break
  }
  return { text, provider: resolved.provider, model: resolved.model }
}
