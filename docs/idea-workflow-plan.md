# Idea Workflow — plan of record

Owner decision 2026-08-18. This document is the plan of record for rebuilding the
BreezyScript workflow around the **Idea Bank**: a single stepped pipeline that takes an
idea from capture to production. It supersedes the Scripts Pro flow for new work.

**Scripts Pro is frozen.** Do not modify `src/features/scripts/`, the
`c.$channelId.scripts.*` routes, or its Convex functions (`ideas`, `productions`,
`titles`, `foundationAssets`, `library`, `feedbackFns`) unless the owner explicitly asks.
The workflow uses **new tables** (prefix `bank*`) and may **read** existing tables
(e.g. `titleShapes`/`titleTemplates`) without changing their shape or functions.

## 1. Principles

- **Phone-first, phone-primary.** The owner drives this workflow from a phone. Stacked
  cards, one column, no left rail inside the workflow. Every interactive element must
  work flawlessly under touch: tap targets ≥ 44×44px, no hover-only affordances, no
  drag-only interactions (every drag/drop has a tap alternative), no accidental-tap
  hazards next to destructive controls. Verify each screen at 390px AND with touch
  interactions before calling it done.
- **Server-validated progression.** Step readiness is decided by Convex mutations, not
  the client. The client renders what the server says is unlocked.
- **Reuse the app's decided patterns**: state-driven docked action bar, compact list
  toolbar, explicit-submit search, confirm-dialog deletes (see CLAUDE.md).
- **LLM calls are now allowed** — but only from Convex actions, never the browser, and
  only through the common message format (§7). The old zero-LLM megaprompt rule now
  applies to Scripts Pro only.

## 2. The workflow

An idea moves through ordered steps. Each step must be **marked Ready** to unlock the
next. Step 1 is always unlocked.

| # | Step | Status | Ready criteria (server-enforced) |
|---|------|--------|----------------------------------|
| 1 | Idea | **built** | title, description, rating ≥ 1 |
| 2 | Potential Titles | **built** (incl. generation) | 3 non-empty titles + exactly one marked primary |
| 3 | Thumbnails | **built** | 1–3 thumbnails uploaded into slots |
| 4 | Leading Questions | **built** | answers transcript pasted (non-empty) |
| 5 | Research Collection | **built** | none — Ready declares materials complete |
| 6 | Script Drafter | **built** | a draft sent to refinement |
| 7 | Script Refinement | **built** | current refinement script non-empty (validated in `markRefineReady`; blanking it demotes) |
| 8 | Ready to Record | **built** | none — Ready declares the script reviewed (read-only view + full-screen teleprompter with auto-scroll speed control) |
| 9 | Publish Metadata | **built** | none — Ready declares metadata copied out (copy buttons for titles/description; thumbnails shown small with original file names for upload reference) |

The full "ready for script building" bar the owner set: idea title, description,
rating, three potential titles, three thumbnail ideas — i.e. steps 1–3 ready.

### Lock/unlock model

- `bankIdeas.readySteps: string[]` — canonical step ids in order, e.g.
  `['idea', 'titles']`. A step is **unlocked** iff every earlier step id is present.
  Step `idea` is always unlocked.
- `markStepReady(ideaId, step)` mutation validates that step's criteria against the
  document and appends the id. It throws with a human message listing what's missing.
- **Invalidation cascades:** any save that breaks a step's criteria (e.g. blanking a
  required title) removes that step's ready flag *and all later flags* in the same
  mutation. Readiness can never point at data that no longer qualifies.
- Marking Ready navigates the user forward: step N ready → jump to step N+1.

### Navigation

- Idea list row →
  - step 1 **not** ready: straight into the Step 1 edit view (the current editor) —
    a fresh idea *is* step 1.
  - step 1 ready: the **workflow overview** — stacked step cards, one per step.
- Card states: **ready** (check badge, tappable), **unlocked** (tappable), **locked**
  (lock icon, dimmed, not tappable). All later placeholder steps render as locked cards.
- Routes:
  - `/c/$channelId/bank` — list (unchanged)
  - `/c/$channelId/bank/new` — create (step 1 form)
  - `/c/$channelId/bank/$ideaId` — overview (redirects to `idea` until step 1 ready)
  - `/c/$channelId/bank/$ideaId/idea` — step 1
  - `/c/$channelId/bank/$ideaId/titles` — step 2
  - `/c/$channelId/bank/$ideaId/thumbnails` — step 3
