import { LlmError, type ChatMessage, type ChatOptions } from './types'

export async function listOpenAICompatModels(
  label: string,
  baseUrl: string,
  apiKey: string | undefined,
  envKeyName: string,
): Promise<string[]> {
  if (!apiKey) {
    throw new LlmError(`${label} API key missing — set ${envKeyName} in the Convex deployment env.`)
  }
  const response = await fetch(`${baseUrl}/models`, {
    headers: { authorization: `Bearer ${apiKey}` },
  })
  if (!response.ok) throw new LlmError(`${label} models list failed: ${response.statusText}`)
  const body = (await response.json()) as { data?: Array<{ id?: string }> }
  return (body.data ?? []).map((m) => m.id ?? '').filter(Boolean)
}

// Translation layer: common format → OpenAI-compatible chat completions.
// Serves OpenAI directly and Grok (xAI's API is OpenAI-compatible).
export async function chatOpenAICompat(
  label: string,
  baseUrl: string,
  apiKey: string | undefined,
  envKeyName: string,
  model: string,
  messages: ChatMessage[],
  options: ChatOptions,
): Promise<string> {
  if (!apiKey) {
    throw new LlmError(`${label} API key missing — set ${envKeyName} in the Convex deployment env.`)
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      ...(options.maxTokens !== undefined ? { max_completion_tokens: options.maxTokens } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    }),
  })

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null
        ? ((body as { error?: { message?: string } }).error?.message ?? response.statusText)
        : response.statusText
    throw new LlmError(`${label} (${model}): ${message}`)
  }
  const text = (body as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]
    ?.message?.content
  if (!text) throw new LlmError(`${label} (${model}) returned an empty reply.`)
  return text
}
