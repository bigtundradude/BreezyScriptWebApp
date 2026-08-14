# BreezyScript Web — Detailed Implementation Plan

**Date:** 2026-08-14 · **Status:** Phases 1–4 built (same day); phase 5 (deploy) awaits the owner's interactive setup — see README.md
**Original status:** Phase-0 output (repo audit complete, no code written)
**Fulfills:** the output contract in `docs/breezyscript-web-migration-design.md` §9
**Evidence base:** four audit documents in `docs/audit/` — `second-brain-audit.md`, `scripts-pro-audit.md`, `design-system-audit.md`, `tauri-surface-audit.md` — each with file:line citations into the Tauri repo at `/Users/tundra/TundraTools/BreezyScript` (read-only; never modified).

Everything below marked **[observed]** is cited in an audit doc; **[inferred]** and **[proposed]** are marked as such.

---

## 0. Executive summary — what the audit changed

The brief's architecture decisions (§2) all survive contact with the repo. Five findings materially reshape the *work*, though:

1. **There are zero Rust commands and zero `invoke()` call sites.** [observed — tauri-surface §1] The entire data layer is SQL issued from the webview via `plugin-sql` through `src/lib/api/*.ts` modules. The brief's "invoke() → Convex mapping" (§5.3) becomes an **API-module → Convex function mapping** (§4 below) — a cleaner, near-mechanical port.
2. **The app makes zero LLM calls — by design.** [observed — scripts-pro §5, `.claude/llm.md:3-8`] All "AI" is the **megaprompt compose/apply loop**: the app builds a pasteable prompt from DB state, the user runs it in their own chatbot, and pastes the JSON reply back. No provider keys, no streaming, no long-running operations exist anywhere in the two tools. This collapses the brief's §5.2.7/§5.2.8 concerns and removes most Convex-action work from phases 2–3.
3. **Scripts Pro is much bigger than the brief hypothesized.** It is not "a script editor" — it is a 13-route production pipeline: ideas → 5-tab production editor (package / interview / Second Brain material / script / metadata) → review, fed by foundation assets (persona, audience, framework), a two-level title-template library, and video-structure/CTA/description libraries, closed by a feedback loop that rewrites the foundation snippets. [observed — scripts-pro §2–3]
4. **Everything is channel-scoped.** Both tools require an active "project" (= YouTube channel); a global header selector holds it in app state. [observed — second-brain §7, scripts-pro §8] The brief's proposed routes (§3) have no channel dimension. I propose putting the channel in the URL (§5), which also fixes an observed switch-channel-mid-edit bug class.
5. **There is no script versioning at all** [observed — scripts-pro §10] — `draft_markdown` is one overwritable column. The `stack-decision.md` §6 `scripts`/`scriptVersions` model does not match the repo; per that doc's own instruction, the repo wins (§3.1 below notes the mismatches).

No §2 decision is contradicted by the repo. One nuance to flag rather than relitigate: the desktop app's core identity is "fully local, nothing transmitted" (CSP-enforced) — moving to Convex inverts that. The owner has already accepted this by choosing Convex; noted in the risk register (§10) because the marketing copy and the `UsingYourAIPage` privacy claims must be rewritten, not copied.

---

## 1. Repo audit findings

Full findings live in `docs/audit/`. One-paragraph summaries:

- **Second Brain** (`second-brain-audit.md`) — a per-channel notes tool: one table (`sb_notes`: title, body, 10-value `kind`, tags, `source_ref`), three screens (list/search/filter, create, edit), explicit save, LIKE-substring search, hard delete. Its real job is being the material store for Scripts Pro: the **ingest surface** (`push`/`lookup` upsert on `(project, source_ref)`) receives finished scripts from Review, and the **SecondBrainPicker** copies note bodies by value into a production's brain dump. Zero LLM. Known defects worth fixing, not porting: unsaved-changes guard bypassed by rail nav, no unique constraint backing the ingest upsert key, id-only (unscoped) get/update/delete.
- **Scripts Pro** (`scripts-pro-audit.md`) — the production pipeline described above. 8 tables + reads of `clarity_profile` and `sb_notes`. Save semantics are precise and doctrine-documented: 700 ms debounced autosave with flush-on-blur/tab-change/unmount and merge-back-on-failure in the production editor; explicit save elsewhere. All prompt assembly is in `src/lib/scriptContextPro.ts` (1,359 lines of pure TS + DB reads) with per-task token budgets and an advisory draft-budget meter. A dead "hooks" pipeline (columns + compose/apply steps with no UI) should not be ported.
- **Design system** (`design-system-audit.md`) — already Tailwind v4 with a complete `@theme` token block (single dark theme, no light mode): zinc-based surfaces `#09090b → #27272a`, indigo primary `#818cf8`, deliberately-lifted text grays, 13px body, radius 6/8/10/12 scale, shadow-light border-driven elevation, ~150 ms `ease` motion, no fonts loaded (system stack). ~70% of styling is inline `style={{}}` px objects — the port converts these to token utilities. Native-chrome couplings are few and deletable (traffic-light padding, drag regions, 100vh shell). Zero responsive design exists.
- **Tauri surface** (`tauri-surface-audit.md`) — plugins-only; no Rust commands, no notifications, no tray/menus/deep links/auto-update, one secret (ElevenLabs key — Voice Pro, out of scope), one native-only UX (reveal-in-Finder, out of scope), backup = copy the SQLite file (replaced by Convex durability). Settings all live in a SQLite KV table with mixed encodings. Stale `.claude/ipc.md`/`database.md` describe a previous Electron architecture — ignored as spec.

