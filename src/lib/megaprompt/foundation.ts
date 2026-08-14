// Ported from BreezyScript scriptContextPro.ts — keep prompt text byte-faithful; do not edit wording casually.
//
// Foundation-skill composers (persona / audience / framework / title-shape-miner)
// plus their deterministic markdown renderers. All pure and synchronous: the
// audience snippet the framework composer consumes now arrives via PromptContext.

import type { ComposedProPrompt, PersonaResult, AudienceResult, FrameworkResult } from './types'
import type { PromptContext } from './context'
import { OPERATING_RULES, strArray, bullets } from './shared'
import { estimateTokens, clampInput, DEEP_NUM_CTX, QUICK_NUM_CTX } from './tokenBudget'

// ─── Persona (persona-voice-capture) ────────────────────────────────────────────

const personaSchema = {
  type: 'object',
  properties: {
    voice_in_three_words:  { type: 'string' },
    signature_feel:        { type: 'string' },
    signature_phrases:     strArray,
    vocabulary_level:      { type: 'string' },
    filler_words:          strArray,
    tone_register:         { type: 'string' },
    energy:                { type: 'string' },
    formality:             { type: 'string' },
    audience_relationship: { type: 'string' },
    sentence_style:        { type: 'string' },
    opens:                 { type: 'string' },
    closes:                { type: 'string' },
    contractions_grammar:  { type: 'string' },
    profanity:             { type: 'string' },
    avoid:                 strArray,
    common_mistakes:       strArray,
    prompt_snippet:        { type: 'string' },
  },
  required: [
    'voice_in_three_words', 'signature_feel', 'signature_phrases', 'tone_register',
    'sentence_style', 'avoid', 'prompt_snippet',
  ],
}

export function composePersonaPrompt(label: string, sourceInput: string): ComposedProPrompt {
  const system =
    'You are a voice analyst for BreezyScriptPro. Analyze the creator\'s writing/' +
    'speaking samples and extract a structured voice persona that, when injected ' +
    'into an AI content prompt, makes output sound authentically like this person ' +
    'rather than generic AI. Look for what is distinctively them: signature ' +
    'phrases, rhythm, openings/closings, contractions, profanity. Use their ' +
    'ACTUAL words from the samples. The prompt_snippet is the payload: a tight, ' +
    'specific block (tone, energy, 3-5 real signature phrases, sentence style, ' +
    'contractions, profanity, who to address, and an explicit NEVER list) that ' +
    'noticeably steers generation. ' + OPERATING_RULES
  const src = clampInput(sourceInput.trim(), 1600, DEEP_NUM_CTX)
  const user =
    `Persona label: ${label}\n\n` +
    `Source samples (scripts / transcripts / posts):\n"""\n${src || '(none provided)'}\n"""\n\n` +
    'Produce the persona JSON.'
  return { system, user, taskKey: 'scriptpro.persona', maxTokens: 1600, schema: personaSchema }
}

export function renderPersonaMarkdown(label: string, r: PersonaResult): string {
  return `# ${label}: Voice Persona

**Voice in three words:** ${r.voice_in_three_words || 'N/A'}

## The Signature Feel
${r.signature_feel || 'N/A'}

## Vocabulary & Lexicon
**Signature phrases:**
${bullets(r.signature_phrases)}

**Vocabulary level:** ${r.vocabulary_level || 'N/A'}
**Filler words & verbal habits:**
${bullets(r.filler_words)}

## Tone & Energy
**Register:** ${r.tone_register || 'N/A'}
**Energy:** ${r.energy || 'N/A'}
**Formality:** ${r.formality || 'N/A'}
**Audience relationship:** ${r.audience_relationship || 'N/A'}

## Pacing & Structure
**Sentence style:** ${r.sentence_style || 'N/A'}
**Opens with:** ${r.opens || 'N/A'}
**Closes with:** ${r.closes || 'N/A'}
**Contractions & grammar:** ${r.contractions_grammar || 'N/A'}
**Profanity & edge:** ${r.profanity || 'N/A'}

## Things to AVOID
${bullets(r.avoid)}

## Common Mistakes Writing in This Voice
${bullets(r.common_mistakes)}`
}

// ─── AudienceProfile (audience-profile-builder) ─────────────────────────────────

