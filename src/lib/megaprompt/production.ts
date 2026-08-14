// Ported from BreezyScript scriptContextPro.ts — keep prompt text byte-faithful; do not edit wording casually.
//
// Per-video composers: concept, title variants, thumbnails, interview, package,
// draft (+ draft budget), metadata — plus the brain-dump serialization and the
// interview-meter answer classification (from scriptsPro.ts). All pure and
// synchronous; DB context arrives via PromptContext.

import type {
  ComposedProPrompt, ComposedStreamPrompt, DraftPromptOpts, DraftBudget,
  InterviewAnswerStatus, TitleShapeGuide, ChosenThumbnail,
} from './types'
import type { PromptContext } from './context'
import { titlePatternLines, renderLibraryContext } from './context'
import { OPERATING_RULES, SCRIPT_PROSE_STYLE, strArray, snippetBlock } from './shared'
import { estimateTokens, clampInput, clampToFit, DEEP_NUM_CTX, QUICK_NUM_CTX } from './tokenBudget'

// ─── video-concept-generator ────────────────────────────────────────────────────

const conceptSchema = {
  type: 'object',
  properties: {
    video_concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          working_title:     { type: 'string' },
          description_angle: { type: 'string' },
          audience_gap:      { type: 'string' },
          scores: {
            type: 'object',
            properties: { audience_fit: { type: 'number' }, shape_strength: { type: 'number' }, differentiation: { type: 'number' } },
          },
          rationale: { type: 'string' },
        },
        required: ['working_title', 'description_angle', 'audience_gap'],
      },
    },
    rejected: {
      type: 'array',
      items: { type: 'object', properties: { idea: { type: 'string' }, reason: { type: 'string' } }, required: ['idea', 'reason'] },
    },
  },
  required: ['video_concepts'],
}

export function composeConceptPrompt(
  ctx: PromptContext, count: number, extraNotes: string
): ComposedProPrompt {
  const identity = ctx.identity
  const aud = ctx.audienceSnippet
  const fw  = ctx.frameworkSnippet
  const tpl = titlePatternLines(ctx.titlePatterns)
  const system =
    'You are a video concept generator for BreezyScriptPro. Produce a ranked set ' +
    'of VideoConcepts. Each is a specific angle on a REAL audience gap (fear / ' +
    'desire / unanswered question), expressed through a PROVEN title shape. Reject ' +
    'generic, topic-only ideas ("Tips for X"). Vary the shapes used. The ' +
    'description_angle is the promise + the curiosity it opens. Never spoil the ' +
    'payoff. Score each on audience_fit, shape_strength, differentiation (1-5). ' +
    OPERATING_RULES
  const user =
    snippetBlock('IDENTITY', identity) + snippetBlock('AUDIENCE', aud) + snippetBlock('FRAMEWORK', fw) +
    (tpl ? `\nPROVEN TITLE SHAPES (fit concepts to these; vary them):\n${tpl}\n` : '') +
    (extraNotes.trim() ? `\nCreator constraints / seed ideas:\n${extraNotes.trim()}\n` : '') +
    `\nGenerate ${count} ranked video concepts as JSON.`
  return { system, user, taskKey: 'scriptpro.concept', maxTokens: 1800, schema: conceptSchema }
}

// ─── title-variant-generator ────────────────────────────────────────────────────

const titleVariantsSchema = {
  type: 'object',
  properties: {
    titles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text:     { type: 'string' },
          triggers: strArray,
          scores: {
            type: 'object',
            properties: {
              curiosity: { type: 'number' }, promise_clarity: { type: 'number' },
              tension: { type: 'number' }, specificity: { type: 'number' }, native_fit: { type: 'number' },
            },
          },
          rationale: { type: 'string' },
        },
        required: ['text'],
      },
    },
    rejected: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, note: { type: 'string' } }, required: ['text', 'note'] } },
  },
  required: ['titles'],
}

