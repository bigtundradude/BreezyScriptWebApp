// Ported from BreezyScript scriptContextPro.ts — keep prompt text byte-faithful; do not edit wording casually.
// (Built-in video structures copied verbatim from builtinStructures.ts; field names camelCased for the web schema.)
//
import type { DefaultStructureContext } from '@/lib/megaprompt/context'

// Prebuilt script structures, vetted from documented creator practices and grouped
// by video length. Shape matches the structure-template builder (bsp_library kind
// 'video_structure'): each section's `beat` becomes a labelled block the writer fills,
// and `job` is the retention purpose / instruction for that beat.
//
// These are usable directly from the BreezyScript Lite script picker (filtered by the
// chosen format) and can be installed into the shared library from the Structures page,
// after which they behave like any user structure (and flow to Pro too).

export interface BuiltinStructure {
  id:           string   // 'builtin:s1' — stable id used by the Lite picker
  name:         string
  formatType:  'shorts' | 'medium' | 'long' | 'podcast'
  bestFor:     string
  pacingNotes?: string
  sections:     { beat: string; job: string }[]
}

export const BUILTIN_STRUCTURES: BuiltinStructure[] = [
  // ── Short-form (15–60s) ────────────────────────────────────────────────────
  {
    id: 'builtin:s1', name: 'The One-Second Promise', formatType: 'shorts',
    bestFor: 'Tips, hacks, did-you-know, quick demos.',
    pacingNotes: '20 to 40s. Aim ≥90% retention; cut on every beat, no dead air.',
    sections: [
      { beat: 'Visual title (0:00 to 0:01)', job: 'First frame reads like a thumbnail: instantly clear, states or implies the promise. Stop the scroll.' },
      { beat: 'Promise / open loop (0:01 to 0:04)', job: 'Say exactly what they will get, then withhold the payoff to open a knowledge gap.' },
      { beat: 'Fast build (0:04 to 0:20)', job: '2 to 4 tight steps, no filler. Maintain momentum.' },
      { beat: 'Payoff (0:20 to 0:30)', job: 'Deliver precisely what the hook promised.' },
      { beat: 'Rewatch button (last 2s)', job: 'A final beat that loops back or invites a re-watch.' },
    ],
  },
  {
    id: 'builtin:s2', name: 'The Micro-Story Arc', formatType: 'shorts',
    bestFor: 'Personal anecdotes, relatable moments, what-happened-when.',
    pacingNotes: '30 to 60s. Novelty, uncertainty and knowledge gaps drive completion.',
    sections: [
      { beat: 'In-media-res hook (0:00 to 0:03)', job: 'Drop into the most interesting moment; tease the outcome.' },
      { beat: 'Setup (0:03 to 0:10)', job: 'Minimum context needed to care.' },
      { beat: 'Tension / complication (0:10 to 0:25)', job: 'The obstacle or surprise; hold via an unresolved loop.' },
      { beat: 'Twist (0:25 to 0:45)', job: 'The unexpected beat. A novelty spike.' },
      { beat: 'Resolution + meaning (0:45 to 0:60)', job: 'Land the outcome and the takeaway.' },
    ],
  },
  {
    id: 'builtin:s3', name: 'The Countdown Tease', formatType: 'shorts',
    bestFor: 'Rankings, top-3, comparison shorts.',
    pacingNotes: '30 to 50s. One spanning loop (withheld #1) carries the video.',
    sections: [
      { beat: 'Stakes hook (0:00 to 0:03)', job: 'Name the list and tease that #1 is surprising.' },
      { beat: 'Fast items, ascending (0:03 to 0:35)', job: 'Less time on obvious items, more on the surprising ones.' },
      { beat: 'Withheld #1 (throughout)', job: 'Keep teasing the top spot. One big loop carries the whole video.' },
      { beat: 'Reveal #1 (0:35 to 0:50)', job: 'Pay off the tease with the strongest item.' },
      { beat: 'Snap-close button', job: 'One-line kicker; clean end / rewatch.' },
    ],
  },
  {
    id: 'builtin:s4', name: 'The Question Loop', formatType: 'shorts',
    bestFor: 'Myth-busting, explainers, why-does-X.',
    pacingNotes: '20 to 45s. A single sustained loop maximizes completion.',
    sections: [
      { beat: 'Provocative question (0:00 to 0:03)', job: 'Pose a question they cannot answer but want to.' },
      { beat: 'Raise the stakes (0:03 to 0:08)', job: 'Why it matters / why the obvious answer is wrong.' },
      { beat: 'Guided build (0:08 to 0:25)', job: 'Walk toward the answer in 2 to 3 steps, withholding the full reveal.' },
      { beat: 'Answer (0:25 to 0:40)', job: 'Resolve clearly and surprisingly.' },
      { beat: 'Re-question button', job: 'Loop thinking back to the start; comment bait.' },
    ],
  },
  {
    id: 'builtin:s5', name: 'The Satisfying Build', formatType: 'shorts',
    bestFor: 'Process, transformation, oddly-satisfying / ASMR.',
    pacingNotes: '20 to 45s. Visible progress and a clean close drive rewatches.',
    sections: [
      { beat: 'End-state tease (0:00 to 0:03)', job: 'Flash the finished result or the before.' },
      { beat: 'Start of process (0:03 to 0:08)', job: 'Establish the starting point; set the gap.' },
      { beat: 'Compressed progression (0:08 to 0:30)', job: 'Speed-ramped steps, each visibly closer to the goal.' },
      { beat: 'The reveal (0:30 to 0:42)', job: 'The satisfying finished payoff.' },
      { beat: 'Loop-back frame (last 2s)', job: 'End on a frame matching the opening for a seamless rewatch.' },
    ],
  },

  // ── Medium-form (5–12 min) ──────────────────────────────────────────────────
  {
    id: 'builtin:m1', name: 'The Four-Beat Standard (Hook · Intro · Value · End)', formatType: 'medium',
    bestFor: 'Educational, opinion, general-purpose talking-head.',
    pacingNotes: '6 to 10 min. Re-hook around the 50 to 60% mark.',
    sections: [
      { beat: 'Hook (0:00 to 0:30)', job: 'Question, surprising fact, or transformation promise. Validate the click; open a loop.' },
      { beat: 'Intro (0:30 to 1:15)', job: 'What the video delivers and why you are credible; tease the payoff.' },
      { beat: 'Value body (1:15 → last 90s)', job: 'The substance in clear segments. Insert a re-hook around the 50 to 60% mark.' },
      { beat: 'End (last 60 to 90s)', job: 'Recap the transformation; end-screen CTA to a related video.' },
    ],
  },
  {
    id: 'builtin:m2', name: 'The Pain-Point Fix (Problem · Pressure · Solve)', formatType: 'medium',
    bestFor: 'How-to, tutorials, fixes, stop-doing-X.',
    pacingNotes: '5 to 9 min. Lead with the felt problem to confirm the payoff instantly.',
    sections: [
      { beat: 'Problem hook (0:00 to 0:20)', job: 'Name the pain they feel right now.' },
      { beat: 'Pressure (0:20 to 1:00)', job: 'Show the cost of not fixing it / why common fixes fail.' },
      { beat: 'Promise the fix (1:00 to 1:30)', job: 'State the method and that it is coming in N steps.' },
      { beat: 'Solution steps (1:30 → last 60s)', job: 'Actionable steps in order; pattern-interrupt every 60 to 90s.' },
      { beat: 'Payoff + CTA (last 60s)', job: 'Show the resolved state; call to action.' },
    ],
  },
  {
    id: 'builtin:m3', name: 'The Quartet (Why · What · How · What-If)', formatType: 'medium',
    bestFor: 'Persuasive / educational: convincing the viewer to adopt a change.',
    pacingNotes: '7 to 11 min. Motivation first, mechanics second, future-state close.',
    sections: [
      { beat: 'Why (0:00 to 1:30)', job: 'Why this matters to them now. Motivation and emotional buy-in.' },
      { beat: 'What (1:30 to 3:30)', job: 'Define the concept / method clearly.' },
      { beat: 'How (3:30 → last 2m)', job: 'Practical application step by step; mid-point re-hook.' },
      { beat: 'What-if (last 1.5 to 2m)', job: 'Paint the transformed future / handle objections; CTA.' },
    ],
  },
  {
    id: 'builtin:m4', name: 'The Listicle Ladder', formatType: 'medium',
    bestFor: '"7 X that Y", tips, tools, ranked roundups.',
    pacingNotes: '6 to 12 min. Order to a climax and re-tease #1 to hold the spanning loop.',
    sections: [
      { beat: 'Promise hook (0:00 to 0:25)', job: 'Name the list; tease the best item is near the end.' },
      { beat: 'Quick credibility (0:25 to 0:50)', job: 'Why this list / why you.' },
      { beat: 'Items, ascending value (0:50 → last 90s)', job: 'Weakest→strongest; each item its own mini hook→payoff; re-tease #1.' },
      { beat: '#1 reveal + recap (last 90s)', job: 'Biggest payoff last; quick recap; CTA.' },
    ],
  },
  {
    id: 'builtin:m5', name: 'The Story-Driven Tutorial', formatType: 'medium',
    bestFor: 'Teaching wrapped in a personal narrative (how I…, case studies).',
    pacingNotes: '8 to 12 min. Tension built and released.',
    sections: [
      { beat: 'Result tease + hook (0:00 to 0:30)', job: 'Flash the outcome you achieved; promise the method.' },
      { beat: 'Stakes / backstory (0:30 to 1:30)', job: 'The problem you faced and why it mattered; open a loop.' },
      { beat: 'Journey in lessons (1:30 → last 2m)', job: 'Each lesson is a story beat AND a teachable step; close one loop, open the next.' },
      { beat: 'The turn (~50 to 60%)', job: 'The breakthrough or failure moment; mid-point re-hook.' },
      { beat: 'Resolution + takeaway + CTA (last 90s)', job: 'Land the result and hand over the framework.' },
    ],
  },

  // ── Long-form (15+ min) ─────────────────────────────────────────────────────
  {
    id: 'builtin:l1', name: 'The Staircase (Escalating Challenge)', formatType: 'long',
    bestFor: 'Challenges, experiments, "I did X for N days", stunt/ambition videos.',
    pacingNotes: '15 to 25+ min. Front-load, cycle energy, raise the bar each stage.',
    sections: [
      { beat: 'Cold-open hook (0:00 to 0:30)', job: 'State the challenge; tease the most extreme moment to come.' },
      { beat: 'Rules / stakes (0:30 to 1:30)', job: 'Constraints that create tension; what is at risk.' },
      { beat: 'Escalating stages', job: 'Each segment raises the bar with a bigger challenge or new element; cycle high/low energy.' },
      { beat: 'Mid-point twist (~50%)', job: 'A complication or raised stake to rescue the drop-off.' },
      { beat: 'Climax', job: 'Deliver the teased extreme moment.' },
      { beat: 'Resolution + outcome + CTA', job: 'Closure and the next video.' },
    ],
  },
  {
    id: 'builtin:l2', name: 'The Three-Act Documentary', formatType: 'long',
    bestFor: 'Story-driven mini-docs, profiles, investigations, rise-and-fall.',
    pacingNotes: '15 to 30 min. One master loop with nested sub-loops.',
    sections: [
      { beat: 'Cold open (0:00 to 1:00)', job: 'The most gripping moment or central question; open the master loop.' },
      { beat: 'Act I: Setup (→ ~25%)', job: 'World, characters, stakes. Build investment.' },
      { beat: 'Act II: Confrontation (→ ~75%)', job: 'Rising complications; nest smaller loops; re-hook at the midpoint.' },
      { beat: 'Act III: Resolution (final ~25%)', job: 'Climax, then close the master loop.' },
      { beat: 'Reflection / takeaway + CTA', job: 'Meaning and continuation.' },
    ],
  },
  {
    id: 'builtin:l3', name: 'The Video Essay (Thesis-Driven)', formatType: 'long',
    bestFor: 'Analysis, commentary, deep-dives, persuasive arguments.',
    pacingNotes: '15 to 40 min. Save the strongest point for last.',
    sections: [
      { beat: 'Hook + thesis tease (0:00 to 1:30)', job: 'Provocative claim or question; promise where the argument lands without spoiling it.' },
      { beat: 'Context / grounding (1:30 to 4:00)', job: 'What the viewer needs to follow the argument.' },
      { beat: 'Argument in escalating points', job: 'Each point backed by evidence; save the strongest for last.' },
      { beat: 'Counterpoint (~60 to 70%)', job: 'Address the obvious objection; build credibility and re-hook.' },
      { beat: 'Climax', job: 'The thesis fully landed.' },
      { beat: 'Resolution / so-what + CTA', job: 'The takeaway.' },
    ],
  },
  {
    id: 'builtin:l4', name: 'The Open-Loop Web (Multi-Thread)', formatType: 'long',
    bestFor: 'Ambitious vlogs, multi-storyline content, "we built the biggest…".',
    pacingNotes: '15 to 30 min. Multiple nested loops + energy cycling.',
    sections: [
      { beat: 'Front-loaded hook (0:00 to 0:45)', job: 'Tease several payoffs coming later; open multiple loops.' },
      { beat: 'Thread A', job: 'Open thread A, make partial progress, then cut. Leave it unresolved.' },
      { beat: 'Thread B', job: 'Open thread B with new energy; progress; call back to A.' },
      { beat: 'Continuous interleave', job: 'Never resolve everything at once; change something every 1 to 2 min; cycle energy.' },
      { beat: 'Convergence (~80 to 90%)', job: 'Threads pay off together for a compounding payoff.' },
      { beat: 'Button + CTA', job: 'Clean close and next step.' },
    ],
  },
  {
    id: 'builtin:l5', name: 'The Transformation Journey', formatType: 'long',
    bestFor: 'Long challenges with a before/after, skill-building, progress arcs.',
    pacingNotes: '15 to 25 min. Visible escalating progress with a mid-point setback.',
    sections: [
      { beat: 'Before + end-state tease (0:00 to 0:45)', job: 'Show the start and flash the transformation to come. Define the gap.' },
      { beat: 'Commitment / stakes (0:45 to 2:00)', job: 'What is being attempted and why it is hard.' },
      { beat: 'Progress in milestones', job: 'Each milestone a mini hook→payoff; visible progress; cycle energy.' },
      { beat: 'Low point / setback (~50 to 60%)', job: 'The moment it nearly fails; mid-point re-hook and emotional depth.' },
      { beat: 'Push to the finish + reveal', job: 'The climactic full transformation.' },
      { beat: 'Reflection + lesson + CTA', job: 'Close it out.' },
    ],
  },

  // ── Podcast ──────────────────────────────────────────────────────────────────
  {
    id: 'builtin:p1', name: 'The Scripted Cold Open', formatType: 'podcast',
    bestFor: 'Flagship interview or topic episodes wanting stronger completion.',
    pacingNotes: '30 to 90+ min. Counters the 20 to 35% first-five-minute drop with a scripted cold open + front-loaded value.',
    sections: [
      { beat: 'Cold open (0:00 to 1:30)', job: 'A scripted teaser or surprising clip from later; answer why this matters now.' },
      { beat: 'Branded intro (15 to 30s)', job: 'Short identity bumper, then get out.' },
      { beat: 'Context / guest framing (1 to 3m)', job: 'Who/what and the promise of the episode.' },
      { beat: 'Body in segments', job: 'Defined topic blocks; front-load the highest-value segment early.' },
      { beat: 'Recap + CTA / next-episode tease', job: 'Drive completion and cross-episode retention.' },
    ],
  },
  {
    id: 'builtin:p2', name: 'The Solo Deep-Dive', formatType: 'podcast',
    bestFor: 'Solo expert episodes, monologue / essay shows.',
    pacingNotes: '15 to 35 min. Solo shows need the tightest structure to avoid meandering.',
    sections: [
      { beat: 'Hook (0:00 to 1:30)', job: 'The single question or promise of the episode.' },
      { beat: 'Roadmap (1:30 to 2:00)', job: 'The 3 to 4 points you will cover.' },
      { beat: 'Point-by-point body', job: 'Each section: claim → story/evidence → takeaway; transition cleanly.' },
      { beat: 'Mid-episode re-hook (~50%)', job: 'A teased best insight or story to rescue drop-off.' },
      { beat: 'Synthesis + single CTA', job: 'Tie it together with one ask.' },
    ],
  },
  {
    id: 'builtin:p3', name: 'The Interview Arc', formatType: 'podcast',
    bestFor: 'Guest interviews (the dominant podcast format).',
    pacingNotes: '45 to 120+ min. Steered loops over a rigid script.',
    sections: [
      { beat: 'Cold-open teaser + intro (0:00 to 2:00)', job: 'Tease the guest\'s most compelling moment; quick credibility.' },
      { beat: 'Origin / warm-up (first ~15%)', job: 'Guest background; build rapport and stakes.' },
      { beat: 'Core exploration (the bulk)', job: 'Main themes; let it breathe but steer toward promised payoffs; each big topic a loop.' },
      { beat: 'Peak segment (~60 to 75%)', job: 'The most anticipated or contentious topic.' },
      { beat: 'Lightning round / reflection', job: 'Fast, personal, memorable close.' },
      { beat: 'Wrap + where to find guest + CTA', job: 'Send listeners onward.' },
    ],
  },
  {
    id: 'builtin:p4', name: 'The Segmented Magazine', formatType: 'podcast',
    bestFor: 'News/recap shows, co-hosted shows, recurring-format series.',
    pacingNotes: '30 to 75 min. Recurring segments build habit; tease forward to bridge blocks.',
    sections: [
      { beat: 'Cold open + intro (0:00 to 2:00)', job: 'Tease the strongest segment of the day.' },
      { beat: 'Recurring segment blocks', job: 'e.g. Headlines → Deep Dive → Hot Take → Mail; each block its own hook→payoff.' },
      { beat: 'Front-loaded marquee segment', job: 'Put the biggest block early to beat the 5-minute drop-off.' },
      { beat: 'Tease forward between segments', job: '"After the break, the thing you came for."' },
      { beat: 'Recap + next-episode tease + CTA', job: 'Build the habit loop.' },
    ],
  },
  {
    id: 'builtin:p5', name: 'The Listener Mailbag (Q&A)', formatType: 'podcast',
    bestFor: 'Community / Q&A episodes, AMAs, audience-driven shows.',
    pacingNotes: '20 to 60 min. A withheld marquee answer creates a loop that spans the episode.',
    sections: [
      { beat: 'Spiciest-question hook (0:00 to 1:30)', job: 'Open with the most intriguing question. Do not answer it yet.' },
      { beat: 'Quick frame (1:30 to 2:30)', job: 'What this episode is and how questions were chosen.' },
      { beat: 'Questions grouped by theme', job: 'Order easy→meaty; each answer = claim + story + takeaway.' },
      { beat: 'The teased question, answered (~70 to 80%)', job: 'Pay off the opener.' },
      { beat: 'Call for next round + CTA', job: 'Community loop and cross-episode retention.' },
    ],
  },
]

// Map a built-in into the PromptContext.defaultStructure shape.

export function builtinToStructureContext(s: BuiltinStructure): DefaultStructureContext {
  return {
    name: s.name, formatType: s.formatType, sections: s.sections,
    pacingNotes: s.pacingNotes ?? '', bestFor: s.bestFor,
  }
}