const audienceSchema = {
  type: 'object',
  properties: {
    one_line:               { type: 'string' },
    demographics:           { type: 'string' },
    sophistication_level:   { type: 'string' },
    psychographics:         strArray,
    watch_motivations:      strArray,
    core_fears:             strArray,
    aspirations:            strArray,
    unanswered_questions:   strArray,
    objections:             strArray,
    vernacular:             strArray,
    resonant_triggers:      strArray,
    top_triggers_ranked:    strArray,
    biggest_misconception:  { type: 'string' },
    anchor_emotional_truth: { type: 'string' },
    confidence:             { type: 'string' },
    needs_input:            strArray,
    prompt_snippet:         { type: 'string' },
  },
  required: [
    'one_line', 'core_fears', 'aspirations', 'resonant_triggers',
    'anchor_emotional_truth', 'prompt_snippet',
  ],
}

export function composeAudiencePrompt(label: string, sourceInput: string): ComposedProPrompt {
  const system =
    'You are an audience analyst for BreezyScriptPro. From whatever evidence the ' +
    'creator provides (audience comments, notes, outlier data), build a deep, ' +
    'evidence-anchored AudienceProfile: who the channel is really for, what moves ' +
    'them, and how they actually talk. Be honest about evidence. A profile ' +
    'invented from hopes sends every title and hook the wrong way. Pull vernacular ' +
    'verbatim from comments where present; if comments are absent, leave vernacular ' +
    'thin and list what to add in needs_input. Name only the resonant_triggers the ' +
    'evidence supports, not all of them. The prompt_snippet must be tight and ' +
    'specific: who to write for, their sharpest fears and desires, real vernacular ' +
    'phrases, the triggers to lean on, the one anchor emotional truth, and the ' +
    'misconception to never make. ' + OPERATING_RULES
  const src = clampInput(sourceInput.trim(), 1800, DEEP_NUM_CTX)
  const user =
    `Audience label: ${label}\n\n` +
    `Evidence (comments / notes / outlier data):\n"""\n${src || '(none provided)'}\n"""\n\n` +
    'Produce the AudienceProfile JSON.'
  return { system, user, taskKey: 'scriptpro.audience', maxTokens: 1800, schema: audienceSchema }
}

export function renderAudienceMarkdown(label: string, r: AudienceResult): string {
  return `# Audience Profile: ${label}

> ${r.one_line || 'N/A'}

## Who They Are
${r.demographics || 'N/A'}
**Sophistication:** ${r.sophistication_level || 'N/A'}

## What Moves Them
**Core fears:**
${bullets(r.core_fears)}
**Aspirations:**
${bullets(r.aspirations)}
**Resonant triggers (evidenced):**
${bullets(r.resonant_triggers)}

## How They Think & Talk
**Psychographics:**
${bullets(r.psychographics)}
**Watch motivations:**
${bullets(r.watch_motivations)}
**Vernacular:**
${bullets(r.vernacular)}

## Gaps & Friction
**Unanswered questions:**
${bullets(r.unanswered_questions)}
**Objections:**
${bullets(r.objections)}

## Synthesis
**Top triggers:**
${bullets(r.top_triggers_ranked)}
**Biggest misconception:** ${r.biggest_misconception || 'N/A'}
**Anchor emotional truth:** ${r.anchor_emotional_truth || 'N/A'}

## Confidence
${r.confidence || 'N/A'}

## Needs Input
${bullets(r.needs_input)}`
}

// ─── Framework (channel-framework-definer) ──────────────────────────────────────

const frameworkSchema = {
  type: 'object',
  properties: {
    problem_solved:          { type: 'string' },
    core_thesis:             { type: 'string' },
    named_method:            { type: 'string' },
    method_steps:            strArray,
    differentiation:         { type: 'string' },
    proof_points:            strArray,
    failure_modes_addressed: strArray,
    non_negotiables:         strArray,
    thesis_one_line:         { type: 'string' },
    anchor:                  { type: 'string' },
    needs_input:             strArray,
    prompt_snippet:          { type: 'string' },
  },
  required: [
    'problem_solved', 'core_thesis', 'method_steps', 'differentiation',
    'non_negotiables', 'prompt_snippet',
  ],
}