export function composeTitleVariantsPrompt(
  ctx: PromptContext, workingTitle: string, descriptionAngle: string, count: number,
  shapes?: TitleShapeGuide[]
): ComposedProPrompt {
  const aud = ctx.audienceSnippet
  // When the user targets specific shapes, steer on-shape (honoring each shape's
  // psychology); otherwise fall back to the project's mined title patterns.
  const targeted = !!(shapes && shapes.length)
  let shapeBlock: string
  if (targeted) {
    shapeBlock = 'TARGET SHAPES: spread the titles ACROSS these shapes, honoring each shape\'s mechanism. ' +
      'Treat the patterns as inspiration: fill the {slots} with the concept, do not copy them verbatim.\n\n' +
      shapes!.map(s =>
        `### ${s.name}\nWhy it works: ${s.mechanism}` +
        (s.patterns.length ? `\nPatterns:\n${s.patterns.map(p => `- ${p}`).join('\n')}` : '')
      ).join('\n\n') + '\n'
  } else {
    const lines = titlePatternLines(ctx.titlePatterns)
    shapeBlock = lines ? `PROVEN TITLE SHAPES:\n${lines}\n` : ''
  }
  const system =
    'You are a title-variant generator for BreezyScriptPro. From one concept, ' +
    (targeted
      ? 'generate concrete title candidates spread across the TARGET SHAPES. '
      : 'generate concrete title candidates across SEVERAL different proven shapes. ') +
    'Real variety, not rephrasings. Default rules: singular focus, ≤ ~70 chars, no ' +
    'conjunctions ("and"), open a curiosity gap, never spoil the payoff, prefer ' +
    'concrete specifics. Use the audience\'s vernacular where natural. Score each ' +
    'on curiosity, promise_clarity, tension, specificity, native_fit (1-5). ' +
    OPERATING_RULES
  const user =
    snippetBlock('AUDIENCE', aud) +
    (shapeBlock ? `\n${shapeBlock}` : '') +
    `\nCONCEPT\nWorking title: ${workingTitle}\nAngle: ${descriptionAngle}\n\n` +
    `Generate ${count} varied, scored title candidates as JSON.`
  return { system, user, taskKey: 'scriptpro.titles', maxTokens: 1600, schema: titleVariantsSchema }
}

// ─── thumbnail-concept-generator ─────────────────────────────────────────────────

const thumbnailSchema = {
  type: 'object',
  properties: {
    thumbnail_concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          direction:          { type: 'string' },
          depicts:            { type: 'string' },
          focal_subject:      { type: 'string' },
          text_overlay:       { type: 'string' },
          expression_emotion: { type: 'string' },
          color_contrast:     { type: 'string' },
          complements_title:  { type: 'string' },
          ab_note:            { type: 'string' },
        },
        required: ['direction', 'depicts', 'complements_title'],
      },
    },
  },
  required: ['thumbnail_concepts'],
}

export function composeThumbnailPrompt(
  ctx: PromptContext, chosenTitle: string, descriptionAngle: string
): ComposedProPrompt {
  const aud = ctx.audienceSnippet
  const system =
    'You are a thumbnail concept generator for BreezyScriptPro. Produce thumbnail ' +
    'briefs (text, not rendered images) that COMPLEMENT the title. Show or imply ' +
    'what the title withholds so title + thumbnail open one curiosity gap together. ' +
    'Never just restate the title. For each: focal subject, what it depicts, ≤4-word ' +
    'overlay (or none), expression, color/contrast scroll-stopper, and the explicit ' +
    'interplay "title says X; thumbnail shows Y; gap = Z". Give 2-3 genuinely ' +
    'different A/B directions. ' + OPERATING_RULES
  const user =
    snippetBlock('AUDIENCE', aud) +
    `\nSelected title: ${chosenTitle}\nAngle: ${descriptionAngle}\n\n` +
    'Generate distinct thumbnail concepts as JSON.'
  return { system, user, taskKey: 'scriptpro.thumbnail', maxTokens: 1400, schema: thumbnailSchema }
}

// ─── brain-dump-interviewer ──────────────────────────────────────────────────────

const interviewSchema = {
  type: 'object',
  properties: {
    promise: { type: 'string' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, type: { type: 'string' }, facet: { type: 'string' }, q: { type: 'string' } },
        required: ['type', 'q'],
      },
    },
  },
  required: ['questions'],
}