- **No left rail anywhere in the bank tool.** The bank layout drops `LeftRail`; the
  list page gets a compact back-to-channel control; workflow views use their existing
  back links (step view → overview → list).

## 3. Step 1 — Idea

The current `BankIdeaEditor` minus the potential-titles section (titles move to
step 2). Fields: idea title, description, status, rating.

**Action bar** (the shared workflow bar; owner refinement 2026-08-18 — the
clean-state exit is ALWAYS one primary Ready button, never "Done"):

- dirty: `[Delete] … [Cancel] [Save]`
- clean, criteria not met: hint listing what's missing + `[Delete] … [Ready disabled]`
- clean, criteria met, not ready: `[Delete] … [Ready]` (marks ready, then closes)
- clean, already ready: `[Delete] … [Ready]` (just closes)

Ready calls `markStepReady`, then navigates to the overview (which now shows step 2
unlocked). Same bar recipe applies to every step; Delete only exists on step 1
(deleting the idea deletes the whole workflow).

## 4. Step 2 — Potential Titles

Top section: the three title fields (GrowInput) + primary-select circles, exactly the
control built on 2026-08-18 — moved here from step 1. All three required + one primary
before Ready.

Below: **Generate titles**.

- Takes every `titleTemplate` of the channel (read-only reads of the existing tables)
  and asks the configured "simple tasks" model (§6) to instantiate each template into a
  concrete title using the idea's title + description as context.
- Results render grouped by their shape (template's `shapeId` → shape name), all groups
  visible at once.
- Per candidate: a **heart** toggle (keep favorites across regenerations) and a
  **select** action that fills the next open title slot (max 3 selected; selecting a
  4th requires unselecting one). Selected candidates populate the three fields above,
  which stay editable.
- Candidates persist in `bankTitleCandidates` so hearts survive reloads; regeneration
  appends a new batch (hearted ones are kept, unhearted from prior batches may be
  cleared — cheap data).

## 5. Step 3 — Thumbnails

Layout mirrors YouTube's A/B test setup: three vertical variant cards (stacking on
phone), each showing a thumbnail slot + one of the three titles from step 2
(**read-only here** — editing happens only in step 2; primary title marked).

- Upload: tap a slot → file picker; drag-and-drop also works on desktop but is never
  the only path (touch mandate). `capture`-less `<input type="file" accept="image/*">`
  so the phone offers camera roll.
- **Client-side resize before upload** — feasible and the decided approach: canvas
  (`createImageBitmap` → cover-crop → `canvas.toBlob('image/jpeg', ~0.85)`) down to
  **334×188**; only the small version is stored (~15–35 KB). Originals never leave the
  device. `width`/`height`/`originalFileName` recorded for future reference.
- **Naming**: stored name is built as `<ideaId>-<slugified original basename>`;
  original file name kept verbatim in its own field.
- **Dedupe within an idea**: the same image may fill multiple slots but is stored once.
  Slots hold references (`thumbnailSlots: (Id<'bankThumbnails'> | null)[]`, length 3)
  to per-idea thumbnail docs. After upload, the file's `_storage` sha256 is compared
  against the idea's existing thumbnails; a match reuses the existing doc and deletes
  the fresh upload. Assigning an existing thumbnail to a second slot is also offered
  directly (tap slot → "use an uploaded thumbnail" strip) without re-uploading.
- Removing a thumbnail from its last slot deletes the doc + storage file (confirm
  dialog — it discards an upload).
- Ready: ≥ 1 slot filled → unlock step 4 and **jump straight to it**.

## 5b. Data ownership & the drafting → refinement → record flow (captured 2026-08-18, not built yet)

