# Default video structures — research notes (2026-08-18)

Owner brief: research top-performing YouTubers whose actual format structures are
repeated and publicly documented (deep breakdowns, not shallow listicles), validate the
sources, design an LLM-friendly md structure format, and author 5 long-form + 3 podcast
+ 5 shorts defaults. Shipped in `convex/lib/defaultStructures.ts`.

## Source validation

Priority was creator-first-party material (the creator explaining their own repeated
structure) and primary documents, over third-party listicles:

1. **MrBeast internal production guide** (leaked 36-page onboarding doc, Sept 2024) —
   primary document, widely authenticated in reporting. First-minute doctrine
   (expectation matching against the thumbnail promise), wow moments, minute-segment
   responsibilities, no dead air. Used for: First-Minute Fortress, Transformation Arc,
   shorts retention rules.
   Sources: [Simon Willison's annotated excerpt](https://simonwillison.net/2024/Sep/15/how-to-succeed-in-mrbeast-production/),
   [Cybernews](https://cybernews.com/news/mrbeast-leaked-pdf-spills-secrets-how-to-be-successful-on-youtube/),
   [Dexerto](https://www.dexerto.com/youtube/leaked-mrbeast-pdf-reveals-youtubers-secrets-to-video-success-2900841/).
2. **Jenny Hoyos** (the most-cited shorts strategist; averages ~10M views/short) —
   first-party interview breakdowns: 1-second hook (shock, intrigue, satisfy),
   foreshadowing the ending, but/therefore chains (never "and then"), ~34-second
   target, fifth-grade language, loop endings. Used for: Hoyos Story Loop, Before and
   After Reveal, Withheld Number One.
   Sources: [Jay Clouse interview](https://www.afterword.tech/summaries/s/youtu-be-meet-the-youtuber-who-solved-shorts-jenny-hoyos-interview),
   [My First Million episode](https://www.mfmpod.com/the-formula-to-break-100-million-views-on-shorts-ft-jenny-hoyos/),
   [YouTube's official Shorts team conversation with Hoyos](https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/).
3. **Johnny Harris** — first-party process breakdowns (How I Write interview, Bright
   Trip visual storytelling course): three-act mystery, visual anchors alternating
   with context bridges, front-loaded promise. Used for: Mystery Essay.
   Sources: [How I Write interview](https://howiwrite.substack.com/p/johnny-harris-master-storytelling-b4e),
   [Bright Trip course](https://www.brighttrip.com/courses/visual-storytelling).
4. **Ali Abdaal** — first-party Ultimate Guide to YouTube: HIVE (Hook, Intro, Value,
   End screen); his scriptwriter George Blackman's documented multi-pass process.
   Used for: HIVE Value Stack, Solo Essaycast.
   Sources: [aliabdaal.com Ultimate Guide](https://aliabdaal.com/youtube/the-ultimate-guide-to-youtube/).
5. **Derek Muller (Veritasium)** — PhD research plus public talks: presenting the
   misconception first measurably improves learning; confusion then resolution beats
   plain explanation. Used for: Misconception Flip, Hot Take Defense.
   Sources: [Perimeter Institute talk coverage](https://perimeterinstitute.ca/news/youtubes-veritasium-brings-science-education-and-ai-learning-message-perimeter),
   [research paper record](https://www.researchgate.net/publication/252653862_Veritasium_science_videos_by_Derek_Muller).
6. **Podcast structure practice** — production-craft guides on cold opens, marquee-
   first ordering, tease-forward bridges, scripting the open; format popularized by
   top interview shows (The Diary of a CEO). Used for the three podcast structures.
   Sources: [The Podcast Host](https://www.thepodcasthost.com/presenting-your-podcast/podcast-intro-and-outro-tips/),
   [Resound](https://www.resound.fm/blog/podcast-intros).
7. **Paddy Galloway** (strategist for MrBeast, Ryan Trahan, etc.) — packaging-first
   philosophy ("the thumbnail and title sell the click, the first thirty seconds sell
   the watch") informs the promise-proof openers across the set.
   Sources: [Colin and Samir resource](https://www.colinandsamir.com/resources/the-new-rules-of-youtube-from-paddy-galloway).

Third-party summary sites were used only to locate and cross-check first-party
statements, never as the sole basis for a structure.

## The md structure format

Designed for both LLM comprehension and hand-authoring (the custom editor teaches it):

```md
## Beats
1. BEAT NAME (timing): PURPOSE: what this beat must accomplish. WRITE: how to write it.
...

## Rules
- retention rules the whole script must obey
```

- Timings are percentages of runtime for long/podcast, mm:ss for shorts.
- Placement markers are literal tokens the Script Drafter honors:
  `[MIDWAY CTA]`, `[OUTRO CTA]`, `[DISCLAIMER]`.
- No em/en dashes (owner content rule) so patterns model the style scripts must follow.

## The 13 defaults

Long form: First-Minute Fortress · Mystery Essay · HIVE Value Stack · Misconception
Flip · Transformation Arc.
Podcast: Cold-Open Interview · Solo Essaycast · Segmented Show.
Shorts: Hoyos Story Loop · One-Second How-To · Withheld Number One · Before and After
Reveal · Hot Take Defense.

Each carries a `source` attribution shown in Settings → Video structures.