export function composeInterviewPrompt(
  ctx: PromptContext, chosenTitle: string, thumbnailBrief: string, count: number
): ComposedProPrompt {
  const aud = ctx.audienceSnippet
  const fw  = ctx.frameworkSnippet
  const system =
    'You are a brain-dump interviewer for BreezyScriptPro. Imagine a sharp ' +
    'journalist interviewing the creator for a book on THIS exact topic. Produce ' +
    `${count} open-ended, concept-specific questions (never yes/no, never generic ` +
    'to the niche), each tagged with a type (informative, opinion, personal_story, ' +
    'third_party_narrative, case_study, problem_solving) and a facet. Spread across ' +
    'all types and many distinct facets; include the contrarian and "walk me through ' +
    'a hard case" questions. Order as a natural interview. The creator\'s answers ' +
    'become the brain dump for the script. ' + OPERATING_RULES
  const user =
    snippetBlock('AUDIENCE', aud) + snippetBlock('FRAMEWORK', fw) +
    `\nLOCKED PROMISE\nTitle: ${chosenTitle}\nThumbnail: ${thumbnailBrief || '(none)'}\n\n` +
    `Generate ${count} questions as JSON.`
  return { system, user, taskKey: 'scriptpro.interview', maxTokens: 2200, schema: interviewSchema }
}

// ─── package-generator (Phase B: fused title + description + thumbnail + questions) ─
// One megaprompt that replaces the separate title-variant / thumbnail / interview-
// question round-trips: the creator's AI returns, in a single JSON reply, scored
// title candidates + a working video description + thumbnail briefs + guiding
// brain-dump questions. The deterministic human steps (pick ≤3 titles / star the
// main / set length; pick a thumbnail; answer the questions) stay in the app.

const packageSchema = {
  type: 'object',
  properties: {
    // Same shape as the standalone title-variant contract → stored to title_candidates.
    titles: titleVariantsSchema.properties.titles,
    // A WORKING description for packaging/framing (phase ③ finalizes it later).
    description: {
      type: 'object',
      properties: { first_line: { type: 'string' }, body: { type: 'string' }, notes: { type: 'string' } },
      required: ['first_line', 'body'],
    },
    // Thumbnail briefs → thumbnail_candidates. Kept to the load-bearing fields.
    thumbnails: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          direction:         { type: 'string' },
          depicts:           { type: 'string' },
          complements_title: { type: 'string' },
          text_overlay:      { type: 'string' },
        },
        required: ['direction', 'depicts', 'complements_title'],
      },
    },
    // Guiding brain-dump questions → seed interview_json (empty answers).
    questions: {
      type: 'array',
      items: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
    },
  },
  required: ['titles', 'description', 'thumbnails', 'questions'],
}