**General rule: every step is the source of truth for its own data, and earlier steps
stay editable forever.** Downstream steps *reference* upstream data (step 3 shows step
2's titles read-only; changing a title in step 2 changes it everywhere). Cascade
invalidation (§2) is the only guard — no hard-locking of earlier steps.

**The one big exception is Script Drafter → Script Refinement, which is a COPY:**

- **Script Drafter (step 6):** the user composes as many drafts as they want. To mark
  the step ready they pick exactly one draft; marking ready **copies** that draft into
  the refinement step. The original stays behind in step 6, preserved untouched.
- **Script Refinement (step 7):** holds **multiple refinement drafts with one selected
  as current**. Each refinement draft records which source draft it was copied from.
  If the user goes back to step 6 and picks a *different* draft to refine, the
  existing in-progress refinement is **not lost** — a new refinement draft is created
  from the new source and becomes current, while the previous one stays in the step's
  draft list in case the user changes their mind and re-selects it.
- **Ready to Record (step 8):** when refinement is marked ready, the currently
  selected refinement draft becomes the source for this step, which is **read-only**
  and offers a **teleprompter view toggle**.
- **Personalize text (owner spec 2026-08-18, built):** a button on the refinement
  step runs a deterministic, no-LLM pass over the current script — the user's custom
  phrase replacements FIRST (e.g. "going to" → "gonna"), then the enabled US English
  contraction patterns (full set in `src/features/bank/personalize.ts`, applied in
  Not → Would → Will → Be → Have → Other order so e.g. "I will not" → "I won't" and
  "I would have" → "I'd have"). Managed in **Settings → Word replacement**, whose
  sections mirror that flow order: 1 phrase replacements (builder with before/after),
  2 contractions (grouped checkboxes, all on by default, per-group all on/off;
  opt-outs in `bankWordPrefs`, custom pairs in `bankReplacements`). The transform
  edits the editor text in place (marks dirty) so the user reviews before saving.

## 5c. Step 4 — Leading Questions (spec'd 2026-08-18)

Goal: guide the creator into a **freeflow audio recording** that comprehensively brings
out their perspective, knowledge, experiences, and problem-solving on the topic. The
step produces a pasted transcript, not per-question typed answers.

Flow:

1. The step opens showing the **two must-answer questions** (fixed, always present):
   opposition ("who or what are you against here…") and the fear-free truth ("if you
   weren't afraid of what anyone thinks… what advice would you give").
2. **Generate 25 questions** — one LLM call (simple-tasks model) instantiates the
   reusable leading-questions prompt for this idea (title + description + titles).
   The prompt encodes interview craft, not subject matter, so it transfers across
   topics: only-the-creator-knows questions, moment-anchored (episodic) phrasing,
   viewer problems → what people try that fails → the creator's fix, a steel-man
   question, receipts (numbers/costs/timelines), cost-of-mistakes, easy→vulnerable
   ordering, fixed category set, one closing "what didn't I ask" question. Lives in
   `composeQuestionsPrompt` (convex/bankQuestions.ts).
3. Questions render grouped by category with a **multi-select circle** on the right
   (same control language as the titles primary selector, but many can be selected).
   Selected questions survive regeneration; unselected generated ones are replaced.
4. Bottom of the step: "Have you recorded your answers and converted to text? Paste
   here." — one large transcript textarea, saved to `bankIdeas.questionsTranscript`.
5. **Ready criterion: transcript non-empty.** Blanking it later demotes the step
   (cascade). The transcript is the raw interview material the Script Drafter
   consumes; unanswered/unselected questions can inform Research Collection.

Action-bar refinement (owner, 2026-08-18, applies to ALL steps): when a step is clean
and qualified but not yet ready, the bar shows a single primary **[Ready]** — it
replaces Done rather than sitting next to it. Done appears only when the step is
already ready or not yet qualified.

## 5d. Step 5 — Research Collection (spec'd + built 2026-08-18)

Supplements the leading-questions transcript with everything else the Script Drafter
needs. All materials are optional; **marking Ready is the owner's declaration that
the drafter has what it needs** (no per-field criteria).

- **Second Brain entries**: attach notes via an inline picker (explicit-submit search
  over `api.notes.list`). Stored as **references** (`bankIdeas.researchNoteIds`) — the
  notes are the source of truth; detaching only removes the reference (microcopy says
  so; no confirm needed per the delete rule's copy exception). Notes deleted from the
  Second Brain later surface struck-through as "Deleted note".
- **Additional research**: one large paste textarea (`researchText`) for articles,
  data, quotes.
- **CTAs**: `midwayCta` and `outroCta` grow-inputs (e.g. send viewers to a specific
  video in the outro).
- **Disclaimer toggle**: `includeDisclaimer` switch. When on, the Script Drafter must
  weave in the channel's **disclaimer snippet**, edited in **Settings → Script
  snippets** (new `bankSnippets` table, key `'disclaimer'`; e.g. "I am not a financial
  advisor, just some dude on the internet…"). The step previews the snippet and warns
  if it is empty.

## 5e. Step 6 — Script Drafter (spec'd + built 2026-08-18)

Settings-driven generation of complete spoken-word scripts; unlimited drafts.

- **Persona**: picked from the channel's `foundationAssets` personas; the default
  persona preselects. Its `promptSnippet` goes into the system prompt.
- **Length**: user enters minutes; target words = minutes × the channel's
  words-per-minute. WPM comes from **Settings → Reading pace**: the user reads a
  ~160-word sample aloud, the app times it and computes WPM (manual override too;
  stored in the existing `wordsPerMinute:<channelId>` userPref, clamped 60-260).
- **Structure**: picked from built-in blueprints (interim: the 22 Scripts Pro
  structures copied to `convex/lib/builtinStructures.ts`) plus the channel's own
  free-text blueprints (`bankStructures`, managed in **Settings → Video structures**).
  DONE (2026-08-18): the interim built-ins were replaced by 13 researched defaults in
  `convex/lib/defaultStructures.ts` (5 long-form, 3 podcast, 5 shorts) in an
  LLM-friendly md format with `[MIDWAY CTA]` / `[OUTRO CTA]` / `[DISCLAIMER]`
  placement markers the drafter honors; each carries source attribution shown in
  Settings, and the custom editor teaches the same conventions. Research and source
  validation: `docs/structure-research.md`.
- **Context guard**: a materials gauge estimates input tokens (chars/4 + scaffolding)
  against a conservative 60k-token budget, warns as it fills, and blocks generation
  (client and server) when over, telling the user what to trim.
- **Generation** uses the script-writing model (task class `scripts`); the prompt
  grounds the script ONLY in the collected materials (main title as the promise,
  alternates, description, structure blueprint, answers transcript as the creator's
  voice, notes, research, CTAs at midpoint/outro, disclaimer early if toggled),
  targets ±10% of the word budget, and obeys the no-dash rule + stripDashes.
- **Drafts** persist in `bankDrafts` with their settings snapshot (persona, structure,
  minutes, wpm, word count, provider/model). Tapping one opens a **full-screen
  reading preview** (Markdown, reading-width column) with Close and **Send to
  Refinement**.
- **Send to Refinement** is the §5b copy boundary: it copies the draft into
  `bankRefinementDrafts` (marked current; earlier refinement drafts preserved;
  re-sending the same draft re-selects its existing copy), records `draftSentRef`,
  and marks the step ready. Deleting a draft (confirm dialog) never touches a copy
  already in refinement.

## 6. Settings area

New **Settings card on the channel home dashboard** → `/c/$channelId/settings`
(channel-scoped page; the existing global `/settings` route stays as-is for channels).
Two sections to start:

### 6a. Title shapes & templates

Management UI for `titleShapes`/`titleTemplates` extracted into Settings — the
Scripts Pro titles page stays untouched; this is the same data surfaced in its new
home. (Cleanup/retirement of the Scripts Pro page happens later, on request.)

### 6b. AI integrations

Three provider sections: **Claude**, **OpenAI**, **Grok**.

- **Keys:** `.env.local` for local dev, Convex deployment env vars for real use
  (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`). Keys are read only inside
  Convex actions. No key is ever stored in a table or shipped to the browser; the
  settings UI shows only presence/absence (via an action that checks the env) and a
  "test connection" button.
- **Per provider, two model choices** stored in a new `aiSettings` table:
  - *Simple-tasks model* — title generation, leading questions, video descriptions.
  - *Script-writing model* — long-form drafting.
- **Active provider per task class**: `aiSettings` also records which provider is
  currently active for `simple` and for `scripts`, so the app has exactly one resolved
  `{provider, model}` per task class. (Open question 3 confirms this shape.)

## 7. Common LLM message format

One internal format; per-provider translation at the edge. All in `convex/llm/`:

```ts
// convex/llm/types.ts
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
type ChatRequest = {
  messages: ChatMessage[]
  taskClass: 'simple' | 'scripts'   // resolved to {provider, model} via aiSettings
  maxTokens?: number
  temperature?: number
  jsonSchema?: object               // ask for structured output where supported
}
type ChatResult = { text: string; provider: string; model: string; usage?: {...} }
```

- `convex/llm/index.ts` — `chat(ctx, req)`: resolves task class → provider/model,
  dispatches to the adapter, normalizes errors (missing key, rate limit, bad model)
  into user-readable messages.
- `convex/llm/anthropic.ts`, `openai.ts`, `grok.ts` — translate `ChatRequest` to each
  provider's HTTP API (system prompt placement, role mapping, token params) and back.
  Grok's API is OpenAI-compatible → thin wrapper over the OpenAI adapter with a
  different base URL/env key.
- Callers (title generation etc.) are Convex **actions** composing prompts from data
  they read via internal queries.

## 8. Data model (new/changed tables only)

```
bankIdeas (existing, extended)
  + readySteps: v.array(v.string())          // canonical step ids, in order
  + thumbnailSlots: v.optional(v.array(v.union(v.id('bankThumbnails'), v.null())))
  (potentialTitles + primaryTitleIndex stay; owned by step 2 UI now)

bankTitleCandidates (new)
  channelId, ideaId: v.id('bankIdeas')
  shapeName: v.string()                       // denormalized group label
  templateRef: v.string()                     // titleTemplates id as string, '' if ad-hoc
  text: v.string()
  hearted: v.boolean()
  batch: v.number()                           // generation batch counter
  .index('by_idea', ['ideaId'])

bankThumbnails (new)
  channelId, ideaId: v.id('bankIdeas')
  storageId: v.id('_storage')                 // the resized 334×188 image
  name: v.string()                            // `${ideaId}-${slug(originalBasename)}`
  originalFileName: v.string()
  width, height: v.number()
  .index('by_idea', ['ideaId'])

aiSettings (new; single doc or per-provider rows)
  provider: 'claude' | 'openai' | 'grok'
  simpleModel: v.string()
  scriptModel: v.string()
  activeSimple / activeScripts: stored once (see §6b)
```

Channel delete fan-out must cover the new tables (and thumbnails' storage files).

## 9. Build phases

> Status 2026-08-18: Phases A–D are **built and self-tested** against the
> `seedIdeaBank` fixture (`npx convex run seedIdeaBank:run`, channel
> "Creator Compass"). Live LLM generation awaits API keys
> (`npx convex env set ANTHROPIC_API_KEY …`); every no-key path degrades to a
> friendly message. Owner's manual end-to-end test still pending.

**Phase A — workflow shell (first, on owner's go):**
stacked step-card overview with lock/unlock + ready badges; `readySteps` +
`markStepReady` with per-step criteria + cascade invalidation; step routes; step 1
editor loses the titles section and gains the Ready bar; step 2 = manual titles +
primary + Ready (no generation yet); left rail removed from the bank tool; placeholder
locked cards for steps 3–9 (step 3 card unlocks but shows "coming soon" until Phase D).
*Done when:* an idea can be walked Idea → Titles with correct locking at 390px, touch-clean.

**Phase B — Settings + LLM plumbing:**
dashboard Settings card + `/c/$channelId/settings`; title-shapes management section;
AI integrations UI (key presence, test connection, model pickers, active providers);
`convex/llm/*` common format + three adapters; env var setup documented in `.env.example`.

**Phase C — title generation:**
generate button on step 2 → action instantiates every template via the simple-tasks
model; grouped-by-shape candidate list; hearts; select-up-to-3 → slots;
`bankTitleCandidates` persistence.

**Phase D — thumbnails step:**
A/B layout with read-only titles; tap-first upload; client resize to 334×188; naming +
originalFileName; per-idea dedupe + slot references; remove/replace with confirm;
Ready → jump to step 4 placeholder.

Later phases: steps 4–9, one at a time, same card/Ready mechanics.

## 10. Open questions

1. ~~Lock earlier steps once later ones are ready?~~ **Resolved 2026-08-18: no.**
   Earlier steps are always editable; cascade invalidation alone guards consistency.
   Steps own their data (see §5b); drafting→refinement is the only copy boundary.
2. Do hearted-but-unselected candidates need to survive template deletions? (Current
   answer: yes — candidates are denormalized copies, not references.)
3. Is one active provider per task class right, or should task→provider be per-task
   configurable later? (Start with per-class; revisit when more tasks exist.)
4. Rating threshold for step 1 readiness is ≥1 (any rating counts). Raise later?

## 11. Decisions log

- 2026-08-18 — Scripts Pro frozen; workflow rebuilt on `bank*` tables (owner).
- 2026-08-18 — zero-LLM rule narrowed to Scripts Pro; workflow uses real provider
  APIs from Convex actions with a common message format (owner).
- 2026-08-18 — phone-primary mandate strengthened: touch handlers must be flawless;
  no drag-only or hover-only interactions (owner).
- 2026-08-18 — thumbnails stored only as client-resized 334×188 copies (owner asked
  for feasibility; confirmed and adopted).
- 2026-08-18 — earlier steps always editable (cascade invalidation only); each step
  owns its data; Script Drafter → Refinement is a copy (originals preserved);
  Refinement keeps multiple drafts with one current; Ready to Record is read-only
  with a teleprompter toggle (owner).
