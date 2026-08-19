import { v } from 'convex/values'
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'
import { DEFAULT_STRUCTURES } from './lib/defaultStructures'
import { STEP_ORDER } from './ideaBank'
import { NO_DASH_RULE, runChat, stripDashes } from './llm'

// Script Drafter (docs/idea-workflow-plan.md §5e): persona + length + structure
// + all collected materials → generated script drafts. One draft is sent to
// refinement as a COPY; originals are preserved.

const DEFAULT_WPM = 150
// Conservative estimated-input-token budget that fits every supported provider.
export const INPUT_TOKEN_LIMIT = 60_000

function estimateTokens(chars: number) {
  return Math.ceil(chars / 4)
}

function wordCountOf(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

async function getOwnedIdea(ctx: QueryCtx, channelId: Id<'channels'>, ideaId: Id<'bankIdeas'>) {
  const idea = await ctx.db.get(ideaId)
  if (!idea || idea.channelId !== channelId) throw new Error('Idea not found')
  return idea
}

function builtinStructureText(ref: string): { name: string; text: string } | null {
  const structure = DEFAULT_STRUCTURES.find((s) => s.id === ref)
  if (!structure) return null
  return {
    name: structure.name,
    text: `# Structure: ${structure.name} (${structure.format})\nBest for: ${structure.bestFor}\n\n${structure.pattern}`,
  }
}

async function resolveStructure(ctx: QueryCtx, channelId: Id<'channels'>, ref: string) {
  const builtin = builtinStructureText(ref)
  if (builtin) return builtin
  const custom = await ctx.db.get(ref as Id<'bankStructures'>).catch(() => null)
  if (custom && custom.channelId === channelId) return { name: custom.name, text: custom.pattern }
  throw new Error('Pick a video structure.')
}

// Gather every material the draft prompt uses, with sizes for the gauge.
async function gatherMaterials(ctx: QueryCtx, idea: Doc<'bankIdeas'>) {
  const noteBodies: string[] = []
  for (const noteId of idea.researchNoteIds ?? []) {
    const note = await ctx.db.get(noteId)
    if (note && note.channelId === idea.channelId) {
      noteBodies.push(`### ${note.title}\n${note.body}`)
    }
  }
  const disclaimer = idea.includeDisclaimer
    ? (
        await ctx.db
          .query('bankSnippets')
          .withIndex('by_channel_key', (q) => q.eq('channelId', idea.channelId).eq('key', 'disclaimer'))
          .unique()
      )?.text ?? ''
    : ''
  return {
    description: idea.description,
    transcript: idea.questionsTranscript ?? '',
    notes: noteBodies.join('\n\n'),
    researchText: idea.researchText ?? '',
    midwayCta: idea.midwayCta ?? '',
    outroCta: idea.outroCta ?? '',
    disclaimer,
  }
}

// Materials gauge for the drafter UI: section sizes vs the context budget.
export const materials = query({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await getOwnedIdea(ctx, channelId, ideaId)
    const m = await gatherMaterials(ctx, idea)
    const sections = [
      { label: 'Answers transcript', chars: m.transcript.length },
      { label: 'Second Brain notes', chars: m.notes.length },
      { label: 'Additional research', chars: m.researchText.length },
      { label: 'Description + titles + CTAs', chars: m.description.length + m.midwayCta.length + m.outroCta.length + idea.potentialTitles.join('').length },
      { label: 'Disclaimer', chars: m.disclaimer.length },
    ]
    const totalChars = sections.reduce((sum, s) => sum + s.chars, 0)
    const estTokens = estimateTokens(totalChars) + 1500 // prompt scaffolding reserve
    return {
      sections,
      estTokens,
      limitTokens: INPUT_TOKEN_LIMIT,
      over: estTokens > INPUT_TOKEN_LIMIT,
    }
  },
})

export const listPersonas = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const personas = await ctx.db
      .query('foundationAssets')
      .withIndex('by_channel_type', (q) => q.eq('channelId', channelId).eq('type', 'persona'))
      .collect()
    return personas.map((p) => ({ _id: p._id, label: p.label, isDefault: p.isDefault }))
  },
})

export const listDrafts = query({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) return []
    const drafts = await ctx.db
      .query('bankDrafts')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    return drafts.map((d) => ({
      _id: d._id,
      _creationTime: d._creationTime,
      personaLabel: d.personaLabel,
      structureName: d.structureName,
      targetMinutes: d.targetMinutes,
      wordCount: d.wordCount,
      model: d.model,
    }))
  },
})