export function composePackagePrompt(
  ctx: PromptContext,
  opts: {
    workingTitle: string; descriptionAngle: string
    titleCount?: number; questionCount?: number
    shapes?: TitleShapeGuide[]
  }
): ComposedProPrompt {
  const identity = ctx.identity
  const persona  = ctx.personaSnippet
  const aud      = ctx.audienceSnippet
  const fw        = ctx.frameworkSnippet
  const titleCount    = opts.titleCount ?? 8
  const questionCount = opts.questionCount ?? 12
  // When the user targets specific shapes, steer on-shape (same block as
  // composeTitleVariantsPrompt); otherwise fall back to the mined title patterns.
  const targeted = !!(opts.shapes && opts.shapes.length)
  let shapeBlock: string
  if (targeted) {
    shapeBlock = 'TARGET SHAPES: spread the titles ACROSS these shapes, honoring each shape\'s mechanism. ' +
      'Treat the patterns as inspiration: fill the {slots} with the concept, do not copy them verbatim.\n\n' +
      opts.shapes!.map(s =>
        `### ${s.name}\nWhy it works: ${s.mechanism}` +
        (s.patterns.length ? `\nPatterns:\n${s.patterns.map(p => `- ${p}`).join('\n')}` : '')
      ).join('\n\n') + '\n'
  } else {
    const lines = titlePatternLines(ctx.titlePatterns)
    shapeBlock = lines ? `PROVEN TITLE SHAPES:\n${lines}\n` : ''
  }
  const system =
    'You are a video packaging generator for BreezyScriptPro. From ONE concept, ' +
    'produce a complete packaging kit in a single JSON reply, encapsulating the ' +
    'creator\'s identity, voice, audience and framework:\n' +
    `1) TITLES: ${titleCount} concrete, scored title candidates ` +
    (targeted ? 'spread across the TARGET SHAPES' : 'across SEVERAL different proven shapes') +
    ' (real variety, not rephrasings). Rules: singular focus, ≤ ~70 chars, no ' +
    'conjunctions ("and"), open a curiosity gap, never spoil the payoff, prefer ' +
    'concrete specifics, use the audience\'s vernacular where natural. Score each ' +
    'on curiosity, promise_clarity, tension, specificity, native_fit (1-5).\n' +
    '2) DESCRIPTION: a WORKING video description (first_line + body) for framing ' +
    'the video: the first_line compliments the strongest title and opens a NEW ' +
    'curiosity gap the video pays off, revealing no answers; the body is natural ' +
    'and on-voice and states none of the payoffs. This is a working draft. The ' +
    'final SEO description is generated later from the finished script.\n' +
    '3) THUMBNAILS: 2-3 genuinely different A/B thumbnail briefs (text, not ' +
    'rendered images) that COMPLEMENT the STRONGEST title you propose (no title is ' +
    'chosen yet, pick the one you\'d lead with): show or imply what that title ' +
    'withholds so title + thumbnail open one curiosity gap together, never restate ' +
    'the title. For each: a direction, what it depicts, an optional ≤4-word ' +
    'overlay, and the explicit interplay in complements_title ("title says X; ' +
    'thumbnail shows Y; gap = Z").\n' +
    `4) QUESTIONS: ${questionCount} open-ended, concept-specific brain-dump ` +
    'questions (never yes/no, never generic to the niche) that pull the real ' +
    'substance, stories and opinions out of the creator for THIS exact video; the ' +
    'creator\'s answers become the brain dump the script is written from. ' +
    OPERATING_RULES
  const user =
    snippetBlock('IDENTITY', identity) + snippetBlock('PERSONA', persona) +
    snippetBlock('AUDIENCE', aud) + snippetBlock('FRAMEWORK', fw) +
    (shapeBlock ? `\n${shapeBlock}` : '') +
    `\nCONCEPT\nWorking title: ${opts.workingTitle}\nAngle: ${opts.descriptionAngle}\n\n` +
    'Produce the packaging JSON (titles, description, thumbnails, questions).'
  return { system, user, taskKey: 'scriptpro.package', maxTokens: 2600, schema: packageSchema }
}

// ─── script-blueprint-drafter (streaming, free-form markdown) ───────────────────

// The A/B-title packaging block: instructs the AI to write ONE script that
// delivers the MAIN title's promise, treating the alternates as honest
// packaging variants (not three different videos).
function packagingBlock(opts: DraftPromptOpts): string {
  const titles = (opts.titles ?? []).map(t => ({ text: t.text.trim(), main: t.main })).filter(t => t.text)
  const angleThumb = `Angle: ${opts.descriptionAngle}\nThumbnail: ${opts.thumbnailBrief || '(none)'}\n`
  if (titles.length <= 1) {
    return `\nPACKAGING\nTitle: ${titles[0]?.text || opts.chosenTitle}\n${angleThumb}`
  }
  const main = titles.find(t => t.main) ?? titles[0]
  const alts = titles.filter(t => t !== main)
  return '\nPACKAGING: A/B TITLE TEST (these are packaging variants of the SAME video, not three different videos; ' +
    'write ONE script that delivers the MAIN title\'s promise end-to-end; the alternates are thumbnail/title tests ' +
    'and must stay honest to the same content):\n' +
    `MAIN TITLE (the through-line the script must deliver): ${main.text}\n` +
    `Alternate titles (same promise, different framing): ${alts.map(t => t.text).join(' · ')}\n` +
    angleThumb
}