---

## 2. Design token mapping — Tailwind v4 theme

The repo is already Tailwind v4 with tokens in `@theme` (`src/styles/globals.css:3-41`) [observed]. **The theme ports verbatim**; the work is (a) adopting the auto-generated utilities instead of the repo's `bg-[var(--color-…)]` bracket syntax and inline styles, and (b) mapping shadcn's expected CSS variables onto our tokens.

### 2.1 `src/styles/globals.css` for the web app [proposed — values observed]

```css
@import "tailwindcss";

@theme {
  /* Brand */
  --color-primary: #818cf8;
  --color-primary-hover: #6366f1;
  --color-primary-subtle: #1e1b4b;

  /* Surfaces (elevation = lightness, not shadow) */
  --color-bg: #09090b;
  --color-surface: #18181b;
  --color-surface-raised: #27272a;
  --color-header: #09090b;
  --color-sidebar: #111114;
  --color-sidebar-hover: #1c1c20;
  --color-sidebar-active: #27272a;

  /* Text — the two "lifted" grays are deliberate; do not snap to stock zinc */
  --color-text-primary: #f4f4f5;
  --color-text-secondary: #c4c4c8;
  --color-text-muted: #9b9ba3;
  --color-text-inverse: #09090b;
  --color-text-sidebar: #d4d4d8;

  /* Borders */
  --color-border: #3f3f46;
  --color-border-subtle: #27272a;

  /* Status */
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-caution: #fb923c;
  --color-danger: #f87171;
  --color-info: #60a5fa;
  --color-accent-purple: #c084fc;

  /* Tool accents (registry reconciled — see §2.3) */
  --color-tool-script: #a78bfa;
  --color-tool-brain: #f472b6;
  --color-tool-settings: #94a3b8;

  /* Radii (observed effective scale) */
  --radius-control: 6px;   /* dense controls, nav items */
  --radius-field: 8px;     /* buttons, inputs (rounded-lg) */
  --radius-row: 10px;      /* list cards, popovers — most common */
  --radius-panel: 12px;    /* cards, modals (rounded-xl) */

  /* Type — body is 13px; the app is denser than web defaults */
  --text-2xs: 11px;  /* badges, uppercase eyebrows */
  --text-xs: 12px;   /* hints, meta */
  --text-sm: 13px;   /* body default */
  --text-base: 14px; /* modal body, prose */
  --text-md: 15px;   /* card/modal titles */
  --text-lg: 18px;   /* page h2 */
}
```

Plus the ported globals: `:focus-visible` outline, 6px scrollbar styling **with a `scrollbar-color` fallback for Firefox** [proposed], and the `.md-body` prose block copied whole from `globals.css:79-114` [observed].

### 2.2 Mapping table: repo token → Tailwind utility → shadcn variable

