import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

// Schema per docs/implementation-plan.md §3.3.
// Every scoped table carries channelId + a by_channel index. Convex has no FK
// cascades: channels.remove fans out deletes explicitly.

export const noteKind = v.union(
  v.literal('note'),
  v.literal('article'),
  v.literal('thought'),
  v.literal('book_review'),
  v.literal('script'),
  v.literal('quote'),
  v.literal('idea'),
  v.literal('transcript'),
  v.literal('research'),
  v.literal('story'),
)

export default defineSchema({
  ...authTables,

  channels: defineTable({
    name: v.string(),
    description: v.string(),
    updatedAt: v.number(),
  }),

  // ——— Second Brain ———
  notes: defineTable({
    channelId: v.id('channels'),
    title: v.string(),
    body: v.string(),
    kind: noteKind,
    tags: v.array(v.string()),
    sourceRef: v.optional(v.string()), // origin marker when a note is pushed from another tool ('' or unset = hand-written)
    searchText: v.string(), // title + '\n' + tags + '\n' + body, maintained by mutations
    updatedAt: v.number(),
  })
    .index('by_channel', ['channelId', 'updatedAt'])
    .index('by_channel_source', ['channelId', 'sourceRef'])
    .searchIndex('search', { searchField: 'searchText', filterFields: ['channelId', 'kind'] }),

  // ——— Scripts Pro (the stepped idea→production workflow, formerly Idea Bank) ———
  bankIdeas: defineTable({
    channelId: v.id('channels'),
    title: v.string(),
    description: v.string(),
    potentialTitles: v.array(v.string()), // ≤3, trimmed non-empty entries only
    primaryTitleIndex: v.optional(v.number()), // index into potentialTitles; absent = none; feeds script building later
    rating: v.number(), // integer 0–5; 0 = unrated
    // Workflow progression (docs/idea-workflow-plan.md §2): canonical step ids in
    // order, e.g. ['idea','titles']. Absent = nothing ready. Server-maintained.
    readySteps: v.optional(v.array(v.string())),
    // Thumbnail A/B slots (plan §5): 3 slots referencing bankThumbnails docs.
    // The same doc may fill several slots — the image is stored once.
    thumbnailSlots: v.optional(v.array(v.union(v.id('bankThumbnails'), v.null()))),
    // Leading-questions step (plan §5c): the pasted transcript of the user's
    // recorded freeflow answers. Non-empty = the step's ready criterion.
    questionsTranscript: v.optional(v.string()),
    // Research step (plan §5d): Second Brain references + pasted research +
    // CTAs + disclaimer flag. Marking ready declares materials complete for
    // the Script Drafter; no field is individually required.
    researchNoteIds: v.optional(v.array(v.id('notes'))),
    researchText: v.optional(v.string()),
    midwayCta: v.optional(v.string()),
    outroCta: v.optional(v.string()),
    includeDisclaimer: v.optional(v.boolean()),
    // Script Drafter step (plan §5e): last-used generation settings (persisted
    // at generate time) + the ref of the draft last sent to refinement.
    // draftPersonaId: bankPersonas id as string, '' = none.
    // draftStructureRef: 'builtin:*' or a bankStructures id as string.
    draftPersonaId: v.optional(v.string()),
    draftStructureRef: v.optional(v.string()),
    draftMinutes: v.optional(v.number()),
    draftSentRef: v.optional(v.string()), // bankDrafts id last sent; ready criterion
    status: v.union(
      v.literal('new'),
      v.literal('ready'),
      v.literal('done'),
      v.literal('do_again'),
      v.literal('wont_do'),
    ),
    searchText: v.string(), // title + potential titles + description, maintained by mutations
    updatedAt: v.number(),
  })
    .index('by_channel', ['channelId', 'updatedAt'])
    .searchIndex('search', { searchField: 'searchText', filterFields: ['channelId'] }),

  // Leading questions (plan §5c): the two required questions plus generated
  // topic-specific ones. `selected` marks questions the user plans to answer
  // in their recording; selected questions survive regeneration.
  bankQuestions: defineTable({
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    text: v.string(),
    category: v.string(),
    source: v.union(v.literal('required'), v.literal('generated')),
    selected: v.boolean(),
    order: v.number(),
    batch: v.number(),
  })
    .index('by_idea', ['ideaId'])
    .index('by_channel', ['channelId']),

  // Custom video-structure blueprints (plan §5e), edited in Settings → Video
  // structures. Built-ins ship as code constants (convex/lib/defaultStructures).
  bankStructures: defineTable({
    channelId: v.id('channels'),
    name: v.string(),
    pattern: v.string(), // free-text structural blueprint
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  // Generated script drafts (plan §5e). Users generate as many as they like;
  // one is sent to refinement as a COPY (bankRefinementDrafts).
  bankDrafts: defineTable({
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    text: v.string(), // markdown script
    personaLabel: v.string(),
    structureName: v.string(),
    structureFormat: v.optional(v.string()), // 'shorts' | 'medium' | 'long' | 'podcast' | 'custom'
    targetMinutes: v.number(),
    wordsPerMinute: v.number(),
    wordCount: v.number(),
    provider: v.string(),
    model: v.string(),
  })
    .index('by_idea', ['ideaId'])
    .index('by_channel', ['channelId']),

  // Refinement copies (plan §5b): preserves the original draft; multiple
  // refinement drafts may exist with exactly one current.
  bankRefinementDrafts: defineTable({
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    sourceDraftRef: v.string(), // bankDrafts id as string; survives draft deletion
    text: v.string(),
    current: v.boolean(),
    updatedAt: v.number(),
  })
    .index('by_idea', ['ideaId'])
    .index('by_channel', ['channelId']),

  // Personalize-text settings (owner spec 2026-08-18). Custom phrase
  // replacements run before contractions; managed in Settings → Word replacement.
  bankReplacements: defineTable({
    channelId: v.id('channels'),
    before: v.string(),
    after: v.string(),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  // Per-channel contraction opt-outs (all patterns enabled by default) and the
  // "would have" style: contract the pronoun ("I'd have", default) or the have
  // ("I would've").
  bankWordPrefs: defineTable({
    channelId: v.id('channels'),
    disabledContractions: v.array(v.string()),
    // Legacy single-family fields (superseded by compoundStyles; kept optional).
    wouldHaveStyle: v.optional(v.union(v.literal('pronoun'), v.literal('have'))),
    beNotStyle: v.optional(v.union(v.literal('pronoun'), v.literal('not'))),
    // Per-family compound-contraction choices (family key → side); defaults
    // resolved in src/features/bank/personalize.ts COMPOUND_FAMILIES.
    compoundStyles: v.optional(v.record(v.string(), v.string())),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  // Channel-scoped reusable text snippets for the workflow (plan §5d), edited
  // in Settings → Script snippets. Currently: key 'disclaimer'.
  bankSnippets: defineTable({
    channelId: v.id('channels'),
    key: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index('by_channel_key', ['channelId', 'key'])
    .index('by_channel', ['channelId']),

  // Uploaded thumbnails (plan §5): only the client-resized 334×188 copy is
  // stored; originals never leave the device. Deduped per idea by sha256.
  bankThumbnails: defineTable({
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    storageId: v.id('_storage'),
    name: v.string(), // `${ideaId}-${slug(original basename)}`
    originalFileName: v.string(),
    width: v.number(),
    height: v.number(),
  })
    .index('by_idea', ['ideaId'])
    .index('by_channel', ['channelId']),

  // Generated title candidates for an idea's titles step (plan §4). Hearts
  // survive regeneration; unhearted candidates from old batches are cleared.
  bankTitleCandidates: defineTable({
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    shapeName: v.string(), // denormalized group label
    templateRef: v.string(), // titleTemplates id as string; survives template deletion
    text: v.string(),
    hearted: v.boolean(),
    batch: v.number(),
  })
    .index('by_idea', ['ideaId'])
    .index('by_channel', ['channelId']),

  // Creator personas (owner spec 2026-08-18): built from 3-4 samples of the
  // creator's own spoken-style writing plus explicit style controls; the LLM
  // extracts `voice`, which stays editable and is what the drafter injects.
  bankPersonas: defineTable({
    channelId: v.id('channels'),
    label: v.string(),
    samples: v.array(v.string()), // up to 4 script/transcript excerpts
    neverUse: v.array(v.string()), // words & phrases banned from scripts
    signature: v.array(v.string()), // words & phrases the creator does use
    profanity: v.string(), // 'none' | 'mild' | 'moderate' | 'full'
    pacing: v.string(), // 'fast' | 'moderate' | 'slow' | 'varied'
    energy: v.string(), // 'high' | 'upbeat' | 'calm' | 'intense' | 'varied'
    notes: v.string(), // freeform extra style notes
    voice: v.string(), // extracted + user-edited voice guide (prompt snippet)
    isDefault: v.boolean(),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  // Target audience (owner spec 2026-08-18): one description per channel of
  // who the viewer is, the problem they have, and the creator's framework for
  // solving it. Composed by hand or via the AI interview; always editable.
  bankAudiences: defineTable({
    channelId: v.id('channels'),
    description: v.string(),
    // Last AI-walkthrough answers, kept so the interview can be revisited.
    interview: v.optional(v.array(v.object({ question: v.string(), answer: v.string() }))),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  // Affiliate Links micro tool (docs/affiliate-links-plan.md). A link is one
  // product entered once; each of its URLs carries exactly one tag saying
  // where that URL belongs (video description, website, course, …).
  affiliateTags: defineTable({
    channelId: v.id('channels'),
    name: v.string(),
    sortOrder: v.number(),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  affiliateLinks: defineTable({
    channelId: v.id('channels'),
    title: v.string(),
    shortTitle: v.string(),
    urls: v.array(v.object({ url: v.string(), tagId: v.id('affiliateTags') })),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  // App-wide AI model choices per provider (docs/idea-workflow-plan.md §6b).
  // API keys are NEVER stored here — they live in deployment env vars and are
  // read only inside Convex functions. Active provider per task class lives in
  // userPrefs ('ai:activeSimple' / 'ai:activeScripts').
  aiProviderSettings: defineTable({
    provider: v.union(v.literal('claude'), v.literal('openai'), v.literal('grok')),
    simpleModel: v.string(), // titles, leading questions, descriptions
    scriptModel: v.string(), // long-form script writing
    updatedAt: v.number(),
  }).index('by_provider', ['provider']),

  // Cached provider model lists so Settings offers a picker instead of free
  // text. Refreshed via the fetchModels action (needs the provider's key).
  aiModelCache: defineTable({
    provider: v.union(v.literal('claude'), v.literal('openai'), v.literal('grok')),
    models: v.array(v.string()),
    fetchedAt: v.number(),
  }).index('by_provider', ['provider']),

  // Title shape + template library (Settings → Title shapes; feeds bankTitles).
  titleShapes: defineTable({
    channelId: v.id('channels'),
    name: v.string(),
    tagline: v.string(),
    mechanism: v.string(),
    whatMakesItWork: v.array(v.string()),
    whatUnderminesIt: v.array(v.string()),
    sortOrder: v.number(),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  titleTemplates: defineTable({
    channelId: v.id('channels'),
    pattern: v.string(),
    exampleSource: v.string(),
    triggers: v.array(v.string()),
    structureNotes: v.string(),
    transferability: v.string(),
    whyItWorks: v.string(),
    outlierStrength: v.string(),
    manual: v.boolean(), // hand-added vs mined
    shapeId: v.string(), // '' unsorted | 'shape:*' built-in | titleShapes doc id
    whyThisVariant: v.string(),
    exampleTitle: v.string(),
    sortBoost: v.number(), // legacy ranking nudge, always 0 now (old feedback re-rank wrote it)
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  userPrefs: defineTable({
    key: v.string(), // 'lastChannelId' | 'wordsPerMinute:<channelId>'
    value: v.any(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),
})