export const getDraft = query({
  args: { channelId: v.id('channels'), draftId: v.id('bankDrafts') },
  handler: async (ctx, { channelId, draftId }) => {
    await requireOwner(ctx)
    const draft = await ctx.db.get(draftId)
    if (!draft || draft.channelId !== channelId) return null
    return draft
  },
})

export const draftContext = internalQuery({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    personaId: v.string(),
    structureRef: v.string(),
  },
  handler: async (ctx, { channelId, ideaId, personaId, structureRef }) => {
    await requireOwner(ctx)
    const idea = await getOwnedIdea(ctx, channelId, ideaId)
    const m = await gatherMaterials(ctx, idea)
    const structure = await resolveStructure(ctx, channelId, structureRef)
    let personaLabel = ''
    let personaSnippet = ''
    if (personaId) {
      const persona = await ctx.db.get(personaId as Id<'foundationAssets'>).catch(() => null)
      if (persona && persona.channelId === channelId && persona.type === 'persona') {
        personaLabel = persona.label
        personaSnippet = persona.promptSnippet
      }
    }
    const wpmPref = await ctx.db
      .query('userPrefs')
      .withIndex('by_key', (q) => q.eq('key', `wordsPerMinute:${channelId}`))
      .unique()
    const mainTitle =
      idea.primaryTitleIndex !== undefined
        ? (idea.potentialTitles[idea.primaryTitleIndex] ?? idea.title)
        : idea.title
    return {
      ideaTitle: idea.title,
      mainTitle,
      otherTitles: idea.potentialTitles.filter((t) => t !== mainTitle),
      materials: m,
      structure,
      personaLabel,
      personaSnippet,
      wordsPerMinute: typeof wpmPref?.value === 'number' ? wpmPref.value : DEFAULT_WPM,
    }
  },
})

export const insertDraft = internalMutation({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    text: v.string(),
    personaLabel: v.string(),
    structureName: v.string(),
    targetMinutes: v.number(),
    wordsPerMinute: v.number(),
    provider: v.string(),
    model: v.string(),
    // Persist last-used settings on the idea for next time.
    personaId: v.string(),
    structureRef: v.string(),
  },
  handler: async (ctx, args) => {
    const draftId = await ctx.db.insert('bankDrafts', {
      channelId: args.channelId,
      ideaId: args.ideaId,
      text: args.text,
      personaLabel: args.personaLabel,
      structureName: args.structureName,
      targetMinutes: args.targetMinutes,
      wordsPerMinute: args.wordsPerMinute,
      wordCount: wordCountOf(args.text),
      provider: args.provider,
      model: args.model,
    })
    await ctx.db.patch(args.ideaId, {
      draftPersonaId: args.personaId,
      draftStructureRef: args.structureRef,
      draftMinutes: args.targetMinutes,
      updatedAt: Date.now(),
    })
    return draftId
  },
})

function composeDraftPrompt(context: {
  mainTitle: string
  otherTitles: string[]
  materials: { description: string; transcript: string; notes: string; researchText: string; midwayCta: string; outroCta: string; disclaimer: string }
  structure: { name: string; text: string }
  personaSnippet: string
  targetWords: number
  targetMinutes: number
}) {
  const system =
    'You are an expert YouTube scriptwriter who writes complete, ready-to-record spoken-word scripts in the creator’s own voice. ' +
    (context.personaSnippet ? `CREATOR PERSONA:\n${context.personaSnippet}\n` : '') +
    'Rules: Write ONLY the words to be spoken, first person, conversational. ' +
    'Use markdown with ## section headers that follow the given structure; put any non-spoken directions in [brackets], sparingly. ' +
    'Ground every claim, story, number, and opinion ONLY in the provided materials. The answers transcript is the creator speaking: reuse their strongest phrasings and stories; never invent experiences they did not describe. ' +
    'The structure may contain placement markers [MIDWAY CTA], [OUTRO CTA], and [DISCLAIMER]: place the corresponding provided element at exactly those points (and only where the element was provided). ' +
    `Target length: about ${context.targetWords} words (${context.targetMinutes} minutes spoken). Stay within 10% of it. ` +
    NO_DASH_RULE

  const user =
    `MAIN TITLE (the promise the script must deliver): ${context.mainTitle}\n` +
    (context.otherTitles.length ? `ALTERNATE TITLES: ${context.otherTitles.join(' | ')}\n` : '') +
    `\nVIDEO DESCRIPTION / ANGLE\n${context.materials.description}\n` +
    `\nSTRUCTURE TO FOLLOW\n${context.structure.text}\n` +
    `\nCREATOR ANSWERS TRANSCRIPT (the creator's own words; primary source)\n${context.materials.transcript || '(none provided)'}\n` +
    (context.materials.notes ? `\nSECOND BRAIN NOTES\n${context.materials.notes}\n` : '') +
    (context.materials.researchText ? `\nADDITIONAL RESEARCH\n${context.materials.researchText}\n` : '') +
    (context.materials.midwayCta ? `\nMIDWAY CALL TO ACTION (weave in near the midpoint): ${context.materials.midwayCta}\n` : '') +
    (context.materials.outroCta ? `OUTRO CALL TO ACTION (end with this): ${context.materials.outroCta}\n` : '') +
    (context.materials.disclaimer
      ? `\nLEGAL DISCLAIMER (work naturally into the early part of the script): ${context.materials.disclaimer}\n`
      : '') +
    `\nWrite the complete script now.`

  return { system, user }
}

