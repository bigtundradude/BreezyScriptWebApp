// Ported from BreezyScript scriptContextPro.ts — keep prompt text byte-faithful; do not edit wording casually.
//
// PromptContext replaces the desktop app's inline async SQLite gatherers
// (defaultSnippet, gatherIdentityContext, titlePatternLines, gatherLibraryContext,
// clarity reads). The web caller loads/derives these fields however it likes and
// hands them to the pure, synchronous composers. The render helpers below emit
// prompt text IDENTICAL to what the desktop gatherers produced from the DB.

export interface TitlePatternEntry {
  pattern:  string
  triggers: string[]
}

export interface DefaultStructureContext {
  name:       string
  formatType: string
  sections:   { beat: string; job: string }[]
  retentionMechanics?: { openLoops?: string[]; reHooks?: string[]; payoffs?: string[] }
  pacingNotes: string
  bestFor?:    string
}

export interface CtaOrDisclosureEntry {
  kind:    'cta' | 'disclosure'
  title:   string
  summary: string
}

export interface PromptContext {
  // Free text; replaces the desktop clarity IDENTITY block; '' omits the block.
  // When non-empty it is used VERBATIM as the IDENTITY section body (the user
  // writes this text themselves — no Brand:/Who they are: reconstruction).
  identity: string
  personaSnippet:   string   // default persona prompt_snippet, '' if none
  audienceSnippet:  string   // default audience prompt_snippet, '' if none
  frameworkSnippet: string   // default framework prompt_snippet, '' if none
  // Mined title shapes, already sorted by sortBoost desc, created desc, limit 25.
  titlePatterns: TitlePatternEntry[]
  // The default video structure for the library block, null if none.
  defaultStructure: DefaultStructureContext | null
  // CTAs & disclosures for the library block (kind desc, created desc, limit 12).
  ctasAndDisclosures: CtaOrDisclosureEntry[]
  wordsPerMinute: number
  // Starred description template body, '' if none — used by the metadata composer.
  descriptionTemplateBody: string
}

// The mined title shapes as compact pattern lines for prompts. Mirrors the
// desktop titlePatternLines(projectId, limit) SQL + rendering: the context's
// titlePatterns arrive pre-sorted (sort_boost DESC, created_at DESC); the limit
// is applied here so callers with a tighter cap (feedback uses 15) match.
export function titlePatternLines(patterns: TitlePatternEntry[], limit = 25): string {
  const rows = patterns.slice(0, limit)
  if (!rows.length) return ''
  return rows.map(r => {
    const trg = r.triggers.filter(x => typeof x === 'string')
    return `- ${r.pattern}${trg.length ? `  (${trg.join(', ')})` : ''}`
  }).join('\n')
}

// Library context the drafter injects: the default structure + CTAs/disclosures,
// as compact placement guidance. Mirrors the desktop gatherLibraryContext.
export function renderLibraryContext(ctx: PromptContext): string {
  const parts: string[] = []

  const s = ctx.defaultStructure
  if (s) {
    const beats = (s.sections ?? []).map(x => `- ${x.beat}: ${x.job}`).join('\n')
    parts.push(`VIDEO STRUCTURE: ${s.name}${s.formatType ? ` (${s.formatType})` : ''}:\n${beats}${s.pacingNotes ? `\nPacing: ${s.pacingNotes}` : ''}`)
  }

  // NOTE: stories are deliberately NOT auto-included here anymore. The user
  // hand-picks them on the "Stories & notes" step, which inserts them as
  // brain-dump blocks — explicit substance, never silent context.

  const ctas = ctx.ctasAndDisclosures
  if (ctas.length) {
    const lines = ctas.map(r => `- [${r.kind}] ${r.title}: ${r.summary}`).join('\n')
    parts.push(`CTAs & DISCLOSURES (place at their tagged spots; keep disclosure wording exact):\n${lines}`)
  }

  return parts.join('\n\n')
}
