// Ported from BreezyScript scriptContextPro.ts — keep prompt text byte-faithful; do not edit wording casually.
//
// Reusable-library composers (video structures, CTAs & disclosures) and the
// performance-feedback analyzer. All pure and synchronous.

import type { ComposedProPrompt, FeedbackResult } from './types'
import type { PromptContext } from './context'
import { titlePatternLines } from './context'
import { OPERATING_RULES, strArray, bullets, snippetBlock } from './shared'
import { clampInput, clampToFit, QUICK_NUM_CTX } from './tokenBudget'

// ─── Reusable libraries: video structures ───────────────────────────────────────

const sectionItem = { type: 'object', properties: { beat: { type: 'string' }, job: { type: 'string' } }, required: ['beat', 'job'] }
const videoStructureSchema = {
  type: 'object',
  properties: {
    video_structures: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:        { type: 'string' },
          format_type: { type: 'string' },
          sections:    { type: 'array', items: sectionItem },
          retention_mechanics: {
            type: 'object',
            properties: { open_loops: strArray, re_hooks: strArray, payoffs: strArray },
          },
          pacing_notes: { type: 'string' },
          best_for:     { type: 'string' },
        },
        required: ['name', 'sections'],
      },
    },
  },
  required: ['video_structures'],
}

export function composeVideoStructurePrompt(sourceInput: string, single = false): ComposedProPrompt {
  const src = clampInput(sourceInput.trim(), 1600, QUICK_NUM_CTX)
  const system =
    'You are a video structure definer for BreezyScriptPro. Build reusable, end-to-' +
    'end video blueprints (NOT a script). For each: a format_type, ordered sections ' +
    'with the explicit retention JOB of each beat, and where open loops / re-hooks / ' +
    'payoffs land. Keep formats distinct and topic-agnostic. ' +
    // Single mode powers the modal's "Optimize with AI": one blueprint, never split.
    (single ? 'The material describes ONE structure. Return exactly one video_structure, refining the provided beats rather than replacing them. ' : '') +
    OPERATING_RULES
  const user =
    `Creator preferences and/or example/outlier videos:\n"""\n${src || '(none: seed from proven formats and note it)'}\n"""\n\n` +
    'Produce the video_structures JSON.'
  return { system, user, taskKey: 'scriptpro.structure', maxTokens: 1800, schema: videoStructureSchema }
}

// ─── Reusable libraries: CTAs & disclosures ─────────────────────────────────────

const ctaSchema = {
  type: 'object',
  properties: {
    ctas: {
      type: 'array',
      items: {
        type: 'object',
        properties: { goal: { type: 'string' }, text_variants: strArray, placement: strArray, tone: { type: 'string' }, when_to_use: { type: 'string' } },
        required: ['goal', 'text_variants'],
      },
    },
    disclosures: {
      type: 'array',
      items: {
        type: 'object',
        properties: { type: { type: 'string' }, required_context: { type: 'string' }, text: { type: 'string' }, placement: strArray },
        required: ['type', 'text'],
      },
    },
  },
  required: ['ctas', 'disclosures'],
}

export function composeCtaPrompt(sourceInput: string, single?: 'cta' | 'disclosure'): ComposedProPrompt {
  const src = clampInput(sourceInput.trim(), 1200, QUICK_NUM_CTX)
  const system =
    'You are a CTA & disclosure normalizer for BreezyScriptPro. Turn the raw text ' +
    'into reusable records. CTAs: classify goal (subscribe | comment | link_click | ' +
    'lead_magnet | product | community | watch_next), give clean short/longer ' +
    'variants (invent no claims), tag placement (intro | mid | outro) and when to ' +
    'use. Disclosures: classify type (sponsorship | affiliate | ai_use | medical | ' +
    'financial | earnings | own_product | other), preserve the wording EXACTLY ' +
    '(never soften or strengthen legal meaning), tag placement. This is not legal ' +
    'advice. ' +
    // Single mode powers the modal's "Optimize with AI": one item, never split.
    (single ? `The material is ONE ${single === 'cta' ? 'call to action. Return exactly one entry in ctas and leave disclosures empty' : 'disclosure. Return exactly one entry in disclosures and leave ctas empty'}. ` : '') +
    OPERATING_RULES
  const user =
    `Raw CTA / disclosure text:\n"""\n${src || '(none)'}\n"""\n\nProduce the JSON (use empty arrays for the kind not present).`
  return { system, user, taskKey: 'scriptpro.cta', maxTokens: 1200, schema: ctaSchema }
}

// ─── performance-feedback-analyzer (Phase 5) ────────────────────────────────────

const feedbackSchema = {
  type: 'object',
  properties: {
    diagnosis: { type: 'object', properties: { primary: { type: 'string' }, reasoning: { type: 'string' } } },
    new_comment_signals:       strArray,
    proposed_audience_updates: strArray,
    proposed_template_reranks: {
      type: 'array',
      items: { type: 'object', properties: { template: { type: 'string' }, direction: { type: 'string' }, reason: { type: 'string' } }, required: ['template', 'direction'] },
    },
    recommended_experiment: { type: 'string' },
    confidence:             { type: 'string' },
  },
  required: ['diagnosis', 'recommended_experiment'],
}

export function composeFeedbackPrompt(ctx: PromptContext, opts: {
  title: string; metrics: string; comments: string
}): ComposedProPrompt {
  const aud = ctx.audienceSnippet
  const tpl = titlePatternLines(ctx.titlePatterns, 15)
  const maxTokens = 1600
  const system =
    'You are a performance-feedback analyzer for BreezyScriptPro. Diagnose a ' +
    'published video with funnel logic: low CTR → packaging/shape problem; high CTR ' +
    '+ low early AVD → hook/promise mismatch; good early AVD + mid drop → pacing/' +
    'structure; high CTR + high AVD → what worked (say why). Cite the actual numbers; ' +
    'do not overclaim on thin data. Then PROPOSE (do not apply) specific, evidence-' +
    'tied updates to the audience profile and re-ranks of the title shapes used, plus ' +
    'one concrete next experiment. ' + OPERATING_RULES
  const head =
    snippetBlock('AUDIENCE', aud) +
    (tpl ? `\nTITLE SHAPES IN PLAY:\n${tpl}\n` : '') +
    `\nVIDEO: ${opts.title}\nMETRICS: ${opts.metrics}\n`
  const comments = clampToFit(opts.comments.trim(), QUICK_NUM_CTX, system + head, maxTokens)
  const user = head + (comments ? `\nNEW COMMENTS:\n"""\n${comments}\n"""\n` : '') + '\nProduce the PerformanceReport JSON (proposals only).'
  return { system, user, taskKey: 'scriptpro.feedback', maxTokens, schema: feedbackSchema }
}

export function renderFeedbackMarkdown(metrics: string, r: FeedbackResult): string {
  const reranks = (r.proposed_template_reranks ?? []).map(x => `- **${x.template}** → ${x.direction}${x.reason ? `: ${x.reason}` : ''}`).join('\n') || '_None._'
  return `# Performance Feedback

**Metrics:** ${metrics}

## Diagnosis: ${r.diagnosis?.primary || 'N/A'}
${r.diagnosis?.reasoning || 'N/A'}

## New Comment Signals
${bullets(r.new_comment_signals)}

## Proposed Audience Updates _(approve before applying)_
${bullets(r.proposed_audience_updates)}

## Proposed Title-Shape Re-ranks _(approve before applying)_
${reranks}

## Next Experiment
${r.recommended_experiment || 'N/A'}

## Confidence
${r.confidence || 'N/A'}`
}
