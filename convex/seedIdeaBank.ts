import { internalMutation } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

// Idea Bank workflow fixture — separate from seed.ts (decision: workflow test
// data lives apart from the original demo data). `npx convex run seedIdeaBank:run`
// on a dev deployment. Re-runnable: reuses the channel by name and re-seeds its
// bank ideas, title shapes, and title templates from scratch. Never wire into UI.
//
// Theme: a channel that helps new YouTubers make better, more engaging videos
// and grow an online business around their channel.

const CHANNEL_NAME = 'Creator Compass'

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    // Reuse the fixture channel if it exists; otherwise create it.
    const channels = await ctx.db.query('channels').collect()
    let channelId = channels.find((c) => c.name === CHANNEL_NAME)?._id
    if (!channelId) {
      channelId = await ctx.db.insert('channels', {
        name: CHANNEL_NAME,
        description: 'Seeded workflow test data — helping new YouTubers grow',
        identity:
          'Brand: practical, encouraging, zero-hype YouTube education.\n' +
          'Point of view: consistent small creators beat viral one-offs; the channel is the top of an online business, not the business.\n' +
          'Stands for: audience-first packaging, honest analytics, repeatable systems.\n' +
          'Stands against: sub-4-sub tricks, algorithm superstition, burnout schedules.',
        updatedAt: now,
      })
    }

    // Wipe this channel's previous fixture rows so re-runs stay clean.
    for (const table of ['bankIdeas', 'bankTitleCandidates', 'bankQuestions', 'bankDrafts', 'bankRefinementDrafts', 'titleShapes', 'titleTemplates'] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_channel', (q) => q.eq('channelId', channelId))
        .collect()
      for (const row of rows) await ctx.db.delete(row._id)
    }
    const thumbnails = await ctx.db
      .query('bankThumbnails')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .collect()
    for (const thumbnail of thumbnails) {
      await ctx.storage.delete(thumbnail.storageId)
      await ctx.db.delete(thumbnail._id)
    }

    // ——— Bank ideas at every Phase A workflow state ———
    const ideas: Array<{
      title: string
      description: string
      rating: number
      status: 'new' | 'ready' | 'done' | 'do_again' | 'wont_do'
      potentialTitles: string[]
      primaryTitleIndex?: number
      readySteps: string[]
    }> = [
      {
        // Steps 1–2 ready → thumbnails unlocked.
        title: 'Your first 10 videos are practice',
        description:
          'Reframe the terrifying start: nobody watches your first uploads, and that is the feature, not the bug. Ten deliberate-practice videos, each drilling exactly one skill (hook, pacing, thumbnail, delivery), beat one "perfect" launch. Ends with a printable 10-video practice plan.',
        rating: 5,
        status: 'ready',
        potentialTitles: [
          'Your First 10 Videos Don’t Matter (Post Them Anyway)',
          'The 10-Video Practice Plan Every New YouTuber Needs',
          'Why Bad First Videos Make Great YouTubers',
        ],
        primaryTitleIndex: 0,
        readySteps: ['idea', 'titles'],
      },
      {
        // Steps 1–2 ready, second full-workflow candidate.
        title: 'Thumbnail psychology for tiny channels',
        description:
          'Big channels win with faces and brand recognition you do not have yet. What works under 1k subs: curiosity gaps built from contrast, three-word text max, and the "glance test": can a stranger say what the video is about from a phone lock screen? Includes 5 before/after redraws of real small-channel thumbnails.',
        rating: 4,
        status: 'ready',
        potentialTitles: [
          'Thumbnail Rules Small Channels Should Steal',
          'Why Your Thumbnails Fail the Glance Test',
          'I Redrew 5 Tiny-Channel Thumbnails (Watch Time Doubled)',
        ],
        primaryTitleIndex: 2,
        readySteps: ['idea', 'titles'],
      },
      {
        // Step 1 ready, titles in progress: two titles, no primary yet.
        title: 'The 1-hour script method',
        description:
          'A repeatable script system for people with day jobs: 10 minutes of bullet-point promises, 30 minutes writing only the spoken words, 20 minutes cutting every sentence that does not pay off a promise. The video drafts a real script on camera to prove the clock.',
        rating: 4,
        status: 'new',
        potentialTitles: ['Script Any Video in 1 Hour', 'The Day-Job YouTuber’s Script System'],
        readySteps: ['idea'],
      },
      {
        // Step 1 ready, nothing else started.
        title: 'Turn 100 subscribers into your first $1,000',
        description:
          'The online-business bridge for small channels: skip AdSense math and sell one tiny, specific digital product to the 100 people who already trust you. Covers picking the product from your comments, a one-page checkout, and why 100 true fans beat 10k drive-by views.',
        rating: 3,
        status: 'new',
        potentialTitles: [],
        readySteps: ['idea'],
      },
      {
        // Qualified for ready (title/desc/rating) but the user hasn't pressed Ready.
        title: 'Stop copying MrBeast',
        description:
          'Retention editing, 40-cut minutes, and $10k thumbnails are strategies for an audience you do not have. What actually transfers from big channels (promise clarity, payoff pacing) and what actively hurts small ones (frenetic cuts, giveaway economics).',
        rating: 2,
        status: 'new',
        potentialTitles: [],
        readySteps: [],
      },
      {
        // Fresh capture: unrated, not ready — the "just wrote it down" state.
        title: 'Comment-to-content pipeline',
        description:
          'Every confused comment is a video brief someone wrote for you. A system for harvesting comments (yours and competitors’), clustering them into questions, and turning the top cluster into next week’s video.',
        rating: 0,
        status: 'new',
        potentialTitles: [],
        readySteps: [],
      },
      {
        // Finished workflow topic marked done (list/status filter coverage).
        title: 'One year of analytics, honestly',
        description:
          'Screen-recorded walkthrough of a real first year: 80 subs by month 3, the video that changed the slope, CTR vs. average-view-duration trade-offs, and the three dashboards worth checking weekly (and the five that are superstition).',
        rating: 4,
        status: 'done',
        potentialTitles: [
          'My First Year on YouTube: The Real Numbers',
          'The Only 3 Analytics That Grew My Channel',
          'I Checked My Stats Every Day for a Year (Don’t)',
        ],
        primaryTitleIndex: 1,
        readySteps: ['idea', 'titles'],
      },
      {
        // Worth repeating later.
        title: 'Email list before merch',
        description:
          'Why an email list is the first business asset a creator should build: platform risk, launch power, and direct sales. A minimal stack (one landing page, one lead magnet from an existing video) that takes a weekend.',
        rating: 3,
        status: 'do_again',
        potentialTitles: [],
        readySteps: ['idea'],
      },
      {
        // Rejected idea for filter coverage.
        title: 'React to bad YouTube advice',
        description:
          'A reaction-format takedown of the worst "grow fast" advice on the platform. Rejected: punching down reads as drama-bait and does not fit the encouraging brand.',
        rating: 1,
        status: 'wont_do',
        potentialTitles: [],
        readySteps: [],
      },
    ]

    for (const idea of ideas) {
      await ctx.db.insert('bankIdeas', {
        channelId,
        title: idea.title,
        description: idea.description,
        potentialTitles: idea.potentialTitles,
        primaryTitleIndex: idea.primaryTitleIndex,
        rating: idea.rating,
        status: idea.status,
        readySteps: idea.readySteps,
        searchText: `${idea.title}\n${idea.potentialTitles.join('\n')}\n${idea.description}`,
        updatedAt: now,
      })
    }

    // ——— Title shapes + templates (fuel for the Phase C generate-titles step) ———
    const shapes: Array<{
      name: string
      tagline: string
      mechanism: string
      whatMakesItWork: string[]
      whatUnderminesIt: string[]
      templates: Array<{ pattern: string; exampleTitle: string; whyItWorks: string; triggers: string[] }>
    }> = [
      {
        name: 'Costly Mistake',
        tagline: 'Name the error the viewer is probably making right now.',
        mechanism: 'Loss aversion: avoiding a mistake feels more urgent than gaining a tip.',
        whatMakesItWork: ['Specific, common mistake', 'Implied fix inside the video'],
        whatUnderminesIt: ['Vague scolding', 'Mistakes nobody actually makes'],
        templates: [
          {
            pattern: 'The {mistake} that’s killing your {outcome}',
            exampleTitle: 'The intro mistake that’s killing your watch time',
            whyItWorks: 'Ties one concrete habit to a metric the viewer already worries about.',
            triggers: ['loss aversion', 'self-diagnosis'],
          },
          {
            pattern: 'Stop {common action} (do this instead)',
            exampleTitle: 'Stop asking people to subscribe (do this instead)',
            whyItWorks: 'Contradicts received wisdom, promises a replacement behavior.',
            triggers: ['pattern interrupt', 'curiosity'],
          },
        ],
      },
      {
        name: 'Numbered System',
        tagline: 'A finite, countable path through a scary topic.',
        mechanism: 'Concreteness: numbers promise bounded effort and a checklist payoff.',
        whatMakesItWork: ['Small numbers (3-10)', 'Steps the viewer can actually do'],
        whatUnderminesIt: ['Inflated counts', 'Steps that are really ads'],
        templates: [
          {
            pattern: '{n} {things} every new {role} needs',
            exampleTitle: '5 settings every new YouTuber needs to change',
            whyItWorks: 'Checklist framing lowers the cost of clicking, viewers can skim.',
            triggers: ['completeness', 'beginner identity'],
          },
          {
            pattern: 'The {n}-step system I use to {outcome}',
            exampleTitle: 'The 3-step system I use to script videos fast',
            whyItWorks: 'Personal proof plus a bounded promise of transferability.',
            triggers: ['social proof', 'system seeking'],
          },
        ],
      },
      {
        name: 'Honest Experiment',
        tagline: 'I did the thing so you don’t have to.',
        mechanism: 'Vicarious risk: the creator pays the cost, the viewer collects the lesson.',
        whatMakesItWork: ['Real stakes or duration', 'A measurable before/after'],
        whatUnderminesIt: ['Fake stakes', 'Results teased but never shown'],
        templates: [
          {
            pattern: 'I tried {method} for {duration}, here’s what happened',
            exampleTitle: 'I posted daily Shorts for 30 days, here’s what happened',
            whyItWorks: 'Time-boxed experiment implies honest, complete results.',
            triggers: ['curiosity', 'vicarious effort'],
          },
          {
            pattern: '{doing X} until {milestone}',
            exampleTitle: 'Posting one video a week until 1,000 subscribers',
            whyItWorks: 'Serialized stakes: the journey itself becomes the subscription hook.',
            triggers: ['journey', 'milestone anticipation'],
          },
        ],
      },
    ]

    let templateCount = 0
    for (const [shapeIndex, shape] of shapes.entries()) {
      const shapeId = await ctx.db.insert('titleShapes', {
        channelId,
        name: shape.name,
        tagline: shape.tagline,
        mechanism: shape.mechanism,
        whatMakesItWork: shape.whatMakesItWork,
        whatUnderminesIt: shape.whatUnderminesIt,
        sortOrder: shapeIndex,
        updatedAt: now,
      })
      for (const template of shape.templates) {
        await ctx.db.insert('titleTemplates', {
          channelId,
          pattern: template.pattern,
          exampleSource: 'seedIdeaBank fixture',
          triggers: template.triggers,
          structureNotes: '',
          transferability: 'high',
          whyItWorks: template.whyItWorks,
          outlierStrength: 'n/a',
          manual: true,
          shapeId,
          whyThisVariant: '',
          exampleTitle: template.exampleTitle,
          sortBoost: 0,
          updatedAt: now,
        })
        templateCount++
      }
    }

    const notesInserted = await seedResearchData(ctx, channelId, now)

    return {
      channelId,
      bankIdeas: ideas.length,
      titleShapes: shapes.length,
      titleTemplates: templateCount,
      notesInserted,
    }
  },
})

