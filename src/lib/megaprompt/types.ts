// Ported from BreezyScript scriptContextPro.ts — keep prompt text byte-faithful; do not edit wording casually.
//
// Local data shapes for the megaprompt library. Result interfaces mirror the
// desktop contracts field-for-field (they ARE the JSON output contracts, so the
// snake_case field names inside results are intentional and must not change).
// App-side input shapes (production, interview, titles) are camelCase native
// objects — the web schema stores no JSON strings.

export interface ComposedProPrompt {
  system:    string
  user:      string
  taskKey:   string
  maxTokens: number
  schema:    object   // JSON schema — the megaprompt's output contract
}

// Per-video: free-form streaming prompt (the draft) — markdown out, no schema.
export interface ComposedStreamPrompt {
  system:    string
  user:      string
  taskKey:   string
  maxTokens: number
}

// ─── App-side input shapes (camelCase, native objects) ─────────────────────────

export type VideoFormat = 'shorts' | 'medium' | 'long' | 'podcast'

export interface ProductionConcept {
  workingTitle:     string
  descriptionAngle: string
  audienceGap:      string
}

// A/B title set: variants of the SAME video; `main` frames the script.
export interface ChosenTitle { text: string; main: boolean }

export interface ChosenThumbnail {
  complementsTitle?: string
  depicts?:          string
}

export interface InterviewAnswer {
  id:    string
  type:  string
  facet: string
  q:     string
  a:     string
}

export interface ProductionInput {
  name:            string
  format:          VideoFormat
  concept:         ProductionConcept
  chosenTitles:    ChosenTitle[]
  chosenThumbnail?: ChosenThumbnail | null
  targetMinutes:   number
  interview:       InterviewAnswer[]
  draftMarkdown:   string
  metadata:        MetadataResult | null
}

// Shape guides passed to the package/title-variant composers' TARGET SHAPES block.
export interface TitleShapeGuide {
  name:      string
  mechanism: string
  patterns:  string[]
}

// ─── Persona (persona-voice-capture) ────────────────────────────────────────────

export interface PersonaResult {
  voice_in_three_words: string
  signature_feel:       string
  signature_phrases:    string[]
  vocabulary_level:     string
  filler_words:         string[]
  tone_register:        string
  energy:               string
  formality:            string
  audience_relationship:string
  sentence_style:       string
  opens:                string
  closes:               string
  contractions_grammar: string
  profanity:            string
  avoid:                string[]
  common_mistakes:      string[]
  prompt_snippet:       string
}

// ─── AudienceProfile (audience-profile-builder) ─────────────────────────────────

export interface AudienceResult {
  one_line:              string
  demographics:          string
  sophistication_level:  string
  psychographics:        string[]
  watch_motivations:     string[]
  core_fears:            string[]
  aspirations:           string[]
  unanswered_questions:  string[]
  objections:            string[]
  vernacular:            string[]
  resonant_triggers:     string[]   // "fear — they worry X"
  top_triggers_ranked:   string[]
  biggest_misconception: string
  anchor_emotional_truth:string
  confidence:            string
  needs_input:           string[]
  prompt_snippet:        string
}

// ─── Framework (channel-framework-definer) ──────────────────────────────────────

export interface FrameworkResult {
  problem_solved:          string
  core_thesis:             string
  named_method:            string
  method_steps:            string[]
  differentiation:         string
  proof_points:            string[]
  failure_modes_addressed: string[]
  non_negotiables:         string[]
  thesis_one_line:         string
  anchor:                  string
  needs_input:             string[]
  prompt_snippet:          string
}

// ─── TitleTemplate miner (title-shape-miner) ────────────────────────────────────

export interface MinedTitleTemplate {
  pattern:          string
  example_source:   string
  triggers:         string[]
  structure_notes:  string
  transferability:  string
  why_it_works:     string
  outlier_strength: string
}

export interface TitleMineResult {
  title_templates: MinedTitleTemplate[]
  rejected:        { title: string; reason: string }[]
}

// ─── video-concept-generator ────────────────────────────────────────────────────

