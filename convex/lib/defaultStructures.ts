// Default video structures (docs/idea-workflow-plan.md §5e), researched
// 2026-08-18 from creator-first-party and expert sources (see docs/
// structure-research.md for sources and validation). Replaces the interim
// Scripts Pro built-ins.
//
// PATTERN FORMAT (the same conventions the custom-structure editor teaches):
// - Markdown. `## Beats` is a numbered list; each beat is
//   `N. BEAT NAME (timing): PURPOSE: what it must do. WRITE: how to write it.`
// - Timings are percentages of runtime (or mm:ss for shorts).
// - Placement markers are literal tokens the Script Drafter honors:
//   [MIDWAY CTA]  [OUTRO CTA]  [DISCLAIMER]
// - A `## Rules` list carries retention rules the whole script must obey.
// - No em or en dashes anywhere (owner content rule).

export interface DefaultStructure {
  id: string // 'default:long1'
  name: string
  format: 'long' | 'podcast' | 'shorts'
  bestFor: string
  source: string // where this structure is documented; keep honest
  pattern: string
}

export const DEFAULT_STRUCTURES: DefaultStructure[] = [
  // ── Long form ──────────────────────────────────────────────────────────────
  {
    id: 'default:long1',
    name: 'The First-Minute Fortress',
    format: 'long',
    bestFor: 'High-energy entertainment, challenges, stunts, anything sold by a bold thumbnail promise.',
    source: "MrBeast's leaked internal production guide (2024): first-minute doctrine, expectation matching, wow moments, and segment responsibilities.",
    pattern: `## Beats
1. PROMISE PROOF (0% to 3%): PURPOSE: prove the thumbnail and title promise is real before anyone can click away. WRITE: open mid-action on the exact thing the title promised, no greeting, no channel intro.
2. STAKES AND RULES (3% to 8%): PURPOSE: define what winning and losing means so every later moment has tension. WRITE: one or two spoken lines that set the stakes, plus the single rule that makes it hard.
3. FIRST WOW (8% to 15%): PURPOSE: deliver a moment the viewer cannot see anywhere else, early. WRITE: escalate the scale or absurdity of the promise and call it out plainly.
4. ESCALATION LADDER (15% to 55%): PURPOSE: hold attention with visible progress. WRITE: 3 to 5 segments, each with its own micro promise and payoff, each bigger than the last; end every segment by teasing the next.
5. [MIDWAY CTA] (at 50%): place the midway call to action in one casual sentence between segments, never interrupting a payoff.
6. CRISIS POINT (55% to 75%): PURPOSE: make the outcome feel genuinely uncertain. WRITE: the moment it nearly falls apart; slow down and let the doubt breathe.
7. FINAL PAYOFF (75% to 95%): PURPOSE: pay the promise in full. WRITE: the biggest moment of the video, delivered exactly as the title implied.
8. BUTTON + [OUTRO CTA] (95% to 100%): PURPOSE: end on momentum. WRITE: one reflective line, then the outro call to action; stop immediately after.

## Rules
- The first minute decides everything: no setup that delays the promise.
- Every beat must either pay something off or open a new loop; no dead air.
- If a claim can be shown instead of said, show it and cut the sentence.`,
  },
  {
    id: 'default:long2',
    name: 'The Mystery Essay',
    format: 'long',
    bestFor: 'Documentary, video essays, investigations, geopolitics, history, explainers with a story.',
    source: "Johnny Harris's own breakdowns of his writing process (How I Write interview; Bright Trip course): three acts, visual anchors alternating with context bridges, front-loaded promise.",
    pattern: `## Beats
1. THE MYSTERY HOOK (0% to 5%): PURPOSE: open a question the viewer needs answered. WRITE: drop into the most striking fact or scene, then ask the question directly. No throat clearing.
2. WHY THIS MATTERS (5% to 10%): PURPOSE: attach the mystery to the viewer's world. WRITE: one bridge paragraph connecting the question to something the viewer already cares about. [DISCLAIMER] goes here if enabled.
3. ANCHOR ONE (10% to 30%): PURPOSE: give a concrete, vivid entry point. WRITE: tell the first real story or scene that embodies the question; specifics over summary.
4. CONTEXT BRIDGE (30% to 40%): PURPOSE: give exactly the background needed to understand the next anchor. WRITE: compressed explanation in plain language; cut anything the payoff does not need.
5. ANCHOR TWO, RAISED STAKES (40% to 60%): PURPOSE: deepen the mystery with a second concrete story that complicates the first. WRITE: introduce the twist or contradiction.
6. [MIDWAY CTA] (at 55%): one natural sentence, placed at a chapter turn.
7. THE RESOLUTION (60% to 85%): PURPOSE: answer the opening question honestly. WRITE: assemble the anchors into the answer; say clearly what is known, what is not.
8. THE LINGERING THOUGHT + [OUTRO CTA] (85% to 100%): PURPOSE: leave the viewer thinking. WRITE: zoom out to the bigger implication, one memorable closing line, then the outro call to action.

## Rules
- Alternate concrete story (anchor) with explanation (bridge); never two bridges in a row.
- Every act ends by sharpening the question, not just adding facts.
- First person is allowed and encouraged where the creator has a stake.`,
  },
  {
    id: 'default:long3',
    name: 'The HIVE Value Stack',
    format: 'long',
    bestFor: 'Educational talking-head videos, tips and systems, productivity, finance, tutorials.',
    source: "Ali Abdaal's first-party Ultimate Guide to YouTube (HIVE: Hook, Intro, Value, End screen) plus his scriptwriter George Blackman's documented process.",
    pattern: `## Beats
1. HOOK (0% to 4%): PURPOSE: show them what they are about to get and why it beats scrolling on. WRITE: state the transformation or result up front, or open with the most surprising fact from the body.
2. INTRO (4% to 8%): PURPOSE: earn trust fast. WRITE: one or two lines of credibility and a mini roadmap of the points to come. [DISCLAIMER] goes here if enabled. Keep it under 60 seconds of speech.
3. VALUE POINT ONE (8% to 30%): PURPOSE: deliver the first complete, standalone win. WRITE: claim, then story or example from the creator's material, then the actionable takeaway.
4. VALUE POINT TWO (30% to 50%): PURPOSE: deepen the promise. WRITE: same claim, example, takeaway shape; reference point one so the video feels cumulative.
5. [MIDWAY CTA] (at 50%): a single casual sentence between points.
6. VALUE POINT THREE (50% to 75%): PURPOSE: the best point, saved for those still watching. WRITE: flag it as the one most people miss.
7. SYNTHESIS (75% to 90%): PURPOSE: turn points into a system. WRITE: show how the points combine into one repeatable practice; give the smallest first step to do today.
8. END + [OUTRO CTA] (90% to 100%): PURPOSE: route retained viewers onward. WRITE: one sentence of summary, then the outro call to action pointing at the next video; end abruptly while energy is high.

## Rules
- Each value point must stand alone: a viewer arriving mid-video should still get a win.
- Order points good, better, best; never lead with the strongest.
- Cut every sentence that does not serve a point or a payoff.`,
  },
  {
    id: 'default:long4',
    name: 'The Misconception Flip',
    format: 'long',
    bestFor: 'Contrarian takes, myth-busting, science and education, "everything you know is wrong" videos.',
    source: "Derek Muller's (Veritasium) PhD research and public talks: presenting the common misconception first measurably improves learning; confusion then resolution beats plain explanation.",
    pattern: `## Beats
1. THE COMMON BELIEF (0% to 8%): PURPOSE: state the thing everyone believes so the viewer nods along. WRITE: voice the misconception sympathetically, in the words its believers actually use.
2. THE CRACK (8% to 15%): PURPOSE: introduce the fact that does not fit. WRITE: one concrete observation or result that the common belief cannot explain; let it feel uncomfortable. [DISCLAIMER] goes here if enabled.
3. THE FALSE FIXES (15% to 35%): PURPOSE: take the obvious counter-explanations seriously and eliminate them. WRITE: what people typically try or argue, and specifically why each fails; this is where the creator's experience lives.
4. [MIDWAY CTA] (at 45%): one sentence at the turn between eliminating and explaining.
5. THE REAL EXPLANATION (35% to 70%): PURPOSE: resolve the confusion. WRITE: build the correct model step by step from the evidence already shown; use the creator's own stories and numbers as proof.
6. THE STEEL MAN (70% to 82%): PURPOSE: earn credibility. WRITE: the strongest remaining objection, stated fairly, and why it still does not overturn the conclusion.
7. WHAT TO DO WITH THIS (82% to 95%): PURPOSE: convert understanding into action. WRITE: what the viewer should change starting today.
8. CLOSE + [OUTRO CTA] (95% to 100%): WRITE: restate the flip in one line ("you were told X, the truth is Y"), then the outro call to action.

## Rules
- Never mock the misconception or its believers; the viewer holds it.
- Confusion is the tool: raise the tension before resolving it.
- Every claim must trace to the provided materials, not invented evidence.`,
  },
  {
    id: 'default:long5',
    name: 'The Transformation Arc',
    format: 'long',
    bestFor: 'Challenges with a before and after, skill building, 30-day experiments, journey videos.',
    source: 'The challenge and experiment format as documented in the MrBeast production guide (stakes, wow moments, expectation matching) and widely analyzed creator practice (Colin and Samir coverage of challenge formats).',
    pattern: `## Beats
1. BEFORE + FLASH FORWARD (0% to 5%): PURPOSE: define the gap the video will close. WRITE: show the honest starting point, then a one-line tease of the end state without giving the result away.
2. THE COMMITMENT (5% to 12%): PURPOSE: lock in stakes. WRITE: exactly what is being attempted, the deadline, and what it costs if it fails. [DISCLAIMER] goes here if enabled.
3. MILESTONE ONE (12% to 30%): PURPOSE: early visible progress. WRITE: first attempt, first small win, first surprise; each milestone is its own mini hook and payoff.
4. MILESTONE TWO (30% to 48%): PURPOSE: raise difficulty. WRITE: progress plus the first sign that the plan will not survive contact with reality.
5. [MIDWAY CTA] (at 50%): one casual sentence between milestones.
6. THE LOW POINT (50% to 65%): PURPOSE: real doubt. WRITE: the setback that nearly ends the attempt; slow the pace, let the emotion be specific, name what almost made the creator quit.
7. THE ADJUSTMENT (65% to 80%): PURPOSE: show the insight that unlocked the finish. WRITE: what changed in the approach, told as a decision, not luck.
8. THE REVEAL (80% to 95%): PURPOSE: pay off the flash forward. WRITE: full before and after comparison with concrete numbers or evidence.
9. THE LESSON + [OUTRO CTA] (95% to 100%): WRITE: what transfers to the viewer's own attempt in one or two lines, then the outro call to action.

## Rules
- Progress must be visible and measurable at every milestone.
- The low point is mandatory; a frictionless arc reads as fake.
- Tease the reveal at least twice mid-video to hold the spanning loop.`,
  },

  // ── Podcast ────────────────────────────────────────────────────────────────
  {
    id: 'default:pod1',
    name: 'The Cold-Open Interview',
    format: 'podcast',
    bestFor: 'Flagship guest interviews; shows fighting first-five-minute drop-off.',
    source: 'Industry-standard cold-open practice as documented by podcast production guides (The Podcast Host, Resound) and the format popularized by top interview shows such as The Diary of a CEO.',
    pattern: `## Beats
1. COLD OPEN (0:00 to 1:00): PURPOSE: prove this episode is worth an hour before asking for anything. WRITE: script a 15 to 30 second teaser built from the guest's single most surprising claim, then one line on why this conversation matters now.
2. BRANDED INTRO (under 30 seconds): WRITE: short identity bumper, then out. [DISCLAIMER] immediately after, if enabled.
3. GUEST FRAMING (1:30 to 4:00): PURPOSE: stakes and credibility. WRITE: who this is, the one achievement that matters for this conversation, and the promise of the episode in a single sentence.
4. WARM-UP THREAD (first 15%): PURPOSE: rapport plus origin. WRITE: the personal backstory question that leads naturally into the main theme.
5. CORE BLOCKS (15% to 70%): PURPOSE: the substance. WRITE: 3 to 4 planned topic blocks, each opened with its own mini hook question and closed with a takeaway; place the strongest block first, not last.
6. [MIDWAY CTA] (at 50%): one natural host aside between blocks.
7. THE PEAK QUESTION (70% to 85%): PURPOSE: the moment the cold open teased. WRITE: the hardest or most anticipated question, given room to breathe.
8. REFLECTION + LIGHTNING CLOSE (85% to 95%): WRITE: shorter, personal, memorable questions; end warm.
9. WRAP + [OUTRO CTA] (95% to 100%): WRITE: where to find the guest, then the outro call to action and a next-episode tease.

## Rules
- The cold open must come from real episode material, never generic hype.
- Front-load the best block; assume half the audience leaves by the middle.
- Every block ends with a spoken takeaway the listener can repeat.`,
  },
  {
    id: 'default:pod2',
    name: 'The Solo Essaycast',
    format: 'podcast',
    bestFor: 'Solo expert episodes, monologue shows, audio essays.',
    source: 'Podcast industry scripting guidance (script the open; roadmap then point-by-point) combined with the HIVE value structure that solo creators such as Ali Abdaal document publicly.',
    pattern: `## Beats
1. HOOK CLAIM (0:00 to 1:00): PURPOSE: one sentence that makes the episode unmissable. WRITE: the boldest true claim of the episode, then the question it raises.
2. ROADMAP (1:00 to 2:00): PURPOSE: promise structure. WRITE: the 3 or 4 points coming, each in a curiosity-preserving phrase. [DISCLAIMER] goes here if enabled.
3. POINT BLOCKS (2:00 to 75%): PURPOSE: deliver. WRITE: for each point: claim, then a story or evidence from the creator's material, then the takeaway; explicit spoken transitions between points.
4. [MIDWAY CTA] (at 50%): one conversational sentence between points.
5. MID-EPISODE RE-HOOK (at ~55%): PURPOSE: rescue drop-off. WRITE: tease the best remaining insight ("the next part is the one that changed how I work").
6. SYNTHESIS (75% to 90%): PURPOSE: combine points into one lens. WRITE: how the points form a single way of thinking; the smallest action to take today.
7. CLOSE + [OUTRO CTA] (90% to 100%): WRITE: one-line summary of the claim, the outro call to action, end without trailing off.

## Rules
- Solo shows meander without structure: never leave a point without a spoken takeaway.
- Write for the ear: short sentences, concrete nouns, no lists longer than four.
- The re-hook is mandatory; place it before energy dips, not after.`,
  },
  {
    id: 'default:pod3',
    name: 'The Segmented Show',
    format: 'podcast',
    bestFor: 'News and recap shows, co-hosted shows, recurring community formats.',
    source: 'The recurring-segment magazine format as documented across podcast production guides (habit-forming segments, front-loaded marquee block, tease-forward bridges).',
    pattern: `## Beats
1. COLD TEASE (0:00 to 1:00): PURPOSE: sell today's strongest moment. WRITE: a scripted line teasing the best segment of the episode.
2. INTRO BUMPER + HOUSEKEEPING (under 60 seconds): WRITE: identity, date, one line of context. [DISCLAIMER] here if enabled.
3. MARQUEE SEGMENT (5% to 35%): PURPOSE: beat early drop-off. WRITE: the biggest story or topic first, structured as hook, discussion, takeaway.
4. SEGMENT TWO (35% to 55%): WRITE: the recurring format block the audience returns for; keep its ritual language consistent episode to episode.
5. [MIDWAY CTA] (at 50%): one sentence inside a segment turn.
6. TEASE-FORWARD BRIDGES (between every segment): PURPOSE: carry listeners across blocks. WRITE: one line: "coming up, the thing you actually came for."
7. SEGMENT THREE (55% to 80%): WRITE: the lighter or community-driven block (mail, questions, hot takes).
8. RECAP + NEXT-EPISODE TEASE + [OUTRO CTA] (80% to 100%): WRITE: the three takeaways of the episode, the tease that builds the habit loop, then the outro call to action.

## Rules
- Segments build habit only if their names and order stay consistent.
- The marquee block always goes first; never save the best for last.
- Every bridge teases forward; never recap backward mid-episode.`,
  },

  // ── Shorts ─────────────────────────────────────────────────────────────────
  {
    id: 'default:short1',
    name: 'The Hoyos Story Loop',
    format: 'shorts',
    bestFor: 'Story-driven shorts, challenges, money and value stories; the general-purpose viral short.',
    source: "Jenny Hoyos's publicly documented formula (Jay Clouse and My First Million interviews; YouTube's own Shorts team conversation): 1-second hook, foreshadowing, but/therefore chains, ~34 seconds, fifth-grade language.",
    pattern: `## Beats
1. ONE-SECOND HOOK (0:00 to 0:01): PURPOSE: stop the scroll instantly. WRITE: the most shocking or intriguing line of the whole idea, stated in the first breath; visual described in [brackets] should read like a thumbnail.
2. FORESHADOW (0:01 to 0:04): PURPOSE: set the destination so the viewer commits. WRITE: one line that tells them where this ends without giving the payoff away.
3. BUT/THEREFORE CHAIN (0:04 to 0:25): PURPOSE: momentum. WRITE: the story as 3 to 5 steps connected only by "but" and "so"; never "and then". Every step changes the situation.
4. PAYOFF (0:25 to 0:32): PURPOSE: deliver exactly what the foreshadow promised. WRITE: the result, concrete and visual, with a number if one exists.
5. LOOP LINE (final 2 seconds): PURPOSE: rewatchability. WRITE: a last line that connects back to the opening line so a rewatch feels seamless. [OUTRO CTA] only if it fits in five words or fewer.

## Rules
- Total target: 30 to 40 seconds; if a beat does not move the story, cut it.
- Fifth-grade vocabulary; one idea per sentence.
- No intro, no greeting, no context that the hook does not require.`,
  },
  {
    id: 'default:short2',
    name: 'The One-Second How-To',
    format: 'shorts',
    bestFor: 'Tips, hacks, tutorials, quick demonstrations.',
    source: "Shorts craft as discussed by YouTube's Shorts product team with Jenny Hoyos (YouTube official blog) and the retention-first shorts practice in the MrBeast production guide.",
    pattern: `## Beats
1. PROMISE FRAME (0:00 to 0:02): PURPOSE: name the exact outcome. WRITE: "here is how to X in Y" in the plainest possible words; the first frame is the promise.
2. WHY CARE (0:02 to 0:06): PURPOSE: attach a stake. WRITE: one line on what the viewer loses by doing it the old way.
3. FAST STEPS (0:06 to 0:28): PURPOSE: deliver with zero filler. WRITE: 2 to 4 steps, each one sentence, each starting with a verb; number them out loud.
4. PROOF (0:28 to 0:35): PURPOSE: show it worked. WRITE: the result in one concrete line (a number, a before and after).
5. BUTTON (final 2 seconds): WRITE: one-line kicker or the [OUTRO CTA] in five words or fewer; end mid-energy so the loop restarts cleanly.

## Rules
- Every second must earn the next: no setup longer than one line.
- Steps are spoken as imperatives; no theory inside the steps.
- If the tip needs more than four steps, it is a long-form idea, not a short.`,
  },
  {
    id: 'default:short3',
    name: 'The Withheld Number One',
    format: 'shorts',
    bestFor: 'Rankings, top-3s, comparisons, best-and-worst lists.',
    source: 'The countdown-with-withheld-payoff pattern, a documented spanning-loop technique in shorts analysis (Hoyos interviews on loops and foreshadowing; standard ranking-format practice).',
    pattern: `## Beats
1. STAKES HOOK (0:00 to 0:03): PURPOSE: open the ranking with a promise of surprise. WRITE: name the list and swear that number one is not what they think.
2. FAST LADDER (0:03 to 0:25): PURPOSE: rising interest. WRITE: run the items in ascending order, one line each; spend the least time on the obvious, the most on the surprising.
3. THE TEASE (woven throughout): PURPOSE: one loop carries the whole short. WRITE: after every item, one word or phrase re-teasing number one.
4. REVEAL (0:25 to 0:33): PURPOSE: pay off the withheld top spot. WRITE: number one with the single concrete reason it wins.
5. SNAP CLOSE (final 2 seconds): WRITE: a one-line verdict or challenge to disagree in the comments; [OUTRO CTA] only if five words or fewer.

## Rules
- Never reveal the count order visually before it is spoken.
- Each item gets exactly one reason; two reasons kill the pace.
- The number one must genuinely surprise or the format collapses.`,
  },
  {
    id: 'default:short4',
    name: 'The Before and After Reveal',
    format: 'shorts',
    bestFor: 'Transformations, makeovers, glow-ups, budget builds, progress stories.',
    source: "Foreshadow-the-destination shorts storytelling as documented in Jenny Hoyos's interviews (show where it ends, then earn it) applied to the transformation format.",
    pattern: `## Beats
1. AFTER FLASH (0:00 to 0:02): PURPOSE: prove the destination is worth 30 seconds. WRITE: describe the end state first in one stunning line, then promise to show how.
2. BEFORE (0:02 to 0:06): PURPOSE: establish the gap. WRITE: the honest, specific starting point; the worse it is, the stronger the pull.
3. THE WORK (0:06 to 0:26): PURPOSE: compress the journey. WRITE: 3 beats of progress connected with "but" and "so", including exactly one setback.
4. FULL REVEAL (0:26 to 0:34): PURPOSE: the payoff, bigger than the flash. WRITE: the after, described with one concrete number or comparison the flash did not include.
5. COST LINE (final 2 seconds): WRITE: what it took (time, money, attempts) in one line; that line is the share trigger. [OUTRO CTA] only if five words or fewer.

## Rules
- The opening flash shows less than the final reveal; save one detail.
- One setback is mandatory; smooth progress is skipped progress.
- Numbers beat adjectives everywhere in this format.`,
  },
  {
    id: 'default:short5',
    name: 'The Hot Take Defense',
    format: 'shorts',
    bestFor: 'Opinions, contrarian takes, industry commentary, myth-busting in under a minute.',
    source: "The claim-then-defend contrarian short, built on Derek Muller's misconception-first research (state the common view, then flip it) compressed to shorts pacing.",
    pattern: `## Beats
1. THE TAKE (0:00 to 0:03): PURPOSE: polarize instantly. WRITE: the contrarian claim as a flat statement, no hedging; the viewer should either nod hard or want to argue.
2. THE COMMON VIEW (0:03 to 0:08): PURPOSE: show you understand the other side. WRITE: the belief everyone holds, stated fairly in one line.
3. THE FLIP (0:08 to 0:22): PURPOSE: defend the take. WRITE: the two strongest reasons from the creator's experience, each one sentence of claim plus one of proof.
4. THE CONCESSION (0:22 to 0:28): PURPOSE: credibility. WRITE: the one case where the common view is right, in a single line.
5. THE RESTATE (0:28 to 0:34): PURPOSE: land it. WRITE: the take again, sharper, with the condition attached ("unless X, stop doing Y").
6. COMMENT BAIT (final 2 seconds): WRITE: one direct question inviting disagreement. [OUTRO CTA] only if five words or fewer.

## Rules
- The take must be arguable; if nobody disagrees, there is no video.
- Attack ideas, never the people holding them.
- Proof lines come from the creator's real experience, not statistics they cannot back.`,
  },
]
