// Ported from BreezyScript scriptContextPro.ts — keep prompt text byte-faithful; do not edit wording casually.
//
// Token budgeting for composed megaprompts.
//
// The compose functions assemble several asset snippets into one prompt; this
// helper keeps the assembled prompt inside a sane budget by dropping the
// lowest-priority sections first, so the front of the prompt (identity,
// audience, framework) is never the part that gets crowded out.

export interface PromptSection {
  key:      string   // stable id, used in the trimmed-sections log
  text:     string   // the section body
  priority: number   // higher = more important; kept first when trimming
}

export interface FitResult {
  prompt:  string     // assembled prompt that fits the budget
  trimmed: string[]   // keys of sections that were dropped to fit
  tokens:  number     // estimated tokens of the assembled prompt
}

// Cheap heuristic — ~4 chars per token is close enough for budgeting. We never
// need exact counts here, only "are we comfortably under the window".
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Assemble the highest-priority sections first; drop the lowest-priority ones
// until the prompt fits `numCtx - reservedForOutput`. Sections are joined with a
// blank line in their ORIGINAL order (trimming changes which survive, not the
// reading order of those that do).
export function fitToBudget(
  sections: PromptSection[],
  numCtx: number,
  reservedForOutput: number
): FitResult {
  const budget = Math.max(0, numCtx - reservedForOutput)

  // Decide what to keep by descending priority, but assemble in original order.
  const byPriority = sections
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.priority - a.s.priority || a.i - b.i)

  const keep    = new Set<number>()
  const trimmed: string[] = []
  let used = 0

  for (const { s, i } of byPriority) {
    const cost = estimateTokens(s.text) + 1 // +1 for the joining separator
    if (used + cost <= budget) {
      keep.add(i)
      used += cost
    } else {
      trimmed.push(s.key)
    }
  }

  const prompt = sections
    .filter((_, i) => keep.has(i))
    .map(s => s.text)
    .join('\n\n')

  return { prompt, trimmed, tokens: estimateTokens(prompt) }
}

// ─── Prompt-size budgets (from scriptContextPro.ts) ─────────────────────────────
// Replies now run in the creator's own frontier AI (Phase 9), so these are no
// longer model context windows — they keep the pasteable prompt at a size a
// human can sanity-check and any chat box accepts, and stop it growing without
// bound as assets accumulate.
export const DEEP_NUM_CTX  = 24576
export const QUICK_NUM_CTX = 8192

// Trim pasted input to fit `numCtx - reserveForOutput - systemOverhead`.
export function clampInput(text: string, reserveForOutput: number, numCtx: number): string {
  const budgetTokens = numCtx - reserveForOutput - 500 // ~500 tokens of system/scaffold
  if (budgetTokens <= 0) return ''
  if (estimateTokens(text) <= budgetTokens) return text
  return text.slice(0, budgetTokens * 4).trimEnd() + '\n\n…[input trimmed to keep the prompt a reasonable size]'
}

// Trim `text` so that the already-assembled `fixedPrompt` (system + the rest of
// the user prompt: snippets, packaging, library, etc.) PLUS the trimmed text PLUS
// `maxOutput` all fit inside `numCtx`. This counts the stacked snippets, which a
// flat reserve does not — preventing silent overflow when several snippets stack.
export function clampToFit(text: string, numCtx: number, fixedPrompt: string, maxOutput: number): string {
  const budget = numCtx - maxOutput - estimateTokens(fixedPrompt) - 200
  if (budget <= 0) return ''
  if (estimateTokens(text) <= budget) return text
  return text.slice(0, budget * 4).trimEnd() + '\n\n…[trimmed to keep the prompt a reasonable size]'
}