// The framework composer consumes the audience snippet (ctx.audienceSnippet).
export function composeFrameworkPrompt(
  ctx: PromptContext, label: string, sourceInput: string
): ComposedProPrompt {
  const audienceSnippet = ctx.audienceSnippet
  const system =
    'You are a methodology editor for BreezyScriptPro. Capture the channel\'s ' +
    'distinct, repeatable METHOD for solving its audience\'s core problem: the ' +
    'thesis, the steps, what makes it different, and the proof. So every script ' +
    'argues from one coherent point of view instead of generic tips. Push on ' +
    'anything vague: the core_thesis must be a real position someone could ' +
    'disagree with (not a platitude), and method_steps must be concrete enough to ' +
    'teach identically across many videos. differentiation must name what the ' +
    'method REJECTS. The prompt_snippet encodes problem, core belief, named ' +
    'method + terse steps, non-negotiables, and what it rejects. ' + OPERATING_RULES
  const audienceCtx = audienceSnippet
    ? `\nTarget audience (ensure the framework solves THEIR real problem):\n${audienceSnippet}\n`
    : ''
  // Budget the source against the window left after the audience snippet.
  const src = clampInput(sourceInput.trim(), 1600 + estimateTokens(audienceCtx), DEEP_NUM_CTX)
  const user =
    `Framework label: ${label}\n${audienceCtx}\n` +
    `Creator's description of how they solve the problem:\n"""\n${src || '(none provided)'}\n"""\n\n` +
    'Produce the Framework JSON.'
  return { system, user, taskKey: 'scriptpro.framework', maxTokens: 1600, schema: frameworkSchema }
}

export function renderFrameworkMarkdown(label: string, r: FrameworkResult): string {
  return `# Framework: ${label}

## Problem It Solves
${r.problem_solved || 'N/A'}

## Core Thesis
${r.core_thesis || 'N/A'}

## The Method${r.named_method ? `: ${r.named_method}` : ''}
${bullets(r.method_steps)}

## Why It's Different
${r.differentiation || 'N/A'}

## Proof
${bullets(r.proof_points)}

## Failure Modes It Solves
${bullets(r.failure_modes_addressed)}

## Non-Negotiables
${bullets(r.non_negotiables)}

## Synthesis
**Thesis (one line):** ${r.thesis_one_line || 'N/A'}
**Anchor (biggest promise):** ${r.anchor || 'N/A'}

## Needs Input
${bullets(r.needs_input)}`
}

// ─── TitleTemplate miner (title-shape-miner) ────────────────────────────────────

const titleMineSchema = {
  type: 'object',
  properties: {
    title_templates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern:          { type: 'string' },
          example_source:   { type: 'string' },
          triggers:         strArray,
          structure_notes:  { type: 'string' },
          transferability:  { type: 'string' },
          why_it_works:     { type: 'string' },
          outlier_strength: { type: 'string' },
        },
        required: ['pattern', 'example_source', 'triggers'],
      },
    },
    rejected: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, reason: { type: 'string' } },
        required: ['title', 'reason'],
      },
    },
  },
  required: ['title_templates'],
}

export function composeTitleMinePrompt(titlesBlock: string): ComposedProPrompt {
  const system =
    'You are a title-shape miner for BreezyScriptPro. Take titles that ' +
    'overperformed and extract the REUSABLE structure. Discard the niche topic, ' +
    'keep the syntactic skeleton and psychology. Abstract each title to a ' +
    'slot-based pattern using typed slots like {number}, {thing}, {outcome}, ' +
    '{year}, {audience}, {adjective}, {mistake}; keep function words that carry ' +
    'the effect. Name only the triggers the structure actually creates ' +
    '(curiosity, fear, FOMO, status, contrarianism, aspiration, urgency, ' +
    'specificity, relatability). Note structural rules (singular focus, no ' +
    'conjunctions, concrete specificity, open loop). Judge transferability: if a ' +
    'title only worked due to a specific person/topic/moment, put it in rejected ' +
    'with a reason instead of inventing a shape. De-duplicate near-identical ' +
    'shapes. ' + OPERATING_RULES
  const titles = clampInput(titlesBlock.trim(), 1800, QUICK_NUM_CTX)
  const user =
    `Outlier titles (one per line; "Nx" after a title = views over baseline):\n"""\n${titles || '(none provided)'}\n"""\n\n` +
    'Produce the mined title-template JSON.'
  return { system, user, taskKey: 'scriptpro.title_mine', maxTokens: 1800, schema: titleMineSchema }
}
