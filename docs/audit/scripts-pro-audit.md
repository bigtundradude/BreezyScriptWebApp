# Scripts Pro ("BreezyScript Pro") — Repo Audit Findings

> Phase-0 audit of the BreezyScript Tauri repo (read-only), per `docs/breezyscript-web-migration-design.md` §5.2.
> Audited: 2026-08-14. All paths relative to `/Users/tundra/TundraTools/BreezyScript`. Feature dir: `src/features/breezy-script-pro`.

**Headline architectural fact:** the app makes **zero LLM calls**. Every "AI" action is a `compose*` / `apply*` pair — the app builds a giant pasteable megaprompt from DB state, the user runs it in their own chatbot, and pastes the reply back. (`.claude/llm.md:3-20`, `src/lib/api/scriptsPro.ts:39`, `BreezyScriptProShell.tsx:6-7`.)

---

## 1. Entity model

All tables in `src-tauri/migrations/001_base.sql`. TS row types (snake_case mirrors) in `src/types/index.ts`. API params camelCase; rows snake_case (`scriptsPro.ts:40-41`).

### Scope root: `projects` (001_base.sql:27-34)
`id TEXT PK, name, description, youtube_channel_id (vestigial), created_at, updated_at`. A project == a YouTube channel. Every bsp_* table has `project_id NOT NULL REFERENCES projects(id) ON DELETE CASCADE`.

### `settings` (001_base.sql:17-21)
`key PK, value, updated_at`. Holds `active_project_id`, `script.words_per_minute`, `breezy_script.preview_*`.

### `bsp_ideas` (001_base.sql:40-49) — idea backlog
`id, project_id, title, angle, source_ref, status DEFAULT 'new', created_at, updated_at`
- `source_ref` values: `''` (hand-typed), `'concept'` (from applyConcepts, `scriptsPro.ts:588`), `clarity:pillar:<name>` / `clarity:video:<pillar_ref>` (`clarity/handoffs.ts:46,65`).
- `status` in practice: `'new'` → `'in_production'` (production created from idea, `scriptsPro.ts:530`) → back to `'new'` if production deleted (`scriptsPro.ts:566`). No 'done' state.

### Foundation assets — three tables, ONE row shape (`makeAssetApi`, `scriptsPro.ts:110-195`)
`bsp_personas` (:57-68), `bsp_audience_profiles` (:71-82), `bsp_frameworks` (:85-96). Identical columns:
`id, project_id, label, source_input, result_json '{}', result_markdown, prompt_snippet, is_default INT 0, created_at, updated_at`
- `source_input` = user-pasted raw material; `result_json` = canonical model JSON; `result_markdown` rendered **in code** from JSON (never model-authored, `scriptContextPro.ts:6-9`); `prompt_snippet` = the compact block injected verbatim downstream (model-authored, required on apply, **user-editable afterward** — `scriptsPro.ts:180-182`).
- `is_default`: exactly one per project, enforced in code (`scriptsPro.ts:149-155`); list order `is_default DESC, updated_at DESC`.
- Accessed via a **dynamic-table dispatcher** — string-interpolated `${table}` SQL (`scriptsPro.ts:111-198`).

### `bsp_title_templates` (001_base.sql:101-118)
`id, project_id, pattern, example_source, triggers (JSON string[]), structure_notes, transferability, why_it_works, outlier_strength, manual INT (1=hand-added, 0=mined), shape_id ('' = unsorted), why_this_variant, example_title, sort_boost INT 0, created_at, updated_at`
- `sort_boost` written only by Feedback re-rank apply (±1, `scriptsPro.ts:870-874`), drives prompt ordering (`scriptContextPro.ts:527`).