export interface ConceptResult {
  video_concepts: {
    working_title: string; description_angle: string; audience_gap: string
    scores?: { audience_fit?: number; shape_strength?: number; differentiation?: number }
    rationale?: string
  }[]
  rejected?: { idea: string; reason: string }[]
}

// ─── title-variant-generator ────────────────────────────────────────────────────

export interface TitleVariant {
  text: string; triggers?: string[]
  scores?: { curiosity?: number; promise_clarity?: number; tension?: number; specificity?: number; native_fit?: number }
  rationale?: string
}
export interface TitleVariantsResult { titles: TitleVariant[]; rejected?: { text: string; note: string }[] }

// ─── thumbnail-concept-generator ─────────────────────────────────────────────────

export interface ThumbnailConcept {
  direction: string; depicts: string; focal_subject?: string; text_overlay?: string
  expression_emotion?: string; color_contrast?: string; complements_title: string; ab_note?: string
}
export interface ThumbnailResult { thumbnail_concepts: ThumbnailConcept[] }

// ─── brain-dump-interviewer ──────────────────────────────────────────────────────

export interface InterviewQuestion { id: string; type: string; facet: string; q: string }
export interface InterviewResult { promise?: string; questions: InterviewQuestion[] }

// ─── package-generator (fused title + description + thumbnail + questions) ──────

export interface PackageResult {
  titles:      TitleVariant[]
  description: { first_line: string; body: string; notes?: string }
  thumbnails:  ThumbnailConcept[]
  questions:   { q: string }[]
}

// ─── script-blueprint-drafter (streaming, free-form markdown) ───────────────────

export interface DraftPromptOpts {
  format: string; chosenTitle: string; descriptionAngle: string
  thumbnailBrief: string; brainDump: string; structureNotes?: string
  knowledgeBlock?: string   // extra creator-authored context block, '' = none (unused since Phase 9)
  // A/B title set: variants of the SAME video; `main` frames the script, the
  // rest are packaging/thumbnail tests. Falls back to chosenTitle when absent.
  titles?: { text: string; main: boolean }[]
  targetMinutes?: number    // creator's target spoken length; 0/undefined = format default
}

// How much of the brain dump actually fits the draft window. cutoffChar is the
// character index (in the trimmed dump) where clampToFit slices — null when the
// whole dump fits. Mirrors clampToFit's math exactly (same 200-token slack).
export interface DraftBudget {
  budgetTokens: number      // tokens available for the brain dump
  dumpTokens:   number      // estimated tokens of the full dump
  cutoffChar:   number | null
}

// Interview-meter classification of each answer against the draft-budget cutoff.
export interface InterviewAnswerStatus {
  index:  number
  status: 'full' | 'partial' | 'cut' | 'empty'
}

// ─── youtube-metadata-generator ──────────────────────────────────────────────────

export interface MetadataResult {
  description: { first_line: string; body: string; notes?: string }
  chapters: { timestamp: string; title: string }[]
  tags: string[]
}

// ─── Reusable libraries ─────────────────────────────────────────────────────────

export interface VideoStructureItem {
  name: string; format_type?: string
  sections: { beat: string; job: string }[]
  retention_mechanics?: { open_loops?: string[]; re_hooks?: string[]; payoffs?: string[] }
  pacing_notes?: string; best_for?: string
}
export interface VideoStructureResult { video_structures: VideoStructureItem[] }

export interface CtaItem { goal: string; text_variants: string[]; placement?: string[]; tone?: string; when_to_use?: string }
export interface DisclosureItem { type: string; required_context?: string; text: string; placement?: string[] }
export interface CtaResult { ctas: CtaItem[]; disclosures: DisclosureItem[] }

// ─── performance-feedback-analyzer ──────────────────────────────────────────────

export interface FeedbackResult {
  diagnosis?:                 { primary?: string; reasoning?: string }
  new_comment_signals?:       string[]
  proposed_audience_updates?: string[]
  proposed_template_reranks?: { template: string; direction: string; reason: string }[]
  recommended_experiment?:    string
  confidence?:                string
}
