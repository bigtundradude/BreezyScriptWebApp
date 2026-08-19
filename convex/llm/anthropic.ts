import { LlmError, type ChatMessage, type ChatOptions } from './types'

export async function listAnthropicModels(): Promise<string[]> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new LlmError('Claude API key missing — set ANTHROPIC_API_KEY in the Convex deployment env.')
  const response = await fetch('https://api.anthropic.com/v1/models?limit=100', {
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
  })
  if (!response.ok) throw new LlmError(`Claude models list failed: ${response.statusText}`)
  const body = (await response.json()) as { data?: Array<{ id?: string }> }
  return (body.data ?? []).map((m) => m.id ?? '').filter(Boolean)
}

// Translation layer: common format → Anthropic Messages API.
// System messages move to the top-level `system` field; the rest map 1:1.
export async function chatAnthropic(
  model: string,
  messages: ChatMessage[],
  options: ChatOptions,
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new LlmError('Claude API key missing — set ANTHROPIC_API_KEY in the Convex deployment env.')

  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')
  const turns = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 2048,
      ...(system ? { system } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      messages: turns,
    }),
  })

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null
        ? ((body as { error?: { message?: string } }).error?.message ?? response.statusText)
        : response.statusText
    throw new LlmError(`Claude (${model}): ${message}`)
  }
  const content = (body as { content?: Array<{ type: string; text?: string }> })?.content
  const text = (content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('')
  if (!text) throw new LlmError(`Claude (${model}) returned an empty reply.`)
  return text
}
