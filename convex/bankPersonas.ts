import { v } from 'convex/values'
import { action, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireOwner } from './lib/owner'
import { NO_DASH_RULE, runChat, stripDashes } from './llm'

// Creator personas (owner spec 2026-08-18). A persona is built from samples of
// how the creator actually speaks plus explicit style controls; extractVoice
// turns those into an editable voice guide that the Script Drafter injects.

export const personaProfile = v.object({
  samples: v.array(v.string()),
  neverUse: v.array(v.string()),
  signature: v.array(v.string()),
  profanity: v.string(),
  pacing: v.string(),
  energy: v.string(),
  notes: v.string(),
})

const MAX_SAMPLES = 4

async function getOwnedPersona(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<'channels'>,
  personaId: Id<'bankPersonas'>,
) {
  const persona = await ctx.db.get(personaId)
  if (!persona || persona.channelId !== channelId) throw new Error('Persona not found')
  return persona
}

function sortPersonas(personas: Doc<'bankPersonas'>[]) {
  return personas.sort((a, b) =>
    a.isDefault !== b.isDefault ? (a.isDefault ? -1 : 1) : b.updatedAt - a.updatedAt,
  )
}

export const list = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, { channelId }) => {
    await requireOwner(ctx)
    const personas = await ctx.db
      .query('bankPersonas')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    return sortPersonas(personas)
  },
})

export const save = mutation({
  args: {
    channelId: v.id('channels'),
    personaId: v.optional(v.id('bankPersonas')),
    label: v.string(),
    voice: v.string(),
    profile: personaProfile,
  },
  handler: async (ctx, { channelId, personaId, label, voice, profile }) => {
    await requireOwner(ctx)
    const fields = {
      label: label.trim() || 'Untitled',
      samples: profile.samples.slice(0, MAX_SAMPLES),
      neverUse: profile.neverUse,
      signature: profile.signature,
      profanity: profile.profanity,
      pacing: profile.pacing,
      energy: profile.energy,
      notes: profile.notes,
      voice,
      updatedAt: Date.now(),
    }
    if (personaId) {
      await getOwnedPersona(ctx, channelId, personaId)
      await ctx.db.patch(personaId, fields)
      return personaId
    }
    const siblings = await ctx.db
      .query('bankPersonas')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    return await ctx.db.insert('bankPersonas', {
      channelId,
      ...fields,
      isDefault: siblings.length === 0, // first persona becomes the default
    })
  },
})

export const setDefault = mutation({
  args: { channelId: v.id('channels'), personaId: v.id('bankPersonas') },
  handler: async (ctx, { channelId, personaId }) => {
    await requireOwner(ctx)
    await getOwnedPersona(ctx, channelId, personaId)
    const siblings = await ctx.db
      .query('bankPersonas')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    for (const sibling of siblings) {
      if (sibling.isDefault && sibling._id !== personaId) {
        await ctx.db.patch(sibling._id, { isDefault: false })
      }
    }
    await ctx.db.patch(personaId, { isDefault: true, updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { channelId: v.id('channels'), personaId: v.id('bankPersonas') },
  handler: async (ctx, { channelId, personaId }) => {
    await requireOwner(ctx)
    await getOwnedPersona(ctx, channelId, personaId)
    await ctx.db.delete(personaId)
  },
})

const PROFANITY_RULES: Record<string, string> = {
  none: 'Profanity is never allowed. Keep the language fully clean.',
  mild: 'Only mild profanity is allowed (damn, hell). Nothing stronger.',
  moderate: 'Moderate profanity is allowed, but no f-bombs and never slurs.',
  full: 'Uncensored profanity is allowed wherever it fits the speaker. Never slurs.',
}

const PACING_HINTS: Record<string, string> = {
  fast: 'fast and rapid-fire',
  moderate: 'moderate and conversational',
  slow: 'slow and deliberate',
  varied: 'varied, speeding up for excitement and slowing down for emphasis',
}

const ENERGY_HINTS: Record<string, string> = {
  high: 'high energy, hyped',
  upbeat: 'upbeat and friendly',
  calm: 'calm and measured',
  intense: 'intense and serious',
  varied: 'varied, shifting energy with the material',
}

// Analyze the creator's samples + style controls into a detailed voice guide.
// Returns failures as data so the client shows the message alone.
export const extractVoice = action({
  args: { profile: personaProfile },
  handler: async (ctx, { profile }): Promise<{ text?: string; error?: string }> => {
    try {
      await ctx.runQuery(internal.aiSettings.assertOwner, {})
      const samples = profile.samples.map((s) => s.trim()).filter(Boolean)
      if (samples.length === 0) {
        throw new Error('Paste at least one script sample first. Three or four work best.')
      }
      const resolved = await ctx.runQuery(internal.aiSettings.resolve, { task: 'scripts' })

      const sampleBlock = samples
        .map((sample, i) => `SAMPLE ${i + 1}\n${sample}`)
        .join('\n\n')
      const settings =
        `Profanity policy: ${PROFANITY_RULES[profile.profanity] ?? PROFANITY_RULES.none}\n` +
        `Pacing: ${PACING_HINTS[profile.pacing] ?? profile.pacing}\n` +
        `Energy: ${ENERGY_HINTS[profile.energy] ?? profile.energy}\n` +
        (profile.neverUse.length
          ? `Words and phrases this speaker must NEVER use: ${profile.neverUse.join(', ')}\n`
          : '') +
        (profile.signature.length
          ? `Signature words and phrases this speaker DOES use: ${profile.signature.join(', ')}\n`
          : '') +
        (profile.notes.trim() ? `Extra style notes from the creator: ${profile.notes.trim()}\n` : '')

      const result = await runChat(
        resolved,
        [
          {
            role: 'system',
            content:
              'You are an expert voice and speech analyst for YouTube creators. You study transcripts of how a creator actually talks and write a precise, practical voice guide that a scriptwriter follows to write new scripts that sound exactly like this person. Every observation must be concrete and grounded in the samples, never generic filler that could describe any speaker. ' +
              NO_DASH_RULE,
          },
          {
            role: 'user',
            content:
              `SPEECH SAMPLES (the creator's own words, as spoken)\n\n${sampleBlock}\n\n` +
              `CREATOR SETTINGS (hard rules, fold these into the guide)\n${settings}\n` +
              'Write a detailed persona voice guide for scriptwriters. Cover: overall tone and attitude; sentence length and structure; vocabulary level and characteristic word choices; rhythm and pacing; energy and how it shifts; humor style; how they open topics and transition; verbal tics, fillers, and catchphrases pulled from the samples; grammar quirks; profanity policy; and what this speaker never says or does. ' +
              'Write it as plain text with short section labels, describing the speaker in third person, under 450 words. No preamble, output the guide only.',
          },
        ],
        { maxTokens: 4000 },
      )

      const text = stripDashes(result.text).trim()
      if (!text) throw new Error('The model returned nothing. Try again.')
      return { text }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Extraction failed. Try again.'
      const cleaned = raw.replace(/^.*Uncaught Error:\s*/s, '').replace(/\s+at handler.*$/s, '')
      return { error: cleaned.trim() || 'Extraction failed. Try again.' }
    }
  },
})