// Returns failures as data so the client shows the message alone.
export const generate = action({
  args: {
    channelId: v.id('channels'),
    ideaId: v.id('bankIdeas'),
    personaId: v.string(), // '' = none
    structureRef: v.string(),
    minutes: v.number(),
  },
  handler: async (
    ctx,
    { channelId, ideaId, personaId, structureRef, minutes },
  ): Promise<{ draftId?: string; error?: string }> => {
    try {
      const targetMinutes = Math.max(1, Math.min(120, Math.round(minutes)))
      const context = await ctx.runQuery(internal.bankDrafts.draftContext, {
        channelId,
        ideaId,
        personaId,
        structureRef,
      })
      // Server-side context guard (mirrors the UI gauge).
      const materialChars =
        context.materials.transcript.length +
        context.materials.notes.length +
        context.materials.researchText.length +
        context.materials.description.length
      if (estimateTokens(materialChars) + 1500 > INPUT_TOKEN_LIMIT) {
        throw new Error(
          'Your materials exceed the context budget. Trim the transcript, research text, or attached notes and try again.',
        )
      }
      const resolved = await ctx.runQuery(internal.aiSettings.resolve, { task: 'scripts' })
      const targetWords = targetMinutes * context.wordsPerMinute
      const prompt = composeDraftPrompt({
        mainTitle: context.mainTitle,
        otherTitles: context.otherTitles,
        materials: context.materials,
        structure: context.structure,
        personaSnippet: context.personaSnippet,
        targetWords,
        targetMinutes,
      })
      const result = await runChat(
        resolved,
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        { maxTokens: Math.min(32000, Math.max(4000, targetWords * 2)) },
      )
      const text = stripDashes(result.text).trim()
      if (!text) throw new Error('The model returned an empty script. Try again.')
      const draftId: string = await ctx.runMutation(internal.bankDrafts.insertDraft, {
        channelId,
        ideaId,
        text,
        personaLabel: context.personaLabel,
        structureName: context.structure.name,
        targetMinutes,
        wordsPerMinute: context.wordsPerMinute,
        provider: result.provider,
        model: result.model,
        personaId,
        structureRef,
      })
      return { draftId }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Generation failed. Try again.'
      const cleaned = raw.replace(/^.*Uncaught Error:\s*/s, '').replace(/\s+at handler.*$/s, '')
      return { error: cleaned.trim() || 'Generation failed. Try again.' }
    }
  },
})

export const removeDraft = mutation({
  args: { channelId: v.id('channels'), draftId: v.id('bankDrafts') },
  handler: async (ctx, { channelId, draftId }) => {
    await requireOwner(ctx)
    const draft = await ctx.db.get(draftId)
    if (!draft || draft.channelId !== channelId) throw new Error('Draft not found')
    await ctx.db.delete(draftId)
  },
})

// ——— Script Refinement (step 7): editing the copies ———

export const listRefinements = query({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) return []
    const refinements = await ctx.db
      .query('bankRefinementDrafts')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    return refinements
      .sort((a, b) => a._creationTime - b._creationTime)
      .map((r) => ({
        _id: r._id,
        sourceDraftRef: r.sourceDraftRef,
        current: r.current,
        updatedAt: r.updatedAt,
        wordCount: wordCountOf(r.text),
      }))
  },
})

export const getCurrentRefinement = query({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) return null
    const refinements = await ctx.db
      .query('bankRefinementDrafts')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    return refinements.find((r) => r.current) ?? null
  },
})