// An explicit spoken-length target as a word range, so the AI paces to fit
// instead of guessing. LLMs miss exact counts — give a range, not a number.
function lengthBlock(opts: DraftPromptOpts, wpmIn: number): string {
  const mins = opts.targetMinutes ?? 0
  if (!mins || mins <= 0) return ''
  const wpm = wpmIn && wpmIn > 0 ? wpmIn : 150
  const mid = mins * wpm
  const low = Math.round((mid * 0.85) / 50) * 50
  const high = Math.round((mid * 1.15) / 50) * 50
  return `\nTARGET LENGTH: ~${mins} min spoken (~${low.toLocaleString()} to ${high.toLocaleString()} words). ` +
    'Pace the whole script to land in this range. Expand or compress sections to fit, never pad or filler.\n'
}

// Everything in the draft prompt EXCEPT the brain dump. Shared by
// composeDraftPrompt and computeDraftBudget so the budget meter can never
// drift from what the real prompt actually costs.
function draftFixedParts(ctx: PromptContext, opts: DraftPromptOpts): { system: string; head: string; maxTokens: number } {
  const identity = ctx.identity
  const persona = ctx.personaSnippet
  const aud     = ctx.audienceSnippet
  const fw      = ctx.frameworkSnippet
  // Output budget scales with the chosen format so input+output fits num_ctx.
  const OUT_BY_FORMAT: Record<string, number> = { shorts: 800, medium: 2200, long: 3600, podcast: 4096 }
  const maxTokens = OUT_BY_FORMAT[opts.format] ?? 2600
  const system =
    'You are a script blueprint drafter for BreezyScriptPro. Turn the creator\'s ' +
    'BRAIN DUMP into a structured, retention-optimized first draft. This is ' +
    'AUGMENTATION, not invention: the brain dump is the source of all substance, ' +
    'claims, and stories. Never fabricate facts the creator didn\'t provide. ' +
    'Open with a strong hook you write from the brain dump and the title\'s ' +
    'promise: validate the click in the first lines, set the stakes, and ' +
    'transition into the video without spoiling the payoff. Deliver the ' +
    'channel\'s framework and honor its ' +
    'non-negotiables. Write in the creator\'s voice and the audience\'s awareness ' +
    'level. Keep the central loop open. Never spoil the title/thumbnail answer ' +
    'before its planned payoff. Where the brain dump is too thin for a needed ' +
    'section, write a clearly-marked [GAP: …] note rather than inventing. Output ' +
    'clean markdown with section headings; the script only. ' + SCRIPT_PROSE_STYLE
  const library = opts.structureNotes ?? renderLibraryContext(ctx)
  // Everything except the brain dump, assembled first so the dump can be budgeted
  // against the real remaining window (snippets + library + packaging stack up).
  const head =
    snippetBlock('IDENTITY', identity) + snippetBlock('PERSONA', persona) + snippetBlock('AUDIENCE', aud) + snippetBlock('FRAMEWORK', fw) +
    packagingBlock(opts) +
    (library ? `\n${library}\n` : '') +
    (opts.knowledgeBlock ? `\n${opts.knowledgeBlock}\n` : '') +
    `\nFORMAT: ${opts.format}${lengthBlock(opts, ctx.wordsPerMinute)}\n`
  return { system, head, maxTokens }
}

export function composeDraftPrompt(ctx: PromptContext, opts: DraftPromptOpts): ComposedStreamPrompt {
  const { system, head, maxTokens } = draftFixedParts(ctx, opts)
  const dump = clampToFit(opts.brainDump.trim(), DEEP_NUM_CTX, system + head, maxTokens)
  const user = head +
    (dump ? `\nBRAIN DUMP (the substance: organize, sequence, tighten; invent nothing):\n${dump}\n` : '\n(No brain dump provided. Flag that substance is missing.)\n') +
    '\nWrite the full script now.'
  return { system, user, taskKey: 'scriptpro.draft', maxTokens }
}

