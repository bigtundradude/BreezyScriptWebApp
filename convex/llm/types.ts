// Common LLM message format (docs/idea-workflow-plan.md §7). One internal
// shape; per-provider translation lives in the adapter files beside this one.

export type AiProvider = 'claude' | 'openai' | 'grok'
export type TaskClass = 'simple' | 'scripts'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatOptions = {
  maxTokens?: number
  temperature?: number
}

export type ResolvedModel = { provider: AiProvider; model: string }

export type ChatResult = {
  text: string
  provider: AiProvider
  model: string
}


export const PROVIDER_ENV_KEYS: Record<AiProvider, string> = {
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  grok: 'XAI_API_KEY',
}

export class LlmError extends Error {}

// Owner content rule (CLAUDE.md): NO em or en dashes in any generated content.
// Prompts forbid them; this is the belt-and-suspenders pass on model output.
// Digit ranges become hyphens ("10-20"); prose dashes become ", ".
export function stripDashes(text: string): string {
  return text
    .replace(/(\d)\s*[—–]\s*(\d)/g, '$1-$2')
    .replace(/\s*[—–]\s*/g, ', ')
}

// Shared prompt fragment so every generation task carries the same ban.
export const NO_DASH_RULE =
  'Never use em dashes (—) or en dashes (–) anywhere in your output. Use commas, periods, colons, or hyphens instead.'