shadcn (Radix build) components arrive styled against `--background`, `--foreground`, etc. Rather than renaming our tokens, define shadcn's variables **as aliases** in `:root` so pasted components work before restyling, then restyle each to our utilities as it's adopted (per §2.1 of the brief, shadcn's classes are boilerplate to replace):

| Repo token [observed] | Web utility | shadcn variable alias |
|---|---|---|
| `--color-bg` | `bg-bg` | `--background` |
| `--color-text-primary` | `text-text-primary` | `--foreground` |
| `--color-surface` | `bg-surface` | `--card`, `--popover` (popovers actually use surface-raised — restyle) |
| `--color-surface-raised` | `bg-surface-raised` | `--secondary`, `--muted`, `--accent` |
| `--color-text-muted` | `text-text-muted` | `--muted-foreground` |
| `--color-primary` | `bg-primary` / `text-primary` | `--primary`, `--ring` |
| `--color-text-inverse` | `text-text-inverse` | `--primary-foreground` |
| `--color-border` | `border-border` | `--border`, `--input` |
| `--color-danger` | `text-danger` | `--destructive` |
| `--radius-field` (8px) | `rounded-lg` | `--radius` |

Translucent fills use opacity utilities on tokens (`bg-success/12 border-success/30`), replacing both Badge's hardcoded rgba and the `${accent}18` hex-suffix idiom [observed defects — design audit §2].

### 2.3 Deliberate departures from the repo (styling)

All flagged per the brief's "web-adapted" instruction:

- **Delete:** traffic-light `paddingLeft: 80`, `data-tauri-drag-region` (2 sites), `.drag-region`/`.no-drag`, `NO_DRAG` const, dead `App.css`. [observed — design audit §8]
- **Replace:** `100vh + overflow:hidden` shell → `100dvh`; JS mouseenter hover handlers → CSS `hover:` utilities (also fixes keyboard/touch); memory router → real URLs.
- **Add (new, web-required):** responsive behavior (rail collapses to a sheet/drawer below ~900px; ListPage padding fluid), `prefers-reduced-motion`, subtle overlay enter/exit (Radix provides the hooks; keep ≤150 ms to preserve the "instant" feel).
- **Font:** **self-hosted Inter (variable, woff2)** — decision 2026-08-14: owner wants a quality web font with no licensing/patent gotchas that looks clean and professional. Inter is SIL OFL 1.1 (free for any use, no strings), designed specifically for UI text, and metrically close to SF Pro so the 13px-dense scale carries over. Self-hosted from `/public` (no Google Fonts request — keeps the app self-contained and fast). Stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`. Enable `font-feature-settings` defaults only; no display-font second family.
- **Accent registry reconciled:** Scripts Pro `#a78bfa` (the token wins over the dashboard's `#c084fc` — one of the two must be chosen; the token is the documented source of truth), Second Brain `#f472b6` promoted to a token. [observed inconsistency — design audit §9]

---

## 3. Convex schema

### 3.1 Departures from `stack-decision.md` §6 — rationale

That model predates the repo audit and the doc itself says the repo wins. Mismatches, noted not forced:

| stack-decision entity | Repo reality [observed] | Schema decision |
|---|---|---|
| `concepts` (separate table) | Folded into `bsp_productions.concept_json` | Embedded object on `productions` |
| `scripts` + `scriptVersions` | One `draft_markdown` column, **no versioning** | `productions.draftMarkdown` + new lightweight `draftSnapshots` (§3.3 — a deliberate improvement, see open question #4) |
| `stories` (own table) | Migrated into `sb_notes` with `kind='story'` in 2026-07 | Stay as notes; do not resurrect a stories table |
| `personas`/`audienceProfile`/`framework` as distinct shapes | Three literally identical tables served by one dynamic-SQL code path | **One `foundationAssets` table with a `type` discriminator** |
| `titleTemplates`, `hookStructures`, `videoStructures`, `ctas`, `disclosures` | `bsp_title_templates`+`bsp_title_shapes`; structures/ctas/disclosures/descriptions unified in `bsp_library.kind`; `hook_structure` kind declared but unused | Keep the repo's two-table title model and unified `libraryItems`; drop hooks entirely |
| `audioRenders` | Voice Pro `vp_*` tables | Out of scope this phase; schema reserved, not written |

### 3.2 Conventions

- `channels` replaces `projects` (name matches the UI language "channel"; drop vestigial `youtube_channel_id`).
- Every scoped table has `channelId: v.id('channels')` + a `by_channel` index. **Convex has no FK cascades** [observed risk — tauri-surface §8]: `deleteChannel` is an explicit fan-out mutation, and the two SET NULL edges (`productions.ideaId`, `feedback.productionId`) get explicit null-out in the respective delete mutations.
- Timestamps: explicit `updatedAt: v.number()` (plus `_creationTime` built-in) — fixes the repo's mixed ISO/SQL formats.
- Former json-in-text columns become typed objects — validation moves to the schema; keep *lenient parsing only at the megaprompt paste boundary* (model output is untrusted).
- Every function begins with `requireOwner(ctx)`, and every function that takes a document id **also asserts the doc's `channelId` matches the caller-supplied channel** — closing the repo's unscoped-by-id hole [observed — second-brain §7].

### 3.3 `convex/schema.ts` [proposed]

```ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const noteKind = v.union(
  v.literal('note'), v.literal('article'), v.literal('thought'),
  v.literal('book_review'), v.literal('script'), v.literal('quote'),
  v.literal('idea'), v.literal('transcript'), v.literal('research'), v.literal('story'))

const interviewBlock = v.object({
  id: v.string(),
  type: v.union(
    v.literal('informative'), v.literal('opinion'), v.literal('personal_story'),
    v.literal('third_party_narrative'), v.literal('case_study'),
    v.literal('problem_solving'), v.literal('manual'), v.literal('story'),
    v.literal('second_brain')),
  facet: v.string(),          // 'note:<noteId>' for second_brain blocks
  q: v.string(),
  a: v.string(),
})

export default defineSchema({
  channels: defineTable({
    name: v.string(),
    description: v.string(),
    identity: v.string(),        // free text; replaces the Clarity IDENTITY block in megaprompts (decision 2026-08-14)
    updatedAt: v.number(),
  }),

  // ——— Second Brain ———
  notes: defineTable({
    channelId: v.id('channels'),
    title: v.string(),
    body: v.string(),
    kind: noteKind,
    tags: v.array(v.string()),                    // native array, no JSON string
    sourceRef: v.optional(v.string()),            // 'scriptpro:<productionId>'
    searchText: v.string(),                       // title + '\n' + tags + '\n' + body, maintained by mutations
    updatedAt: v.number(),
  })
    .index('by_channel', ['channelId', 'updatedAt'])
    .index('by_channel_source', ['channelId', 'sourceRef'])   // backs the ingest upsert — the constraint the repo lacked
    .searchIndex('search', { searchField: 'searchText', filterFields: ['channelId', 'kind'] }),

  // ——— Scripts Pro ———
  ideas: defineTable({
    channelId: v.id('channels'),
    title: v.string(),
    angle: v.string(),
    sourceRef: v.string(),                        // '' | 'concept' | 'clarity:*' (legacy prefix kept for future use)
    status: v.union(                              // finished/rejected are new on web (decision 2026-08-14) — desktop backlog only grew
      v.literal('new'), v.literal('in_production'),
      v.literal('finished'), v.literal('rejected')),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  foundationAssets: defineTable({                 // replaces bsp_personas / bsp_audience_profiles / bsp_frameworks
    channelId: v.id('channels'),
    type: v.union(v.literal('persona'), v.literal('audience'), v.literal('framework')),
    label: v.string(),
    sourceInput: v.string(),
    result: v.any(),                              // model JSON; shape varies per type, validated leniently at apply
    resultMarkdown: v.string(),                   // rendered in code, never model-authored
    promptSnippet: v.string(),                    // the ONLY thing injected downstream; user-editable
    isDefault: v.boolean(),                       // one per (channel, type), enforced in mutation
    updatedAt: v.number(),
  }).index('by_channel_type', ['channelId', 'type']),

  titleShapes: defineTable({                      // custom shapes; 10 built-ins stay in code
    channelId: v.id('channels'),
    name: v.string(), tagline: v.string(), mechanism: v.string(),
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
    structureNotes: v.string(), transferability: v.string(),
    whyItWorks: v.string(), outlierStrength: v.string(),
    manual: v.boolean(),                          // hand-added vs mined
    shapeId: v.string(),                          // '' unsorted | 'shape:*' built-in | titleShapes doc id
    whyThisVariant: v.string(), exampleTitle: v.string(),
    sortBoost: v.number(),                        // written only by feedback re-rank apply
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  productions: defineTable({
    channelId: v.id('channels'),
    ideaId: v.optional(v.id('ideas')),            // explicit null-out on idea delete (was SET NULL)
    name: v.string(),
    format: v.union(v.literal('shorts'), v.literal('medium'), v.literal('long'), v.literal('podcast')),
    concept: v.object({
      workingTitle: v.string(), descriptionAngle: v.string(), audienceGap: v.string(),
      scores: v.optional(v.any()), rationale: v.optional(v.string()),
    }),
    titleCandidates: v.array(v.any()),            // {text, triggers?, scores{...}, rationale?}
    chosenTitles: v.array(v.object({ text: v.string(), main: v.boolean() })),  // ≤3, exactly one main; drop the redundant chosen_title scalar
    targetMinutes: v.number(),
    thumbnailCandidates: v.array(v.any()),
    chosenThumbnail: v.optional(v.any()),
    interview: v.array(interviewBlock),
    draftMarkdown: v.string(),
    metadata: v.object({
      description: v.optional(v.object({ firstLine: v.string(), body: v.string(), notes: v.optional(v.string()) })),
      chapters: v.array(v.object({ timestamp: v.string(), title: v.string() })),
      tags: v.array(v.string()),
    }),
    // hook_candidates / chosen_hook deliberately dropped — dead pipeline [observed]
    status: v.union(v.literal('building'), v.literal('ready'), v.literal('archived')),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId', 'updatedAt']),

  draftSnapshots: defineTable({                   // NEW — cheap safety net, not full versioning (open question #4)
    productionId: v.id('productions'),
    channelId: v.id('channels'),
    draftMarkdown: v.string(),
    reason: v.union(v.literal('apply_replace'), v.literal('manual')),
  }).index('by_production', ['productionId']),

  libraryItems: defineTable({
    channelId: v.id('channels'),
    kind: v.union(v.literal('video_structure'), v.literal('cta'), v.literal('disclosure'), v.literal('description')),
    title: v.string(), summary: v.string(),
    result: v.any(),                              // per-kind shape, see audit
    isDefault: v.boolean(),                       // one per (channel, kind)
    updatedAt: v.number(),
  }).index('by_channel_kind', ['channelId', 'kind']),

  feedback: defineTable({
    channelId: v.id('channels'),
    productionId: v.optional(v.id('productions')),
    title: v.string(), metrics: v.string(), sourceInput: v.string(),
    result: v.optional(v.any()),                  // PerformanceReport incl. applied_* stamps
    resultMarkdown: v.string(),
    updatedAt: v.number(),
  }).index('by_channel', ['channelId']),

  userPrefs: defineTable({                        // replaces the settings KV rows that are data, not UI chrome
    key: v.string(),                              // 'wordsPerMinute:<channelId>' | 'lastChannelId'
    value: v.any(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),
})
```

Pure-UI prefs (teleprompter font size/speed/etc., dismissed banners, debug flag) go to **`localStorage`**, not Convex — they're device-local chrome [observed classification — tauri-surface §3].

`wordsPerMinute` becomes **per-channel** (repo had it global despite feeding channel-specific prompts — flagged improvement; default 140 as today).

---

## 4. API-module → Convex function mapping

(Replaces the brief's invoke() table — no Rust commands exist [observed].) Naming: `convex/<domain>.ts` per module. Every function calls `requireOwner(ctx)` first.

### `src/lib/api/secondBrain.ts` → `convex/notes.ts`

| Repo fn [observed] | Convex | Notes |
|---|---|---|
| `notes.list({projectId, search, kind})` | `query notes.list({channelId, search?, kind?})` | search term → search index over `searchText`; empty search → `by_channel` index desc. 240-char snippet computed in JS. Add pagination if a channel exceeds ~200 notes (repo had none). **Search is explicit-submit** (Enter or search button), not per-keystroke — decision 2026-08-14; word/prefix match semantics accepted. Kind filter still applies instantly (indexed, cheap). |
| `notes.get({id})` | `query notes.get({channelId, id})` | adds channel assertion (repo was unscoped) |
| `notes.create({...})` | `mutation notes.create` | maintains `searchText` |
| `notes.update({id, ...})` | `mutation notes.update({channelId, id, ...})` | same |
| `notes.delete({id})` | `mutation notes.remove({channelId, id})` | hard delete, as today |
| `ingest.push({projectId, sourceRef, kind, title, body, tags})` | `mutation notes.ingestPush` | upsert via `by_channel_source` index; returns `{noteId, created}` |
| `ingest.lookup({projectId, sourceRef})` | `query notes.ingestLookup` | returns `{id, updatedAt} \| null` |

### `src/lib/api/projects.ts` → `convex/channels.ts`

| Repo fn | Convex | Notes |
|---|---|---|
| `list/create/update` | same, trivially | drop `youtubeChannelId` |
| `delete({id})` | `mutation channels.remove` | **explicit fan-out** across notes, ideas, foundationAssets, titleShapes, titleTemplates, productions, draftSnapshots, libraryItems, feedback (batched; a channel's data volume is small enough for one mutation, else chunked via scheduler) |
| `getActive/setActive` | replaced by **URL channel segment** + `userPrefs.lastChannelId` for the root redirect |

### `src/lib/api/scriptsPro.ts` (882 lines) → `convex/` split by domain

| Repo surface [observed] | Convex home | Kind |
|---|---|---|
| `ideas.list/create/update/delete` | `ideas.ts` | query + mutations (delete also null-outs no production — reverse edge is on productions) |
| `makeAssetApi` × {personas, audience, frameworks}: `list/get/create/update/delete/setDefault/saveSnippet/applyResult` | `foundationAssets.ts`, single API with `type` arg | mutations; `setDefault` clears siblings in-mutation (transactional — better than repo's two sequential UPDATEs) |
| `titleTemplates.*`, `titleShapes.*`, `applyMine` | `titles.ts` | `applyMine` inserts N templates in one mutation (repo did sequential inserts without a transaction) |
| `library.list/create/update/delete/setDefault/applyResult` | `library.ts` | |
| `productions.list/get/create/update/delete/setStatus` | `productions.ts` | `create` seeds concept + flips idea status in one mutation; `update` is the autosave patch target; apply-draft-replace writes a `draftSnapshots` row first |
| `applyStep('package')`, `applyStep('metadata')`, `applyConcepts`, `applyFeedback`, approve-appliers | `apply.ts` | **mutations** — parse the pasted reply client-side (parseJsonLenient is pure TS, keep it client-side so errors surface instantly without a round trip), pass validated JSON to the mutation, which re-validates shape server-side. Interview seeding keeps the repo's non-destructive dedupe semantics. |
| `composeStep`, `composeConcepts`, `composeAsset`, `composeMine`, `composeFeedback`, `buildDraftPrompt`, `computeDraftBudget` | **client-side `src/lib/megaprompt/`** — a near-verbatim port of `scriptContextPro.ts` + `tokenBudget.ts`, with DB reads swapped for a single `query scripts.promptContext({channelId, ...})` that returns snippets/templates/library context in one round trip | pure TS; no secrets involved, so no need for an action. [proposed — keeps compose instant and testable] |
| `gatherIdentityContext` (read `clarity_profile`) | replaced: `promptContext` returns `channels.identity` (free text), injected as the IDENTITY block where non-empty; omitted when blank, matching the repo's graceful degradation | decision 2026-08-14 — Clarity itself does not migrate |
| dead: `composeStep('titles'\|'thumbnails'\|'interview'\|'hooks')`, hook columns | **not ported** [observed dead — scripts-pro §3] |

### Modules that vanish

`db.ts` (wholesale), `backup.ts` (Convex durability + a later export-JSON action if wanted), `settings.ts`/`useToolSetting` (split: `userPrefs` table vs localStorage), `debug.ts` (replaced by a `seed.ts` internal mutation for dev fixtures, if desired — open question #10), `elevenLabs.ts`/`voicePro.ts`/`pdf.ts` (out of scope).

---

## 5. Route map

TanStack Router, file-based, `basepath: '/app'` (paths below are router-relative per the brief §2.2). **The channel joins the URL** — it is the tenancy scope of every query [observed], and URL-scoping fixes the repo's switch-channel-mid-edit hole [observed — second-brain §7].

```
/                                → root: redirect to /c/$lastChannelId (userPrefs), else channel-create onboarding
/settings                        → channel management (create/rename/delete, per-channel Identity text), account
/c/$channelId                    → home/launcher for the channel: two tool cards (replaces "Flow" dashboard chrome-free)
│
├─ /c/$channelId/brain                       → Second Brain: notes list
│    search params: ?q=<search>&kind=<kind>          [reload-preserved filters — brief §3]
├─ /c/$channelId/brain/new                   → new note
├─ /c/$channelId/brain/$noteId               → edit note
│
├─ /c/$channelId/scripts                     → redirect → build
├─ /c/$channelId/scripts/build               → productions list
│    ?tab=drafts|ready|archived                      [status bucket]
├─ /c/$channelId/scripts/build/$productionId → 5-tab production editor
│    ?tab=package|interview|material|script|metadata [the tab IS navigation state]
├─ /c/$channelId/scripts/review/$productionId
├─ /c/$channelId/scripts/ideas
├─ /c/$channelId/scripts/feedback
│    ?selected=$feedbackId                           [master-detail selection]
├─ /c/$channelId/scripts/foundations/$type   → type ∈ personas|audience|framework (one route, param'd — mirrors the shared FoundationAssetPage)
│    ?selected=$assetId
├─ /c/$channelId/scripts/titles              → shape grid
│    ?shape=$shapeId                                 [grid vs detail view]
└─ /c/$channelId/scripts/library/$kind       → kind ∈ structures|ctas|descriptions
```

**State placement rules** (brief §3: "prefer search params over component state"):
- **Search params:** every filter, active tab, master-detail selection, shape drill-down — all listed above. Each was ephemeral `useState` in the desktop app [observed]; this is the concrete web-adaptation win.
- **Component state:** in-flight form fields (guarded by dirty tracking), megaprompt paste box contents, teleprompter playback.
- **localStorage:** teleprompter display prefs, dismissed banners.
- **Convex:** everything durable.

Flattening note (brief §3): the "Flow" wrapper's only real content was the dashboard grid and the rail's "Flow tools" back-link [observed]. Both tools become top-level under the channel; the back-link target becomes `/c/$channelId`. Adding a third tool later = one new route subtree + one card. The Flow-level shared state that needed rehoming is exactly: `activeProjectId` (→ URL), AppShell chrome slots (→ route-level layouts), first-run channel gate (→ root route guard).

---

## 6. Component inventory

Classification per brief §2.1 (line: does it manage focus, keyboard nav, or floating position?).

### Take from shadcn (Radix variant) — added one at a time, at first need

| Component | Replaces [observed repo counterpart] | Justification |
|---|---|---|
| **Dialog** | `Modal` (hand-rolled portal, focus restore, Esc/backdrop) | focus trap + restore, scroll lock |
| **AlertDialog** | `ConfirmModal` / `useConfirm` | same + role=alertdialog semantics; keep the promise-hook wrapper |
| **Select** | custom `Select` (hand-rolled body portal, re-anchoring, flip-up) | floating position + typeahead + keyboard nav — the exact failure modes §2.1 warns about |
| **Popover** | `Popover` (hand-rolled fixed-position portal + arrow) | collision detection, dismissal |
| **Tooltip** | (new; repo used `title=` attributes) | positioning |
| **Toast** (sonner or Radix Toast) | `NoticeToast` + `SaveErrorBanner` | timers, swipe dismissal, a11y announcements; restyle to the pill look |
| **DropdownMenu** | `ProjectSelector`'s hand-rolled dropdown → channel switcher | keyboard nav, typeahead |
| **Tabs** | `Tabs` | roving tabindex/arrow-key nav; re-add the decorative `flow` arrow variant on top |
| **ScrollArea** | (only if the styled-scrollbar port proves fiddly cross-browser) | optional |

### Hand-written against our tokens (15–30 lines each)

`Button` (variants primary/secondary/ghost/danger, sizes sm/md/lg, `loading`, `iconOnly`), `LinkButton`, `Input`, `Textarea` (+`bare`), `SearchInput`, `Badge`, `Card`/`CardHeader`/`CardSection`, `Toggle` (native `role="switch"` button — simple enough to own), `Spinner`, `EmptyState`, `Skeleton`, `Separator`, `ProgressBar`, `RatingStar`, `FileDropzone`, `CopyButton`, `CopyBlock`.

Layout chrome (all hand-written): `AppShell` (route-layout composition — **replaces the imperative `setToolName`/`setLeftRail` slot pattern** [observed], which fights route-driven rendering), `Header` (+ channel switcher), `LeftRail` (**with section-header support**, unifying the fork that made `BreezyScriptProNav` hand-roll its own rail [observed]), `ListPage`, `ListCard` (auto-chevron rule preserved), `RouteError`.

### Custom-complex (ported/rebuilt with care — these carry the product)

| Component | Source | Notes |
|---|---|---|
| **MegapromptPanel** | `MegapromptPanel.tsx` | the signature primitive; port behavior exactly (copy confirmation 2.5 s, auto-open paste box, `onApply` false-keeps-paste, friendly errors) |
| **MarkdownEditor** | `script-shared/MarkdownEditor.tsx` | `field-sizing: content` auto-grow + fallback, toolbar, inline preview |
| **Markdown** | `Markdown.tsx` | react-markdown + remark-gfm + `.md-body`; keep `renderLink` hook |
| **ScriptPreview / Teleprompter** | `ScriptPreview.tsx` | Esc/Space keys, prefs → localStorage |
| **SecondBrainPicker** | `script-shared/SecondBrainPicker.tsx` | 200 ms search, copy-by-value semantics, facet dedupe |
| **SendToSecondBrainButton** | shared | label state machine Send→Update→In |
| **PillInput** | `PillInput.tsx` | Enter/comma/blur commit, backspace-pop, lowercase dedupe |
| **useAutosave** | shared hook | 700 ms debounce, flush points, merge-back-on-failure — **the save semantics are the product; port exactly**, layered on a Convex mutation + optimistic update |
| **UnsavedChangesGuard** | shared | rebuilt on TanStack Router's navigation blocking + `beforeunload` — closing the repo's rail-bypass hole |
| **Interview drag-reorder** | in ProductionDetailPage | small pointer-based reorder; no DnD library (two moving parts rule) |
| **CopyMenu** | on Popover | three copy formats |
| **CommandPalette** (phase 4) | new; shadcn `Command` | the one genuinely new component |

---

## 7. Screen-by-screen build order

Refines the brief's §8 phases. Each step is deployable/testable before the next.

**Phase 1 — Skeleton** (everything here blocks everything else)
1. Scaffold: Vite (`base:'/app/'`) + React 19 + TS + TanStack Router (`basepath:'/app'`) + Tailwind v4 theme (§2) + self-hosted Inter + `@tanstack/devtools-vite` (no panel).
2. Convex project: schema (§3), `requireOwner`, Convex Auth Google (`openid email profile` only).
3. Build script producing `dist/` = landing stub at `/` + SPA under `/app/` + `_redirects` at `dist/_redirects` (`/app/* /app/index.html 200`); Cloudflare Pages project + Access policy on `/app*`.
4. App shell: Header (+ channel switcher — owner runs 3 channels), LeftRail, root/channel routes, channel CRUD incl. the per-channel Identity textarea + first-run gate, sign-in screen.
5. **Gate: deep-link hard-refresh verified on a deployed preview (`/app/c/<id>/scripts/build/<id>`), `/` still serves landing.**

**Phase 2 — Second Brain end-to-end** (proves the whole architecture)
6. `notes.*` Convex functions + search index; dev seed mutation (decision #10).
7. Notes list (ListPage/ListCard/EmptyState/SearchInput/Select) with `?q&kind` in URL; search is explicit-submit (Enter/button — decision #9).
8. Note editor: explicit Save button + **Cmd/Ctrl+S** (decision #5) + UnsavedChangesGuard incl. rail nav and `beforeunload`; delete with AlertDialog.
9. Ingest surface (`ingestPush`/`ingestLookup`) + `SendToSecondBrainButton` (dormant until phase 3 wires its call site).
10. Offline posture v1 (§8): connection indicator + local draft buffer on the note editor.
11. **Gate: daily-usable Second Brain on the deployed URL.**

**Phase 3 — Scripts Pro** (dependency-ordered; the megaprompt port fans out)
12. Port `scriptContextPro.ts` + `tokenBudget.ts` → `src/lib/megaprompt/` with `promptContext` query (IDENTITY block now sourced from `channels.identity`; hook composer paths excluded); unit-test prompt output against strings captured from the desktop app.
13. `MegapromptPanel` + `Markdown` + `MarkdownEditor`.
14. Foundations: `foundationAssets.*` + FoundationAssetPage (one param'd route × 3 types) — first real compose/apply loop.
15. Libraries: `libraryItems.*` + LibraryPage (structures/ctas/descriptions) + built-in structure presets.
16. Titles: `titles.*` + shape grid/detail + mining flow + built-in shapes in code.
17. Ideas: `ideas.*` + IdeasPage + concept compose/apply.
18. Productions list + create (+ idea → Build hand-off).
19. Production editor tab-by-tab: Package (compose/apply + title A/B picker + thumbnail picker) → Interview (autosave + budget meter + drag-reorder) → Material (SecondBrainPicker — **the cross-tool hand-off**) → Script (draft apply w/ snapshot + replace-confirm, editor, pacing pill, teleprompter) → Metadata.
20. ReviewPage + status lifecycle + Send-to-Second-Brain (closes the loop both directions).
21. Feedback: `feedback.*` + FeedbackPage + approve-appliers (audience snippet append, template re-rank).
22. Setup page (rewritten copy — the desktop privacy claims don't transfer verbatim).
23. **Gate: one real video produced start-to-finish on the web app.**

**Phase 4 — Polish**
24. Command palette (channel/tool/production jump), keyboard shortcuts (Cmd+S = save/flush per surface, Cmd+K = palette).
25. Offline posture v2 hardening (§8), empty/error states pass, responsive pass (rail sheet, fluid padding), reduced-motion.

**Phase 5 — Cutover**
26. Production deploy, custom domain, Access policy verified, landing page real copy.
27. Owner runs both apps in parallel for a week or two (no data migration — clean start, confirmed); then retire the Tauri app.

---

## 8. Offline strategy [proposed — explicit decision per brief §5.4]

**Posture: online-first with a visible connection state and local draft insurance for long-form typing. Not offline-first.** (Full offline parity is a §10 non-goal.)

Mechanisms:
1. **Convex reactive queries + optimistic updates** on every autosaved mutation — typing latency stays local; the 700 ms debounce means we were never keystroke-synchronous anyway [observed semantics preserved].
2. **Connection indicator** in the Header driven by the Convex client's connection state: subtle dot; when disconnected, an explicit "offline — edits held locally" pill. `useAutosave`'s merge-back-on-failure [observed] already queues unflushed patches in memory and retries.
3. **localStorage draft buffer** for the three long-form surfaces only (note body, interview answers, `draftMarkdown`): every debounce tick also writes `{docId, field, text, baseUpdatedAt, savedAt}` locally; the entry clears on server ack. On editor mount, if a buffer exists that is **newer than the server doc's `updatedAt`**, show a restore bar ("You have unsaved local changes from HH:MM — Restore / Discard"). Never auto-apply.
4. **`beforeunload` guard** while unflushed patches or buffers exist.

Stated failure modes (accepted):
- **Two tabs / two devices editing the same doc:** last-write-wins at 700 ms granularity; the restore bar's `baseUpdatedAt` check surfaces (not merges) conflicts. No CRDT/merge — single-user tool, out of scope.
- **Browser crash between keystroke and debounce tick:** loses ≤700 ms of typing (matches desktop behavior).
- **localStorage eviction/quota:** buffer is insurance, not a store; eviction silently degrades to plain online-first.
- **Extended offline work:** not supported — the indicator makes this honest instead of silent, which is the actual regression risk the brief flags.

---

## 9. Open questions for the owner

### Resolved (owner, 2026-08-14)

1. ~~Multi-channel reality check~~ — **Owner runs 3 channels.** Route tree stays channel-scoped (`/c/$channelId/…`) with the header channel switcher and `userPrefs.lastChannelId` root redirect, exactly as planned in §5.
2. ~~Hooks pipeline~~ — **Confirmed: drop.** `hook_candidates`/`chosen_hook`, the hook compose/apply steps, and ReviewPage's empty Hook slot are not ported. The hook remains something the draft prompt instructs the model to write inline.
3. ~~Clarity IDENTITY replacement~~ — **Confirmed: per-channel Identity field.** `channels.identity` (free-text textarea, edited in channel settings) is injected as the IDENTITY block wherever `gatherIdentityContext` fed prompts; omitted when blank. See §3.3 and §4.
4. ~~Draft snapshots~~ — **Confirmed: yes.** Automatic `draftSnapshots` before every apply-replace, with a simple restore list; not full version management.

5. ~~Note editor save model~~ — **Resolved (owner, 2026-08-14): explicit save.** Now that saves are network API calls, the note editor keeps a Save button, triggerable via **Cmd/Ctrl+S**, with the dirty-tracking + UnsavedChangesGuard (incl. rail nav and `beforeunload`) closing the desktop app's guard gaps. *Scope note:* this decision is applied to Second Brain's note editor (the surface the question covered). The Scripts Pro production editor keeps its doctrine 700 ms debounced autosave + flush points [observed], which already batches writes far below per-keystroke — flag to the owner before phase 3 if explicit save should extend there too.
6. ~~`words_per_minute` scope~~ — **Resolved: per-channel**, default 140.
7. ~~Ideas "done" state~~ — **Resolved: add it**, as two distinct terminal statuses: `finished` and `rejected` (schema §3.3). IdeasPage gets a status filter and per-row "Mark finished / Reject" actions; terminal ideas leave the default backlog view.
8. ~~Font~~ — **Resolved: self-hosted Inter** (SIL OFL — no licensing/patent gotchas; clean, professional, UI-optimized). See §2.3.
9. ~~Search behavior~~ — **Resolved: adopt Convex-native search semantics** (word/prefix matching via the `searchText` search index; substring-`LIKE` parity not attempted), and make search **explicit-submit** — Enter key or a search button — rather than firing queries on keystrokes. Applies to both the Second Brain list and the SecondBrainPicker inside Scripts Pro (which drops its 200 ms keystroke debounce).
10. ~~Dev seeding~~ — **Resolved: include.** An `internalMutation` seed (dev deployment only, never deployed keys to prod) that fills a channel with sample notes, ideas, foundation assets, and productions — modeled on the desktop `debug.ts` fixtures.

**All ten questions are now resolved. No open owner decisions remain; phase 1 is unblocked.**

---

## 10. Risk register (likelihood × impact, descending)

| # | Risk | L×I | Mitigation |
|---|---|---|---|
| 1 | **Scripts Pro scope underestimation.** 13 routes, 8 tables, a 1,359-line prompt composer, and precise save semantics — this is 3–4× the surface the brief's sketch implied. | H×H | Phase-2-first ordering proves the architecture on the small tool; the composer ports near-verbatim as pure TS with snapshot tests against desktop-captured prompt strings; dead paths (hooks) cut up front. |
| 2 | **Prompt-fidelity regressions.** The megaprompts *are* the product; a subtle assembly-order or clamping change degrades every script invisibly. | M×H | Port `scriptContextPro.ts` mechanically, don't "improve" it; golden-file tests comparing web output to desktop output for identical fixture data. |
| 3 | **Typing-latency / data-loss regressions vs. local SQLite.** | M×H | §8: optimistic updates, exact 700 ms debounce + flush-point parity, local draft buffer, connection indicator, `beforeunload`. |
| 4 | **Convex Auth beta breakage** (locks the owner out). | M×M | Accepted in stack-decision §4 with Clerk as contained fallback; Cloudflare Access remains an independent second gate, and `requireOwner` is provider-agnostic. |
| 5 | **Base-path/deep-link misconfiguration** (`/app` split) — the classic trap the brief warns about twice. | M×M | The three-config checklist is a phase-1 gate with a deployed-preview hard-refresh test before anything else is built. |
| 6 | **Search behavior change** (LIKE → search index) surprises daily retrieval. | M×L | `searchText` covers title+tags+body; kind filter unchanged; flagged as open question #9 so it's a decision, not a surprise. |
| 7 | **Missing-cascade orphans** (Convex has no FK cascades; repo leaned on 11 of them). | L×M | Single `deleteChannel` fan-out mutation + explicit null-out helpers; a dev-only integrity check query. |
| 8 | **Design-fidelity drift** during inline-style → utility conversion (70% of styling is hand-carried px values). | M×M | Token config (§2) freezes the values; the audit's px/radius/motion tables are the checklist; side-by-side screenshot comparison per screen. |
| 9 | **Privacy-posture surprise.** Desktop marketing says "nothing is transmitted"; the web app transmits everything to Convex. Not a technical risk — a copy/expectations one (Setup page, landing page). | L×M | Rewrite the claims (phase 3 step 22 / phase 5); single-user + `requireOwner` + Access keeps the practical posture strong. |
| 10 | **Flattening severs the tools' relationship** (brief's explicit worry). | L×H | The data path is `SecondBrainPicker` + ingest push, both preserved verbatim and URL-addressable (`?tab=material`); the Flow wrapper contributed no data [observed], only chrome. |

---

## 11. Non-goals (unchanged from the brief §10)

YouTube integration, ElevenLabs/Voice Pro, Clarity, any third tool, multi-user, mobile-native, data migration, offline-first parity. The one cheap early YouTube item (create the `channel_reach_basic_a1` reporting job — stack-decision §5.3) is independent of this codebase and can be done anytime.