export function computeDraftBudget(ctx: PromptContext, opts: DraftPromptOpts): DraftBudget {
  const { system, head, maxTokens } = draftFixedParts(ctx, opts)
  const budgetTokens = Math.max(0, DEEP_NUM_CTX - maxTokens - estimateTokens(system + head) - 200)
  const dumpTokens = estimateTokens(opts.brainDump.trim())
  return { budgetTokens, dumpTokens, cutoffChar: dumpTokens <= budgetTokens ? null : budgetTokens * 4 }
}

// ─── Interview → brain dump serialization + budget meter (from scriptsPro.ts) ───

// Serialize the answered interview questions into the brain dump the draft
// prompt consumes: `Q: …\nA: …` blocks joined by '\n\n' (unanswered skipped).
export function serializeBrainDump(interview: { q: string; a: string }[]): string {
  return interview.filter(x => x.a?.trim()).map(x => `Q: ${x.q}\nA: ${x.a}`).join('\n\n')
}

// The thumbnail brief string fed to prompts: the chosen thumbnail's interplay
// line, falling back to what it depicts. Mirrors scriptsPro.ts brief(row).
export function thumbnailBrief(t: ChosenThumbnail | null | undefined): string {
  if (!t) return ''
  return t.complementsTitle || t.depicts || ''
}

// Walk the composed dump (same `Q: …\nA: …` blocks joined by '\n\n' as
// serializeBrainDump) and classify each answered question against the cutoff
// from computeDraftBudget. Mirrors scriptsPro.ts draftBudget's walk exactly.
export function classifyInterviewAnswers(
  qs: { q: string; a: string }[], cutoffChar: number | null
): InterviewAnswerStatus[] {
  let pos = 0
  return qs.map((x, index) => {
    if (!x.a?.trim()) return { index, status: 'empty' as const }
    const block = `Q: ${x.q}\nA: ${x.a}`
    const start = pos
    const end   = pos + block.length
    pos = end + 2   // '\n\n' separator
    const cut = cutoffChar
    const status = cut === null ? 'full' as const
      : end <= cut ? 'full' as const
      : start >= cut ? 'cut' as const
      : 'partial' as const
    return { index, status }
  })
}

// ─── youtube-metadata-generator ──────────────────────────────────────────────────

const metadataSchema = {
  type: 'object',
  properties: {
    description: {
      type: 'object',
      properties: { first_line: { type: 'string' }, body: { type: 'string' }, notes: { type: 'string' } },
      required: ['first_line', 'body'],
    },
    chapters: {
      type: 'array',
      items: { type: 'object', properties: { timestamp: { type: 'string' }, title: { type: 'string' } }, required: ['timestamp', 'title'] },
    },
    tags: strArray,
  },
  required: ['description', 'tags'],
}

// The starred default description template (ctx.descriptionTemplateBody) shapes
// the description's structure and voice.
export function composeMetadataPrompt(
  ctx: PromptContext, chosenTitle: string, thumbnailBriefText: string, draft: string
): ComposedProPrompt {
  const script = clampInput(draft.trim(), 1500, QUICK_NUM_CTX)
  const system =
    'You are a YouTube metadata generator for BreezyScriptPro. From the finished ' +
    'script, write description + chapters + tags. SEO-aware but curiosity-' +
    'preserving. The description FIRST LINE compliments the title/thumbnail and ' +
    'opens a NEW curiosity gap the video pays off, revealing NO main points. The ' +
    'body is natural and findable but states none of the answers. Chapter titles ' +
    'intrigue without spoiling and map to real sections (00:00 start, ascending). ' +
    'Tags are tight and relevant. No stuffing. ' + OPERATING_RULES
  const tmpl = ctx.descriptionTemplateBody.trim()
  const user =
    `Title: ${chosenTitle}\nThumbnail: ${thumbnailBriefText || '(none)'}\n\nSCRIPT:\n"""\n${script || '(none)'}\n"""\n\n` +
    (tmpl ? `DESCRIPTION TEMPLATE: mirror this structure and voice (adapt the substance to this video):\n"""\n${tmpl}\n"""\n\n` : '') +
    'Produce the metadata JSON.'
  return { system, user, taskKey: 'scriptpro.metadata', maxTokens: 1400, schema: metadataSchema }
}