// Just the research-step fixtures (snippet + notes) without touching the rest —
// safe to run on an already-seeded channel: `npx convex run seedIdeaBank:researchFixtures`.
export const researchFixtures = internalMutation({
  args: {},
  handler: async (ctx) => {
    const channel = (await ctx.db.query('channels').collect()).find((c) => c.name === CHANNEL_NAME)
    if (!channel) throw new Error('Run seedIdeaBank:run first.')
    const notesInserted = await seedResearchData(ctx, channel._id, Date.now())
    return { channelId: channel._id, notesInserted }
  },
})

async function seedResearchData(ctx: MutationCtx, channelId: Id<'channels'>, now: number) {
    // Disclaimer snippet (upsert; edited in Settings → Script snippets).
    const existingDisclaimer = await ctx.db
      .query('bankSnippets')
      .withIndex('by_channel_key', (q) => q.eq('channelId', channelId).eq('key', 'disclaimer'))
      .unique()
    const disclaimerText =
      'Quick note: I am not a financial advisor, just some dude on the internet sharing what worked for me. Nothing in this video is financial or legal advice. Do your own research before making money decisions.'
    if (existingDisclaimer) {
      await ctx.db.patch(existingDisclaimer._id, { text: disclaimerText, updatedAt: now })
    } else {
      await ctx.db.insert('bankSnippets', { channelId, key: 'disclaimer', text: disclaimerText, updatedAt: now })
    }

    // A few Second Brain notes to attach in the research step. Only inserted
    // when the channel has none, so user-added notes are never wiped.
    const existingNotes = await ctx.db
      .query('notes')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .take(1)
    let notesInserted = 0
    if (existingNotes.length === 0) {
      const notes: Array<{ title: string; kind: 'research' | 'story' | 'quote'; body: string; tags: string[] }> = [
        {
          title: 'Retention study: first-30-seconds patterns',
          kind: 'research',
          body: 'Across 40 small-channel videos: intros that restate the title lose 18% more viewers than intros that add a stake the title did not promise. Cold-open footage beats talking-head opens in most cases.',
          tags: ['retention', 'analytics'],
        },
        {
          title: 'The night I almost deleted my channel',
          kind: 'story',
          body: 'Month four, 62 subscribers, a video that took 30 hours got 112 views. Wrote the deletion post, slept on it, and instead wrote down what I would tell a friend in my spot. That list became the practice-plan idea.',
          tags: ['origin', 'motivation'],
        },
        {
          title: 'MrBeast on first videos',
          kind: 'quote',
          body: '"Your first 10 videos are going to be bad. Your first 100 videos are practice. Make them anyway." Useful for the practice-plan video.',
          tags: ['quote'],
        },
      ]
      for (const n of notes) {
        await ctx.db.insert('notes', {
          channelId,
          title: n.title,
          body: n.body,
          kind: n.kind,
          tags: n.tags,
          searchText: `${n.title}\n${n.tags.join(' ')}\n${n.body}`,
          updatedAt: now,
        })
        notesInserted++
      }
    }
    return notesInserted
}