### `bsp_title_shapes` (001_base.sql:122-133) — custom shapes
`id, project_id, name, tagline, mechanism, what_makes_it_work (JSON []), what_undermines_it (JSON []), sort_order, timestamps`. **10 built-in shapes live in code** (`script-shared/lib/titleShapes.ts`): ids `shape:number_list`, `shape:compression`, `shape:blueprint`, `shape:identity`, `shape:authority_pain`, `shape:novelty`, `shape:versus`, `shape:warning`, `shape:contrarian`, `shape:formats`, each with 10–18 built-in templates.
- Deleting a custom shape does **not** delete its templates — sets `shape_id=''` (`scriptsPro.ts:423-426`).

### `bsp_productions` (001_base.sql:139-162) — one row per video
`id, project_id, idea_id (FK → bsp_ideas ON DELETE SET NULL), name, format 'long', concept_json '{}', title_candidates '[]', chosen_title '', chosen_titles '[]', target_minutes INT 0, thumbnail_candidates '[]', chosen_thumbnail '{}', interview_json '[]', hook_candidates '[]', chosen_hook '', draft_markdown '', metadata_json '{}', status 'building', timestamps`
- `format` enum (UI, `ProductionDetailPage.tsx:38-43`): `shorts` (~60s) | `medium` (~8m) | `long` (~18m) | `podcast` (~45m).
- `status`: `building` | `ready` | `archived` (`ProductionsPage.tsx:16-20`; transitions `ProductionDetailPage.tsx:83`, `ReviewPage.tsx:147-158`).
- JSON shapes (`types/index.ts:132-175`):
  - `concept_json` = `{working_title, description_angle, audience_gap, scores?, rationale?}`
  - `title_candidates` = `{text, triggers?, scores{curiosity,promise_clarity,tension,specificity,native_fit}, rationale?}[]`
  - `chosen_titles` = `{text, main}[]`, capped 3, exactly one `main` (`ProductionDetailPage.tsx:201-219`); `chosen_title` scalar kept synced to main server-side (`scriptsPro.ts:549-553`)
  - `interview_json` = `{id, type, facet, q, a}[]`, `type ∈ informative|opinion|personal_story|third_party_narrative|case_study|problem_solving|manual|story|second_brain`
  - `thumbnail_candidates` = `{direction, depicts, focal_subject?, text_overlay?, expression_emotion?, color_contrast?, complements_title, ab_note?}[]`
  - `hook_candidates` = `{text, structure?, scores{validate_click,set_stakes,introduce_mechanism,transition}, pays_off_promise?}[]` — **legacy/dead, see §3 note**
  - `metadata_json` = `{description:{first_line, body, notes?}, chapters:[{timestamp,title}], tags:[]}`

### `bsp_library` (001_base.sql:168-177) — unified library, `kind` discriminates
`id, project_id, kind, title, summary, result_json '{}', is_default, timestamps`
- kinds used: `video_structure`, `cta`, `disclosure`, `description` (+ declared-but-unused `hook_structure`).
- `is_default` scoped per `(project, kind)` (`scriptsPro.ts:443-449`).
- per-kind `result_json`: video_structure `{name, format_type, sections:[{beat, job}], retention_mechanics{open_loops,re_hooks,payoffs}, pacing_notes, best_for}`; cta `{goal, text_variants[], placement[], tone, when_to_use}`; disclosure `{type, text, required_context, placement[]}`; description `{name, body, notes}`.
- 18 installable built-in video structures in code (`builtinStructures.ts`, ids `builtin:s1..s5, m1..m5, l1..l5, p1..p3`).

### `bsp_feedback` (001_base.sql:181-192)
`id, project_id, production_id (FK SET NULL — never populated by UI), title, metrics (free text), source_input (pasted comments), result_json, result_markdown, timestamps`
- `result_json` = `{diagnosis{primary,reasoning}, new_comment_signals[], proposed_audience_updates[], proposed_template_reranks[{template,direction,reason}], recommended_experiment, confidence, applied_audience_updates[], applied_reranks:boolean}`.

