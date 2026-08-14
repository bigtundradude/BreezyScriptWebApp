// Ported from BreezyScript scriptContextPro.ts — keep prompt text byte-faithful; do not edit wording casually.
//
// Shared prose constants, schema helpers, and the megaprompt merge layer.

import type { ComposedProPrompt } from './types'

// ─── Shared bits ───────────────────────────────────────────────────────────────

export const strArray = { type: 'array', items: { type: 'string' } }

export const OPERATING_RULES =
  'Rules: be specific and use the creator\'s own words; never invent traits or ' +
  'facts the input does not support; where evidence is thin, say so in needs_input ' +
  'rather than guessing. Output ONLY a single JSON object. No preamble, no prose, ' +
  'no markdown fences.'

export function bullets(items: string[] | undefined): string {
  if (!items?.length) return '_None captured._'
  return items.map(i => `- ${i}`).join('\n')
}

// Voice-NEUTRAL conventions for ANY content that gets spoken aloud (hooks, the
// script). These shape how copy reads off a teleprompter; they are NOT vocabulary
// or identity choices. Persona-specific rules — banned words, signature sign-offs,
// name/opsec/channel-separation — belong in the persona snippet (its signature_
// phrases / avoid fields), never here, so they stay per-creator.
//
// SPOKEN_PUNCTUATION applies to every spoken-prose output; SCRIPT_PROSE_STYLE adds
// teleprompter paragraph structure on top and is for multi-paragraph scripts only.
export const SPOKEN_PUNCTUATION =
  'Punctuation for spoken delivery: never use em dashes; use a comma or an ellipsis ' +
  'instead. Use ellipses only at real pause points. A mid-sentence trail-off is ' +
  'written "... " (three dots then a single space, then continue). A rhetorical ' +
  'question that lands on a beat puts the dots AFTER the question mark ' +
  '("...what is it all for?..."). Use a single space after an ellipsis, never ' +
  'double spaces or tabs.'

export const SCRIPT_PROSE_STYLE =
  'Teleprompter formatting: keep paragraphs to 1-2 sentences (3 only when the ' +
  'sentences are very short). Give a short, punchy line its own paragraph so it ' +
  'lands. Break long comma-chain sentences at their natural pause points instead ' +
  'of running many clauses together. ' + SPOKEN_PUNCTUATION

export function snippetBlock(label: string, snippet: string): string {
  return snippet ? `\n${label}:\n${snippet}\n` : ''
}

// ═══ The megaprompt layer ═══════════════════════════════════════════════════
// The app contains no AI. Every composed prompt is handed to the creator as ONE
// pasteable block ("Copy for your AI") ending in a strict output contract; the
// reply is pasted back and parsed leniently. The schema that used to constrain
// Ollama decoding now IS the contract — same shapes, any frontier model.

const RULE = '────────────────────────────────'

/** Merge a composed prompt into one pasteable megaprompt with a JSON contract. */
export function toMegaprompt(p: ComposedProPrompt): string {
  return `${p.system}\n\n${RULE}\n\n${p.user}\n\n${RULE}\n` +
    `OUTPUT FORMAT. Follow exactly:\n` +
    'Reply with ONLY one fenced ```json code block, with no prose before or after it, ' +
    'whose contents validate against this JSON Schema:\n\n' +
    JSON.stringify(p.schema, null, 2)
}

/** Megaprompt variant for the free-form draft (markdown out, no schema). */
export function toDraftMegaprompt(system: string, user: string): string {
  return `${system}\n\n${RULE}\n\n${user}\n\n${RULE}\n` +
    `OUTPUT FORMAT. Follow exactly:\n` +
    `Reply with ONLY the finished script in Markdown. No preamble, no commentary, ` +
    `no code fences. Just the script itself, starting with the first spoken line.`
}
