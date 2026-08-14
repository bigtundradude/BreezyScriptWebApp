// Ported from BreezyScript scriptContextPro.ts — keep prompt text byte-faithful; do not edit wording casually.
//
// Barrel for the megaprompt composition library. All composers are pure and
// synchronous, taking a PromptContext plus per-call args.

export * from './types'
export * from './context'
export {
  estimateTokens, fitToBudget, clampInput, clampToFit,
  DEEP_NUM_CTX, QUICK_NUM_CTX,
} from './tokenBudget'
export type { PromptSection, FitResult } from './tokenBudget'
export {
  OPERATING_RULES, SPOKEN_PUNCTUATION, SCRIPT_PROSE_STYLE,
  snippetBlock, bullets, toMegaprompt, toDraftMegaprompt,
} from './shared'
export {
  composePersonaPrompt, renderPersonaMarkdown,
  composeAudiencePrompt, renderAudienceMarkdown,
  composeFrameworkPrompt, renderFrameworkMarkdown,
  composeTitleMinePrompt,
} from './foundation'
export {
  composeConceptPrompt, composeTitleVariantsPrompt, composeThumbnailPrompt,
  composeInterviewPrompt, composePackagePrompt,
  composeDraftPrompt, computeDraftBudget,
  serializeBrainDump, thumbnailBrief, classifyInterviewAnswers,
  composeMetadataPrompt,
} from './production'
export {
  composeVideoStructurePrompt, composeCtaPrompt,
  composeFeedbackPrompt, renderFeedbackMarkdown,
} from './library'
export { parseJsonLenient } from './parse'