### Adjacent tables Scripts Pro touches
- `clarity_profile` — read-only via `gatherIdentityContext` (`brand_statement`, `content_persona_json`); Clarity also writes into `bsp_ideas` / `bsp_audience_profiles`.
- `sb_notes` — read via SecondBrainPicker, written via Send-to-Second-Brain (see second-brain audit).

### Relationships
`projects 1—N {all bsp_* tables, sb_notes}`; `bsp_ideas 1—0..N bsp_productions` (idea_id); `bsp_title_shapes 1—N bsp_title_templates` (soft string ref `shape_id`, may point at built-in code id); `bsp_productions 1—0..N bsp_feedback` (unused link).

**There is no versions table** — see §10.

---

## 2. Screen inventory

Routes (`src/App.tsx:84-103`), nav (`BreezyScriptProNav.tsx:4-25`):

| Route | Component | Purpose | States |
|---|---|---|---|
| `/breezy-script-pro` | redirect → `build` | | |
| `…/build` | `ProductionsPage` | video list; create by name | loading / no-project / 3 tabs with counts (Drafts / Ready to record / Archived) / empty per tab / delete confirm. Row click → `build/:id` on Drafts, `review/:id` otherwise |
| `…/build/:id` | `ProductionDetailPage` (529 lines, core editor) | 5-tab pipeline | loading / not-found / tabs `package, interview, material (Second Brain), script, metadata` with ✓ completeness markers (`:94-103`); docked FooterNav; replace-draft confirm |
| `…/review/:id` | `ReviewPage` | final read-only cards: Packaging / Script (+Copy, Teleprompter) / Metadata | loading / not-found / ready vs archived badge; Back-to-draft, Archive, Mark ready again, Send to Second Brain |
| `…/ideas` | `IdeasPage` | idea backlog + concept megaprompt | loading / no-project / empty / badges (`from Clarity`, production status) / Build vs Open |
| `…/feedback` | `FeedbackPage` | post-mortem; master-detail rail | loading / no-project / no-selection / report + "Apply proposals" panel with per-item applied state |
| `…/foundations/personas` | `PersonasPage` → `FoundationAssetPage` | voice persona | shared 3-pane states |
| `…/foundations/audience` | `AudiencePage` → same | audience profile | |
| `…/foundations/framework` | `FrameworkPage` → same | channel method | |
| `…/foundations/titles` | `script-shared/TitleTemplatesPage` `allowLlm` | shape grid → detail; mine from outliers | grid / detail / Unsorted bucket / template modal / custom-shape modal |
| `…/library/structures` | `StructuresPage` `allowLlm` → `LibraryPage` | video structures, ★ default, 18 presets | |
| `…/library/ctas` | `CtasPage` `allowLlm` → `LibraryPage` | CTAs + disclosures | |
| `…/library/descriptions` | `DescriptionTemplatesPage` (**no** `allowLlm`) | manual-only description templates | |
| `…/setup` | `UsingYourAIPage` | explains the copy/run/paste loop + WPM settings + privacy claim | static |

`FoundationAssetPage.tsx` states: loading / no-project / empty list / no selection / editor (label input, source Textarea, MegapromptPanel, Save, rendered markdown + `generated` badge, editable Prompt snippet + Save snippet) / delete confirm.

Shell: `BreezyScriptProShell.tsx` registers tool name "Scripts Pro" + left rail; header-right null.

---

## 3. The primary loop (idea → finished script)