// Switching keeps every version (plan §5b: never lose in-progress refinement).
export const setCurrentRefinement = mutation({
  args: { channelId: v.id('channels'), refinementId: v.id('bankRefinementDrafts') },
  handler: async (ctx, { channelId, refinementId }) => {
    await requireOwner(ctx)
    const target = await ctx.db.get(refinementId)
    if (!target || target.channelId !== channelId) throw new Error('Version not found')
    const siblings = await ctx.db
      .query('bankRefinementDrafts')
      .withIndex('by_idea', (q) => q.eq('ideaId', target.ideaId))
      .collect()
    for (const r of siblings) {
      if (r.current && r._id !== refinementId) await ctx.db.patch(r._id, { current: false })
    }
    await ctx.db.patch(refinementId, { current: true, updatedAt: Date.now() })
  },
})

export const updateRefinementText = mutation({
  args: {
    channelId: v.id('channels'),
    refinementId: v.id('bankRefinementDrafts'),
    text: v.string(),
  },
  handler: async (ctx, { channelId, refinementId, text }) => {
    await requireOwner(ctx)
    const refinement = await ctx.db.get(refinementId)
    if (!refinement || refinement.channelId !== channelId) throw new Error('Version not found')
    await ctx.db.patch(refinementId, { text, updatedAt: Date.now() })
    // Cascade: a blanked current script demotes the refine step and later ones.
    if (!text.trim() && refinement.current) {
      const idea = await ctx.db.get(refinement.ideaId)
      const ready = idea?.readySteps ?? []
      const index = ready.indexOf('refine')
      if (idea && index !== -1) {
        await ctx.db.patch(idea._id, { readySteps: ready.slice(0, index) })
      }
    }
  },
})

export const markRefineReady = mutation({
  args: { channelId: v.id('channels'), ideaId: v.id('bankIdeas') },
  handler: async (ctx, { channelId, ideaId }) => {
    await requireOwner(ctx)
    const idea = await ctx.db.get(ideaId)
    if (!idea || idea.channelId !== channelId) throw new Error('Idea not found')
    const refinements = await ctx.db
      .query('bankRefinementDrafts')
      .withIndex('by_idea', (q) => q.eq('ideaId', ideaId))
      .collect()
    const current = refinements.find((r) => r.current)
    if (!current?.text.trim()) throw new Error('The current script is empty.')
    const ready = idea.readySteps ?? []
    if (ready.includes('refine')) return
    const index = STEP_ORDER.indexOf('refine')
    for (const prior of STEP_ORDER.slice(0, index)) {
      if (!ready.includes(prior)) throw new Error('Earlier steps must be marked ready first.')
    }
    await ctx.db.patch(ideaId, { readySteps: [...ready, 'refine'], updatedAt: Date.now() })
  },
})

// The copy boundary (plan §5b): sending a draft to refinement copies it. A new
// send creates another refinement draft and makes it current; earlier ones are
// preserved so in-progress refinement work is never lost.
export const sendToRefinement = mutation({
  args: { channelId: v.id('channels'), draftId: v.id('bankDrafts') },
  handler: async (ctx, { channelId, draftId }) => {
    await requireOwner(ctx)
    const draft = await ctx.db.get(draftId)
    if (!draft || draft.channelId !== channelId) throw new Error('Draft not found')
    const idea = await ctx.db.get(draft.ideaId)
    if (!idea) throw new Error('Idea not found')

    const existing = await ctx.db
      .query('bankRefinementDrafts')
      .withIndex('by_idea', (q) => q.eq('ideaId', draft.ideaId))
      .collect()
    // Re-sending the same draft just re-selects its existing copy.
    const already = existing.find((r) => r.sourceDraftRef === draftId)
    for (const r of existing) {
      if (r.current) await ctx.db.patch(r._id, { current: false })
    }
    if (already) {
      await ctx.db.patch(already._id, { current: true, updatedAt: Date.now() })
    } else {
      await ctx.db.insert('bankRefinementDrafts', {
        channelId,
        ideaId: draft.ideaId,
        sourceDraftRef: draftId,
        text: draft.text,
        current: true,
        updatedAt: Date.now(),
      })
    }

    // Mark the drafter step ready (all prior steps are necessarily ready to
    // have reached this point, but validate the prefix anyway).
    const ready = idea.readySteps ?? []
    const index = STEP_ORDER.indexOf('draft')
    const priorReady = STEP_ORDER.slice(0, index).every((s) => ready.includes(s))
    await ctx.db.patch(draft.ideaId, {
      draftSentRef: draftId,
      readySteps:
        priorReady && !ready.includes('draft') ? [...ready, 'draft'] : ready,
      updatedAt: Date.now(),
    })
  },
})
