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

export const interviewBlock = v.object({
  id: v.string(),
  type: v.union(
    v.literal('informative'),
    v.literal('opinion'),
    v.literal('personal_story'),
    v.literal('third_party_narrative'),
    v.literal('case_study'),
    v.literal('problem_solving'),
    v.literal('manual'),
    v.literal('story'),
    v.literal('second_brain'),
  ),
  facet: v.string(), // 'note:<noteId>' for second_brain blocks
  q: v.string(),
  a: v.string(),
})

export default defineSchema({
  ...authTables,

  channels: defineTable({
    name: v.string(),
    description: v.string(),
    // Free text injected as the IDENTITY block in megaprompts (replaces the
    // desktop app's Clarity-profile read). Omitted from prompts when blank.
    identity: v.string(),
    updatedAt: v.number(),
  }),

  // ——— Second Brain ———
  notes: defineTable({
    channelId: v.id('channels'),
    title: v.string(),
    body: v.string(),
    kind: noteKind,
    tags: v.array(v.string()),
    sourceRef: v.optional(v.string()), // 'scriptpro:<productionId>' when pushed from another tool
    searchText: v.string(), // title + '\n' + tags + '\n' + body, maintained by mutations
    updatedAt: v.number(),
  })
    .index('by_channel', ['channelId', 'updatedAt'])
    .index('by_channel_source', ['channelId', 'sourceRef'])
    .searchIndex('search', { searchField: 'searchText', filterFields: ['channelId', 'kind'] }),

  // ——— Idea Bank ———
  // Deliberately separate from Scripts Pro's `ideas` table (own tool, own logic).
  bankIdeas: defineTable({
    channelId: v.id('channels'),
    title: v.string(),
    description: v.string(),
    potentialTitles: v.array(v.string()), // ≤3, trimmed non-empty entries only
    rating: v.number(), // integer 0–5; 0 = unrated
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

  // ——— Scripts Pro ———
  ideas: defineTable({
    channelId: v.id('channels'),
    title: v.string(),
    angle: v.string(),
    sourceRef: v.string(), // '' | 'concept'
    status: v.union(
      v.literal('new'),
      v.literal('in_production'),
      v.literal('finished'),
      v.literal('rejected'),
    ),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  foundationAssets: defineTable({
    channelId: v.id('channels'),
    type: v.union(v.literal('persona'), v.literal('audience'), v.literal('framework')),
    label: v.string(),
    sourceInput: v.string(),
    result: v.any(), // model JSON; validated leniently at the apply boundary
    resultMarkdown: v.string(), // rendered in code, never model-authored
    promptSnippet: v.string(), // the only thing injected downstream; user-editable
    isDefault: v.boolean(), // one per (channel, type), enforced in mutations
    updatedAt: v.number(),
  }).index('by_channel_type', ['channelId', 'type']),

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
    sortBoost: v.number(), // written only by feedback re-rank apply
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  productions: defineTable({
    channelId: v.id('channels'),
    ideaId: v.optional(v.id('ideas')),
    name: v.string(),
    format: v.union(
      v.literal('shorts'),
      v.literal('medium'),
      v.literal('long'),
      v.literal('podcast'),
    ),
    concept: v.object({
      workingTitle: v.string(),
      descriptionAngle: v.string(),
      audienceGap: v.string(),
      scores: v.optional(v.any()),
      rationale: v.optional(v.string()),
    }),
    titleCandidates: v.array(v.any()),
    chosenTitles: v.array(v.object({ text: v.string(), main: v.boolean() })), // ≤3, exactly one main
    targetMinutes: v.number(),
    thumbnailCandidates: v.array(v.any()),
    chosenThumbnail: v.optional(v.any()),
    interview: v.array(interviewBlock),
    draftMarkdown: v.string(),
    metadata: v.object({
      description: v.optional(
        v.object({ firstLine: v.string(), body: v.string(), notes: v.optional(v.string()) }),
      ),
      chapters: v.array(v.object({ timestamp: v.string(), title: v.string() })),
      tags: v.array(v.string()),
    }),
    status: v.union(v.literal('building'), v.literal('ready'), v.literal('archived')),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId', 'updatedAt']),

  draftSnapshots: defineTable({
    productionId: v.id('productions'),
    channelId: v.id('channels'),
    draftMarkdown: v.string(),
    reason: v.union(v.literal('apply_replace'), v.literal('manual')),
  }).index('by_production', ['productionId']),

  libraryItems: defineTable({
    channelId: v.id('channels'),
    kind: v.union(
      v.literal('video_structure'),
      v.literal('cta'),
      v.literal('disclosure'),
      v.literal('description'),
    ),
    title: v.string(),
    summary: v.string(),
    result: v.any(),
    isDefault: v.boolean(), // one per (channel, kind)
    updatedAt: v.number(),
  }).index('by_channel_kind', ['channelId', 'kind']),

  feedback: defineTable({
    channelId: v.id('channels'),
    productionId: v.optional(v.id('productions')),
    title: v.string(),
    metrics: v.string(),
    sourceInput: v.string(),
    result: v.optional(v.any()),
    resultMarkdown: v.string(),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  userPrefs: defineTable({
    key: v.string(), // 'lastChannelId' | 'wordsPerMinute:<channelId>'
    value: v.any(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),
})