1. **Foundations (one-time per channel).** `foundations/personas` → paste scripts/transcripts → Copy prompt → paste reply → Apply ⇒ `prompt_snippet`. Repeat for audience & framework (framework prompt auto-injects the default audience snippet, `scriptsPro.ts:209`). Star one default of each. Optionally: mine title shapes, add default video structure, CTAs, description template.
2. **Ideas.** Type an idea + Add, or concept megaprompt (`composeConcepts` count=8 + steer notes) → Apply ⇒ N `bsp_ideas` rows `source_ref='concept'` + rejected count. Or ideas arrive from Clarity.
3. **Build.** **Build** on an idea ⇒ `productions.create({name: idea.title, ideaId, angle})`, seeds `concept_json`, flips idea to `in_production`, navigates to `build/:id`.
4. **Tab ① Package** — single fused megaprompt. Optional target-shape pills. Copy → run → paste → Apply ⇒ ONE UPDATE writes `title_candidates`, `thumbnail_candidates`, `metadata_json` (working description) and seeds `interview_json` questions (`scriptsPro.ts:637-682`). Human then: pick ≤3 titles, ★ main, pick thumbnail, set format + target minutes.
5. **Tab ② Interview** — answer seeded questions in auto-growing MarkdownEditors. Debounced draft-budget meter (800ms) badges answers `partially trimmed`/`won't fit`. Drag-reorder answers (later answers clamp first).
6. **Tab ③ Second Brain** — search channel notes (kind default `story`), "Add" copies note body into `interview_json` as `type:'second_brain'` block. Nothing auto-included.
7. **Tab ④ Script** — "Copy prompt for your AI" → `buildDraftPrompt` (whole pipeline in one markdown-contract megaprompt) → paste script back → Apply (confirm if draft exists) ⇒ `draft_markdown`. Edit inline (autosaved), pacing pill + word count, Teleprompter.
8. **Tab ⑤ Metadata** — disabled until draft exists. Copy prompt (script + starred description template) → Apply ⇒ `metadata_json` (description, chapters, tags). Tags non-empty ⇒ finalized ✓.
9. **"Ready for production"** ⇒ flush, `status='ready'`, navigate `review/:id`.
10. **Review** — copy script/description/chapters/tags, teleprompter, Send to Second Brain, Archive / Back to draft.
11. **Feedback (after publishing)** — title + metrics + pasted comments → prompt → report ⇒ approve proposals: append audience updates to default audience `prompt_snippet`; bump `sort_boost` on matching templates. Loop closes into step 1's snippets.

**Dead path:** `composeStep`/`applyStep` still supports `titles`, `thumbnails`, `interview`, `hooks` (`scriptsPro.ts:606-716`) and `chosen_hook`/`hook_candidates` columns exist, but **no UI calls them** — only `package`, `metadata`, and `buildDraftPrompt`. ReviewPage renders an always-empty "Hook" slot (`ReviewPage.tsx:92-97`). The hook is now written inside the draft prompt (`scriptContextPro.ts:1015-1017`). Treat hooks as legacy for the rebuild.

---

## 4. Input mechanics / save semantics

Doctrine (`.claude/script-editor-ux.md:24-40`): **no per-tab Save buttons in the production editor**.

- `useAutosave` (`src/components/shared/useAutosave.ts`): `patch(p)` applies locally, debounces persist; **default 700 ms**; `flush()` immediate; auto-flush on unmount; failed writes merge pending patch back for retry (no silent loss).
- Wired in `ProductionDetailPage.tsx:64-67`; autosaved fields: `name`, `format`, `targetMinutes`, `interview` (answers + order + SB blocks), `draftMarkdown`.
- `flush()` on: input blur, tab change, FooterNav prev/next, back-link, Ready-for-production, drag-reorder (immediate).
- Explicit Save + blur-save pages: FoundationAssetPage (label blur, Save, Save snippet; compose persists label+source first `:91-96`), FeedbackPage, library/template modals.
- Other debounces: interview budget recompute **800 ms** (`ProductionDetailPage.tsx:336-344`); SecondBrainPicker search **200 ms**.
- Instant optimistic writes: title selection, ★ main, thumbnail choice, setDefault actions.
- **Undo: none.** Destructive paths gated by confirms: `useConfirm` promise modal for replace-draft ("Applying replaces the current draft, including any edits you made. This can't be undone.", `ProductionDetailPage.tsx:441-447`) and template/shape deletes; `ConfirmModal` for entity deletes. Cancelled apply keeps the pasted text (`MegapromptPanel.tsx:54-58`).
- **Validation lives in the apply path** (`scriptsPro.ts:56-88`): `parseOrThrow` → `asReplyObject` (must be JSON object; explicit error if model echoed the schema) → `replyArray(key)` (non-empty array — so an empty apply can't wipe work). Asset applies require non-empty `prompt_snippet`. Errors are friendly retry strings ("Paste the model's entire ```json block and try Apply again."). Client-side validation minimal (`disabled={!source.trim()}` etc.; `target_minutes` clamped ≥0).
- **Keyboard shortcuts:** Enter submits create inputs; teleprompter Escape=close, Space=play/pause (`ScriptPreview.tsx:44-51`). No Cmd+S anywhere. Markdown toolbar has no key bindings.
- `MarkdownEditor` auto-grows via `field-sizing: content` + scrollHeight fallback; inline preview toggle.

---

## 5. The LLM / megaprompt model

**No API is ever called.** No provider SDK, no key, no streaming (`.claude/llm.md:120-131`). `MegapromptPanel` is the loop: Copy (`getPrompt()` → clipboard) → "Copied. Paste it into your AI" (2.5s) → paste textarea auto-opens → Apply → `onApply(raw)`.

**Prompt assembly — `src/lib/scriptContextPro.ts` (1,359 lines), the only place prompts are built.**

- Composers return `ComposedProPrompt {system, user, taskKey, maxTokens, schema}` (`:20-26`). `taskKey`s: `scriptpro.persona|audience|framework|title_mine|concept|titles|thumbnail|interview|package|hook|draft|metadata|structure|cta|feedback`.
- `toMegaprompt(p)` (`:1324-1330`) = system + divider + user + "OUTPUT FORMAT… Reply with ONLY one fenced ```json block… validate against this JSON Schema:" + schema.
- `toDraftMegaprompt` (`:1333-1338`) — contract = "ONLY the finished script in Markdown… starting with the first spoken line."
- `parseJsonLenient` (`:1343-1358`): raw parse → first fenced block → outermost `{…}` span.
- Shared prose constants: `OPERATING_RULES` (:58-62), `SPOKEN_PUNCTUATION` (:77-83), `SCRIPT_PROSE_STYLE` (:85-89).

**Context gatherers (async DB reads):**
- `defaultSnippet(table, projectId)` → prompt_snippet, `is_default DESC, updated_at DESC LIMIT 1` (`:480-488`) — `personaSnippet`/`audienceSnippet`/`frameworkSnippet`.
- `gatherIdentityContext` (`:495-515`) — clarity_profile `brand_statement` + `content_persona_json` → "Brand: / Who they are: / Point of view: / Stands for/against:". Returns `''` when absent (graceful degradation).
- `titlePatternLines(projectId, 25)` (`:525-537`) — ordered by `sort_boost DESC, created_at DESC`.
- `gatherLibraryContext` (`:1265-1294`) — default video_structure beats+jobs + up to 12 cta/disclosure lines. Stories deliberately excluded (hand-picked instead).

**Assembly order (`user` block):**
- Concepts (`:605-609`): IDENTITY → AUDIENCE → FRAMEWORK → PROVEN TITLE SHAPES → constraints/seed notes → "Generate {count} ranked video concepts as JSON."
- Package (`:884-889`): IDENTITY → PERSONA → AUDIENCE → FRAMEWORK → shape block (TARGET SHAPES or fallback PROVEN TITLE SHAPES) → CONCEPT (working title/angle) → "Produce the packaging JSON." Defaults titleCount=8, questionCount=12.
- Draft (`:1002-1043`): IDENTITY → PERSONA → AUDIENCE → FRAMEWORK → packagingBlock (single title, or A/B block naming MAIN TITLE + alternates `:970-984`) → library context → FORMAT + TARGET LENGTH `~{mins} min (~{low}–{high} words)` where low/high = `mins*wpm*0.85|1.15` rounded to 50 (`:988-997`) → BRAIN DUMP → "Write the full script now."
- Metadata (`:1296-1311`): Title / Thumbnail / SCRIPT"""…""" / optional DESCRIPTION TEMPLATE (starred `description` item's body) / "Produce the metadata JSON."
- Feedback (`:1229-1234`): AUDIENCE → TITLE SHAPES IN PLAY (15) → VIDEO/METRICS → NEW COMMENTS → "Produce the PerformanceReport JSON (proposals only)."

**Token budgeting** — `src/lib/tokenBudget.ts`: `estimateTokens = ceil(len/4)`; (`fitToBudget` exported but unused). Real clamping in `scriptContextPro.ts`:
- `DEEP_NUM_CTX = 24576`, `QUICK_NUM_CTX = 8192` (`:36-37`) — deliberately "keep the pasteable prompt human-checkable", not model windows.
- `clampInput(text, reserve, numCtx)` (`:40-45`); `clampToFit(text, numCtx, fixedPrompt, maxOutput)` (`:51-56`) for brain dump + feedback comments.
- Per-task `maxTokens`: persona 1600, audience 1800, framework 1600, title_mine 1800, concept 1800, titles 1600, thumbnail 1400, interview 2200, package 2600, hook 1600, metadata 1400, structure 1800, cta 1200, feedback 1600; draft by format `shorts 800 / medium 2200 / long 3600 / podcast 4096` (`:1008-1009`).
- `computeDraftBudget` (`:1054-1059`) → `{budgetTokens, dumpTokens, cutoffChar}`; `scriptsPro.ts:739-780` classifies each interview answer `full|partial|cut|empty` for the meter.

**Where output lands:** assets → `result_json` + code-rendered `result_markdown` + `prompt_snippet`; mining → `bsp_title_templates` rows (manual=0, unsorted) + one-time rejected list; concepts → `bsp_ideas`; package → 4 production columns in one UPDATE; metadata → `metadata_json`; draft → `draft_markdown` (autosave update); library → `bsp_library` rows; feedback → `result_json`/`result_markdown` then two explicit approve-applies.

---

## 6. Cross-tool touchpoints

**Clarity → Scripts Pro** (`clarity/handoffs.ts`) — note Clarity is NOT migrating:
- `pushAudience` (:18-33) upserts a `bsp_audience_profiles` row labelled `'Clarity audience'` (deterministic, no AI).
- `pushPillarConcepts` (:36-53) / `pushVideoIdeas` (:56-71) insert `bsp_ideas`, deduped case-insensitively by title, `sourceRef = clarity:*`. IdeasPage badges `from Clarity`.
- Live read: `gatherIdentityContext` reads `clarity_profile` on every compose (returns `''` when absent).

**Scripts Pro → Second Brain**: `SendToSecondBrainButton` on ReviewPage (`ReviewPage.tsx:160-169`), `kind='script'`, `sourceRef='scriptpro:<id>'`; upsert on `(project_id, source_ref)`; button label Send → Update → "In Second Brain".

**Second Brain → Scripts Pro**: `SecondBrainPicker` (tab "material") — copy-by-value into `interview_json` (see second-brain audit §6).

No touchpoints with Voice Pro from within Scripts Pro.

---

## 7. Foundations & libraries → how they feed script creation

- **Personas / Audience / Framework**: shared `FoundationAssetPage` (list rail + editor). Flow: New → paste `source_input` → Copy prompt (persists label+source first) → paste reply → Apply → read rendered markdown → **hand-edit `prompt_snippet` and Save**. The snippet is the only thing reaching downstream prompts and is user-editable — key design point. ★ = project default.
- Consumption map: IDENTITY+PERSONA+AUDIENCE+FRAMEWORK → Package & Draft; AUDIENCE+FRAMEWORK → Interview; AUDIENCE (+FRAMEWORK for concepts) → Titles/Thumbnails/Concepts/Feedback; framework compose consumes the audience snippet.
- **Title templates**: two-level — shapes (10 built-in in code + custom rows) and templates (built-in per shape + user rows). Mining pastes outlier titles (`"title  8x"` per line) → templates land in Unsorted. Feed prompts: (a) untargeted top-25 by sort_boost; (b) targeted TARGET SHAPES guides `{name, mechanism, patterns[≤10]}` from the Package tab's shape pills (`ProductionDetailPage.tsx:188-193`).
- **Video structures**: LibraryPage + ★ default + 18 code presets; default injected into draft prompt as beats+jobs.
- **CTAs & disclosures**: one page, two kinds; ≤12 injected into draft prompt ("keep disclosure wording exact").
- **Description templates**: manual-only (`allowLlm` not forwarded, `DescriptionTemplatesPage.tsx:48-50`); starred body injected into metadata prompt.
- Empty-state picker pattern: `TemplateEmptyHint` (dashed card + "Configure →").

---

## 8. Channel/project scoping

- One global zustand value: `activeProjectId` (`src/store/app.ts`); truth persisted in `settings.active_project_id`.
- `ProjectSelector` in Header: dropdown + inline create; self-heals by persisting the first project when none active (`:29`).
- Every list page keys data-loading on `activeProjectId` (useCallback dep) so switching channels reloads. **`ProductionDetailPage` and `ReviewPage` do NOT subscribe** (id-addressed).
- Every query `WHERE project_id = ?`. Project delete relies on FK CASCADE.
- Convex mapping: `projectId` field + index on every table; channel in URL fixes the switch-mid-edit class of bugs.

---

## 9. Long-running operations / progress UI

Effectively none (no model calls; all local SQLite):
- Page-level `<Spinner size={14}/> Loading…`; button-level `loading` props; MegapromptPanel `busy: 'copy'|'apply'`.
- Draft-budget meter is advisory — "never block the tab" (`ProductionDetailPage.tsx:341`).
- `ProgressBar` unused in Scripts Pro (Voice Pro only). "No streaming UIs — there is nothing to stream" (`.claude/llm.md:126-128`).

---

## 10. Versioning model for scripts

**There is none.**
- `draft_markdown` is a single TEXT column. No versions table, no snapshots, no diff/compare/restore UI.
- Applying a pasted draft **overwrites**; only protection is the confirm dialog + flush ordering.
- Manual edits debounced-overwrite in place (700 ms); no history.
- Nearest "version" concepts: `chosen_titles` A/B set (≤3, one main); `status` lifecycle with reversible transitions; re-push to Second Brain upserts the same note.
- `.claude/script-editor-ux.md:104-106` lists "multiple script drafts per video (draft pills + New draft + delete)" as a Lite feature worth mirroring, never implemented in Pro — the obvious place to add real versioning in the rebuild.

---

## Rebuild-relevant gotchas

- Every JSON column is a **string**; UI defends against legacy non-array values (`parseArr`, `ProductionDetailPage.tsx:52-55`) → native objects in Convex, drop guards.
- `tauri-plugin-sql` has no cross-call transactions, so batch inserts are sequential; the fused Package apply is deliberately one UPDATE (`scriptsPro.ts:43-50`). Convex mutations are transactions — these collapse naturally.
- Package apply's interview seeding is non-destructive: appends only new questions when any answer is non-empty, deduped by trimmed-lowercase `q` (`scriptsPro.ts:654-672`).
- IDs `crypto.randomUUID()`; timestamps ISO strings written in JS.
- Orders: `productions.list` `updated_at DESC`; `ideas.list`/`feedback.list` `created_at DESC`; `titleTemplates.list` `created_at DESC` (prompt injection re-sorts by sort_boost).
