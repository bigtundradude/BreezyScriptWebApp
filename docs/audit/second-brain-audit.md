# Second Brain — Repo Audit Findings

> Phase-0 audit of the BreezyScript Tauri repo (read-only), per `docs/breezyscript-web-migration-design.md` §5.2.
> Audited: 2026-08-14. All paths relative to `/Users/tundra/TundraTools/BreezyScript`.

Second Brain is the smallest, most self-contained tool in the app: **a per-channel notes CRUD + LIKE-search tool with an "ingest" upsert surface other tools push into**. Zero LLM, zero embeddings, zero retrieval.

---

## 1. Entity model

### Table: `sb_notes` (the ONLY Second Brain table)
`src-tauri/migrations/001_base.sql:240-257`

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | `crypto.randomUUID()` generated client-side (`secondBrain.ts:44`, `:114`) |
| `project_id` | `TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | the channel; **strictly required** |
| `title` | `TEXT NOT NULL` | |
| `body` | `TEXT NOT NULL DEFAULT ''` | plain text (rendered as a `<Textarea rows={16}>`, no markdown editor) |
| `kind` | `TEXT NOT NULL DEFAULT 'note'` | enum-by-convention, not constrained |
| `tags` | `TEXT NOT NULL DEFAULT '[]'` | JSON `string[]` serialized into a TEXT column |
| `source_ref` | `TEXT NOT NULL DEFAULT ''` | `''` = hand-authored in Second Brain; else `<tool>:<id>` |
| `created_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | app writes ISO-8601 via `new Date().toISOString()` |
| `updated_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | same |

Index: `idx_sb_notes_project ON sb_notes(project_id)` (`001_base.sql:257`). **No unique index on `(project_id, source_ref)`** even though ingest treats that pair as a key (`secondBrain.ts:101`) — a latent duplicate risk worth fixing with a real unique constraint in Convex.

There is **no** `status`, no archive, no soft-delete, no folder, no pin, no ordering column, no `updated_by`, no linkage table. Delete is a hard `DELETE` (`secondBrain.ts:81`).

### `kind` lifecycle values (10, closed set in practice)
`src/features/second-brain/lib.ts:3-14`, mirrored as a TS union at `src/types/index.ts:274-276`:

`note` (default) · `article` · `thought` · `book_review` · `script` · `quote` · `idea` · `transcript` · `research` · `story`

Labels come from `kindLabel()` (`lib.ts:16-18`, falls back to `'Note'` for unknown values). `SecondBrainPicker` renders raw kind with `_`→space instead (`SecondBrainPicker.tsx:128`) — a small inconsistency.

Historical notes worth carrying over: `story` notes replaced the old `bsp_library` story kind in 2026-07 (`types/index.ts:197`, `scriptContextPro.ts:1140`, `debug.ts:148-158`); `transcript` exists because the bundled voice tool was removed and creators paste their own dictation (`.claude/database.md:25`).

### `source_ref` namespace
Format `prefix:id`. Known prefixes and display labels (`NotesPage.tsx:16-23`):
- `scriptpro:<productionId>` → badge "from Scripts Pro" — the only live producer (`ReviewPage.tsx:163`)
- `scriptlite:<id>` → "from Scripts Lite" (legacy; tool removed)
- `bsplibrary:<id>` → "from Stories" (legacy; library stories migrated into notes)

### TypeScript types
`src/types/index.ts:272-305`
- `SbNoteKind` — the 10-value union
- `SbNote` — full row (`tags` typed as `string`, i.e. raw JSON)
- `SbNoteListItem` — `id, title, kind, tags, source_ref, snippet, created_at, updated_at` (no `body`, no `project_id`)
- `SbIngestResult` — `{ noteId: string; created: boolean }` (`created:false` = updated an existing pushed note)

### Relationships
`projects (1) ──< sb_notes` via FK cascade. Second Brain notes are **referenced by value, never by FK**, from Scripts Pro: the picker copies `note.body` into `bsp_productions.interview_json` blocks with `facet: "note:<noteId>"` (`SecondBrainPicker.tsx:61`). No back-reference exists from `sb_notes` to a production except via `source_ref` on pushed notes.

---

## 2. Screen inventory

Routes (memory router; wing-nested but absolute paths) — `src/App.tsx:105-112`:

| Route | Component | Purpose |
|---|---|---|
| `/second-brain` | `NotesPage` (index) | list/search/filter |
| `/second-brain/notes/new` | `NoteEditPage` (`isNew`) | create |
| `/second-brain/notes/:id` | `NoteEditPage` | edit/delete |

All three sit under `SecondBrainShell` under the pathless `AppShell` layout route (`App.tsx:46-48`).

### A. `SecondBrainShell` — `src/features/second-brain/SecondBrainShell.tsx`
- Registers tool chrome on mount: `setToolName('Second Brain')`, `setLeftRail(<SecondBrainNav/>)`, `setHeaderRight(null)`; clears the rail on unmount (`:11-16`).
- **Hard channel gate**: if `activeProjectId` is null, renders only the copy "Pick or create a channel in the header. Each channel has its own separate Second Brain." and no `<Outlet/>` (`:18-25`).
- Left rail is a single item: `{ label: 'Notes', path: '/second-brain', icon: StickyNote }` (`SecondBrainNav.tsx:4-6`). Rail is rendered via the shared `LeftRail` (`src/components/layout/LeftRail.tsx`), with a back-link to the "Flow tools" space (`LeftRail.tsx:35`).

### B. `NotesPage` — `src/features/second-brain/pages/NotesPage.tsx`
Built on shared `ListPage` + `ListCard` (`src/components/layout/ListPage.tsx`, `ListCard.tsx`).
- Title "Notes"; description "Everything in this channel's Second Brain: notes, articles, thoughts, and book reviews." (`:53-54`)
- Primary action: "New note" (Plus icon) → `/second-brain/notes/new` (`:55`)
- States:
  - **loading**: `loading` starts `true`; `ListPage` renders `<Spinner size={14}/> Loading…` (`ListPage.tsx:86-89`). `setLoading(false)` only happens in the `finally` of `load` and is never set back to `true` on re-filter, so refilters are silent (no spinner flash) — `NotesPage.tsx:34-44`.
  - **error**: `error` string rendered inline in `--color-danger` above the list (`:75-77`); errors do NOT clear the previously loaded notes.
  - **empty**: two variants — filtered ("No matching notes" / "Try a different search or filter." / no action) vs virgin ("No notes yet" / "Add your first note to start building this channel's Second Brain." / "New note" action) (`:69-73`). `isEmpty = notes.length === 0 && !error`.
  - **populated**: one `ListCard` per note showing StickyNote icon, title (single-line ellipsis), kind `Badge variant="muted"`, optional source `Badge variant="info"`, 2-line clamped `snippet`, "Updated {formatDate(updated_at)}", and tag chips (`:81-101`).
- `formatDate` = `toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})` (`src/lib/utils.ts:7-13`).

### C. `NoteEditPage` — `src/features/second-brain/pages/NoteEditPage.tsx`
Single-column form, `maxWidth: 760`, centered (`:88`).
- Header: back button "‹ Notes" (goes through `navigateWithCheck`), heading "New note" / "Edit note", `Delete` button (edit mode only), `Save` button (`:89-106`).
- Fields, in order: `Input label="Title"` placeholder "e.g. Atomic Habits, key takeaways"; row of `Select label="Kind"` (200px wide, `KIND_OPTIONS`) + `PillInput label="Tags"` placeholder "Add a tag and press Enter"; `Textarea label="Content" rows={16}` placeholder "Write or paste the note." (`:115-141`).
- States: **loading** (`isNew ? false : true`) → centered `<Spinner/>` at padding 64, entire form hidden (`:83-85`); **error** banner box with danger border (`:108-112`), including the "Note not found." case which leaves an empty form on screen; **saving** → `Save` button `loading` (`:105`); **deleting** → `ConfirmModal loading` (`:152`).
- Modals: `ConfirmModal` "Delete note?" / "The note is permanently removed from this channel's Second Brain." / confirmLabel "Delete" / variant danger (`:144-153`), plus `<UnsavedModal/>` (`:154`).

---

## 3. Primary user loop

1. **Pick a channel** in the global header `ProjectSelector` (`src/components/layout/ProjectSelector.tsx`) — writes `activeProjectId` into the zustand store and persists `settings.active_project_id`. Without it, Second Brain renders only the gate copy.
2. **Enter the tool** from either the launcher utility row (`src/features/launcher/Launcher.tsx:161-167`) or the Flow dashboard tool grid card (`src/features/dashboard/Dashboard.tsx:24-32`, accent `#f472b6`, icon `Brain`).
3. **Capture (path A — hand authoring)**: "New note" → fill Title / Kind / Tags / Content → click **Save** → `notes.create` → immediate `navigate('/second-brain')` back to the list.
4. **Capture (path B — push from another tool)**: on a finished Scripts Pro production's Review page, click **Send to Second Brain** → `ingest.push` upserts a `kind='script'` note with `source_ref = scriptpro:<prodId>` (`ReviewPage.tsx:160-169`).
5. **Curate**: click a card → edit → Save (returns to list) or Delete (confirm → returns to list).
6. **Retrieve (path A — human)**: search box + kind filter on the list page.
7. **Retrieve (path B — the actual payoff)**: inside a Scripts Pro production, the **"Second Brain" tab** (`src/features/breezy-script-pro/pages/ProductionDetailPage.tsx:33,136`) shows `SecondBrainPicker`. The creator searches their notes (kind pre-filtered to `story`) and clicks **Add**; the note's full `body` is copied into the production's brain-dump as an editable `interview_json` block. Those blocks are later serialized as `Q: …\nA: …` pairs into the draft megaprompt (`src/lib/api/scriptsPro.ts:235-240`, consumed by `buildDraftPrompt` at `:721-733`).
8. Loop closes: the finished script gets pushed *back* into Second Brain from Review (step 4), upserting rather than duplicating.

---

## 4. Input mechanics

- **Explicit save, NOT autosave.** `NoteEditPage` has a real `Save` button and never imports `useAutosave`. The `useAutosave` hook (`src/components/shared/useAutosave.ts`, default debounce **700 ms**, flush on blur/tab-change/unmount, re-queues the patch on write failure at `:41`) is used by Scripts Pro's `ProductionDetailPage` — including the `SecondBrainPicker`'s add/remove writes — but **not** by Second Brain itself. Doc rationale: `.claude/script-editor-ux.md:28-45`.
- **Dirty tracking**: every field change routes through the `edit()` wrapper which calls the setter then `setDirty(true)` (`NoteEditPage.tsx:45-47`, used at `:119, :123, :129, :130, :140`). `setDirty(false)` on successful save (`:61`) and on successful delete (`:74`).
- **Unsaved-changes guard** (`src/components/shared/UnsavedChangesGuard.tsx`): `useUnsavedChanges()` gives `{isDirty, setDirty, navigateWithCheck, UnsavedModal}`. `navigateWithCheck(path)` stores `pendingPath` instead of navigating when dirty; the modal ("Unsaved changes" / "You have unsaved changes that will be lost if you leave…" / "Leave anyway" / "Stay here", danger) confirms → clears dirty and navigates.
  - **Coverage gap to fix in the rebuild**: only the in-page "‹ Notes" back button uses `navigateWithCheck` (`NoteEditPage.tsx:90`). `SecondBrainNav`/`LeftRail` is constructed without the `onNavigate` prop (`SecondBrainNav.tsx:9`, prop exists at `LeftRail.tsx:25,42-47`), so clicking "Notes" in the rail, switching channels, or closing the window all silently discard edits. There is no `beforeunload`/router blocker anywhere.
- **Validation**: only two checks, both in `save()` (`NoteEditPage.tsx:50-51`): title must be non-empty after `trim()` → "Give the note a title."; creating requires a channel → "Pick a channel first." Body, kind, and tags are unvalidated. Title is persisted trimmed (`:55`); body is persisted verbatim.
- **Tags / `PillInput`** (`src/components/ui/PillInput.tsx`): commits on **Enter** or **comma** (`:39-41`), and also on **blur** (`:103`); **Backspace on empty input removes the last pill** (`:42-44`); values are `trim().toLowerCase()`-normalized (`:23`) and silently de-duplicated (`:25-28`). No `validate` fn is passed by Second Brain, so tags are free-form.
- **Keyboard shortcuts**: none in this tool. No Cmd/Ctrl+S handler exists anywhere in the app (only `Cmd/Ctrl+I` for the dev DebugOverlay at `src/features/debug/DebugOverlay.tsx:11`, and Escape/Enter inside `Modal`/`Popover`). `ListCard` responds to Enter/Space when focused (`ListCard.tsx:19`).
- **Draft handling**: there is none. A new note exists only in React state until Save; navigating away loses it (subject to the guard gap above). No local-storage draft, no optimistic row.
- **Post-save behavior**: always `navigate('/second-brain')` — you cannot stay on the note after saving, and the list is refetched from scratch on mount.

---

## 5. Search / filter / sort

All in one query — `src/lib/api/secondBrain.ts:15-31`:

```sql
SELECT n.id, n.title, n.kind, n.tags, n.source_ref, n.created_at, n.updated_at,
       substr(n.body, 1, 240) AS snippet
FROM sb_notes n
WHERE n.project_id = ?
  AND (? = '' OR n.title LIKE '%'||?||'%' ESCAPE '\'
              OR n.body  LIKE '%'||?||'%' ESCAPE '\'
              OR n.tags  LIKE '%'||?||'%' ESCAPE '\')
  AND (? = '' OR n.kind = ?)
ORDER BY n.updated_at DESC
```

- **Snippet** = first 240 chars of `body`, computed in SQL (`:21`), then 2-line CSS clamped in the card (`NotesPage.tsx:90`).
- **Search** is substring `LIKE`, case-insensitive only for ASCII, across `title`, `body`, and the raw `tags` JSON string. Input is `trim()`ed and `%`, `_`, `\` are escaped (`:17`). No FTS, no ranking, no highlighting.
- **Kind filter** is exact equality; `''` = all. Options are `[{value:'', label:'All kinds'}, ...KIND_OPTIONS]` (`NotesPage.tsx:13`).
- **Sort** is hard-coded `updated_at DESC`. No user-controllable sort.
- **Debounce**: `NotesPage.tsx:46-49` — `setTimeout(..., search ? 200 : 0)`. **200 ms** while a search term exists, **0 ms** otherwise. Same pattern in the picker at **200 ms** (`SecondBrainPicker.tsx:40-49`).
- **No pagination / no limit** — the full channel's notes come back every query.
- **Tag filtering is not a first-class feature**: tags render as static chips (`NotesPage.tsx:95-99`); not clickable, no tag facet UI. The only way to filter by tag is typing it into search.

---

## 6. Cross-tool touchpoints

### Write-in: `SendToSecondBrainButton`
`src/components/shared/SendToSecondBrainButton.tsx`
- Props: `{ projectId, sourceRef, kind, title, body, tags?, size? = 'sm' }` (`:6-14`).
- On mount / on `(projectId, sourceRef)` change: `ingest.lookup` to decide the label; failures swallowed ("lookup is cosmetic", `:25-32`).
- Label state machine (`:51-52`): `justSent` → Check + "In Second Brain"; else `exists` → "Update in Second Brain"; else "Send to Second Brain". Disabled when `!body.trim() || !projectId` (`:50`). Errors render as a small `--color-warning` string beside the button (`:54`).
- **Exactly one call site**: `src/features/breezy-script-pro/pages/ReviewPage.tsx:160-169` — `projectId={prod.project_id}`, `sourceRef={`scriptpro:${prod.id}`}`, `kind="script"`, `title={prod.chosen_title || prod.name}`, `body={script}`, `size="md"`, no tags. Rendered only when `script.trim()` is non-empty.
- Ingest contract (`secondBrain.ts:89-131`): `push` upserts on `(project_id, source_ref)` — updates `title/body/kind/tags/updated_at` if found, else inserts; returns `{noteId, created}`. `lookup` returns `{id, updated_at}` or null. Comment at `:88`: **"Never insert into sb_notes directly from another tool."**

### Read-out: `SecondBrainPicker`
`src/features/script-shared/components/SecondBrainPicker.tsx` — single call site: `ProductionDetailPage.tsx:136` (tab id `material`, label "Second Brain", `ProductionDetailPage.tsx:33`).
- Props `{ projectId, interviewJson, patch, flush }`; reads Second Brain but writes into the *production* via Scripts Pro's autosave `patch`/`flush`.
- Default kind filter is `'story'` (`:33`); "All kinds" available.
- Adding a note: `notes.get({id})` for the full body, then appends `{ id: uuid, type: 'second_brain', facet: `note:${id}`, q: `From Second Brain: ${title}`, a: full?.body ?? snippet }` (`:61`) and immediately `flush()`es (`:51-54`).
- **Copy-by-value, not by reference** — comment at `:21-25`: "Second Brain is the source of truth; this is a read-only pull into the script." Editing a note later does **not** update a script that pulled it. Dedupe is only against `facet` refs already present (`:29-30, :121`).
- Legacy `type === 'story'` blocks recognized alongside `type === 'second_brain'` (`:29`, `ProductionDetailPage.tsx:97`).
- Removal removes the block from the production only — never touches the note (`:67-70`).
- Empty state copy: "No notes match. Author material in Second Brain to pull it in here." (`:118`).

### Other touchpoints
- **Debug seeder** writes directly into `sb_notes` (dev fixture): `src/lib/api/debug.ts:148-160` seeds sample stories as `kind:'story'`, `source_ref:''` notes.
- **Projects delete** relies on the FK cascade to remove notes (`src/lib/api/projects.ts:8-10, 46-48`).
- **Backup/restore** is whole-file (copies `breezyscript.db`) — `src/lib/api/backup.ts:1-80`.
- **Clarity handoffs** (`src/features/clarity/handoffs.ts`) do **NOT** touch Second Brain — they write into `bsp_ideas` with `sourceRef: clarity:pillar:<name>` / `clarity:video:<pillar_ref>` (`:46, :65`). No Clarity→Second Brain or Second Brain→ideas path today.
- **No other reader exists.** Nothing reads `sb_notes` outside the `secondBrain.ts` consumers above.

---

## 7. Channel/project scoping

Strict, single-level, enforced in three places:
1. **Schema**: `project_id NOT NULL REFERENCES projects(id) ON DELETE CASCADE` (`001_base.sql:247`) + index (`:257`). Doc: "STRICTLY per-channel: every note belongs to one project" (`001_base.sql:241`).
2. **Query layer**: every read and the ingest lookup filter by `project_id` (`secondBrain.ts:23, 101, 128`). `notes.get`/`update`/`delete` are **id-only and unscoped** (`:10, 67, 81`) — no ownership check; add auth rules in Convex.
3. **UI**: `SecondBrainShell` refuses to render children without `activeProjectId` (`SecondBrainShell.tsx:19-25`); `NotesPage.tsx:34` early-returns without it; `NoteEditPage.tsx:51` blocks create.

Channel identity: `projects` table (`001_base.sql:26-33`: `id, name, description, youtube_channel_id, created_at, updated_at`), a project == a YouTube channel. Active selection persisted in `settings` under key `active_project_id` (`src/lib/api/projects.ts:50, 55-63`).

**Update-on-channel-switch hole**: `NoteEditPage` reads `projectId` only to guard creation; switching channels while editing an existing note still writes to the original note. `NotesPage`'s `load` is memoized on `projectId` so a switch refetches the list correctly.

---

## 8. LLM / AI usage inside Second Brain

**None. Zero.** Confirmed by grep. The only hit is the disclaimer comment at `src/lib/api/secondBrain.ts:4-7`: *"Second Brain is a plain local notes tool: CRUD + text search + the ingest surface other tools push notes through. No LLM, no embeddings, no retrieval."*

Corroborating context:
- The `sb_*` RAG tables were deliberately **dropped** in Phase 9 (2026-07-16) and must not be recreated — `.claude/database.md:25`.
- The whole app is described as "a zero-LLM, local-first, forms-and-text app" — `MIGRATION_PLAN.md:7`. Scripts Pro composes *megaprompts* the user pastes into their own AI (`scriptContextPro.ts`, `scriptsPro.ts:718-733`); nothing calls a model from inside the app.
- The **indirect** AI path: note bodies pulled by `SecondBrainPicker` end up inside the Scripts Pro draft megaprompt text via `brainDump()` (`scriptsPro.ts:235-240`). That's the only way note content reaches a model — user-initiated, one-hop, out-of-app.

Adding AI in the web rebuild (summarize note, auto-tag, semantic search) would be greenfield — there's no prompt, streaming pattern, or output destination to port.

---

## 9. Flow/dashboard/shared state Second Brain depends on (rehoming list)

| Dependency | File:line | What it provides | Rehoming note for React+Convex |
|---|---|---|---|
| `useAppStore.activeProjectId` (zustand) | `src/store/app.ts:3-14` | the ONLY global state the tool reads | Becomes a workspace/channel context; every Convex query/mutation takes `projectId` and must authz it server-side |
| `AppShell` + `AppShellContext` | `src/components/layout/AppShell.tsx:12-26, 67-85` | `setToolName` / `setLeftRail` / `setHeaderRight` imperative chrome slots; also the **first-run gate** (`CreateFirstChannel` when zero projects, `:44-58, :76-80`) | Replace imperative slot-setting with layout composition/route-level layouts |
| `ProjectSelector` in `Header` | `src/components/layout/ProjectSelector.tsx` | writes `activeProjectId`, persists `settings.active_project_id`, inline channel creation | Persist active channel per-user in Convex (or URL segment `/c/:channelId/notes`) — URL scoping would fix the "switch channel mid-edit" hole |
| `projectsApi` | `src/lib/api/projects.ts:12-63` | list/create/getActive/setActive; delete relies on FK cascade | Convex has no cascade — delete notes explicitly on channel delete |
| `LeftRail` | `src/components/layout/LeftRail.tsx` | nav + "Flow tools" back link + the unused `onNavigate` guard hook | Wire `onNavigate` (or a router blocker) this time |
| `ListPage` / `ListCard` / `EmptyState` / `Spinner` | `src/components/layout/ListPage.tsx`, `ListCard.tsx` | standardized loading/empty/search/filter chrome across all tools (`.claude/microtool-design-guide.md:121-122`) | Keep the abstraction; it's what makes the tools feel identical |
| `Input`, `Textarea`, `Select`, `Badge`, `Button`, `ConfirmModal`, `PillInput`, `SearchInput` | `src/components/ui/*` | form primitives, inline-styled with `--color-*` CSS vars | |
| `useUnsavedChanges` | `src/components/shared/UnsavedChangesGuard.tsx` | dirty tracking + confirm modal | |
| `useAutosave` | `src/components/shared/useAutosave.ts` | 700 ms debounce patch/flush | Not used by Second Brain today, but it's the app's stated doctrine (`.claude/script-editor-ux.md:26-45`) — the obvious upgrade for the note editor in a Convex world |
| `db.ts` `query/get/run` | `src/lib/db.ts:41-62` | thin SQLite wrapper; bool→0/1 and `undefined`→null param normalization (`:32-39`) | Replaced wholesale by Convex functions |
| Dashboard/Launcher entry cards | `Dashboard.tsx:24-32`, `Launcher.tsx:161-167` | tool metadata: id `second-brain`, icon `Brain`, accent `#f472b6`, status `active`, copy ("Your private notebook…Fully local.") | The "Fully local" copy will need rewriting for a web app |

### Porting gotchas to fix rather than replicate
1. `tags` as a JSON-encoded TEXT column (`parseTags` at `lib.ts:20-27` swallows parse errors) → make it a real `v.array(v.string())` in Convex; drop `parseTags` entirely.
2. Substring `LIKE` over `title|body|tags` → use a Convex search index on `title`+`body` with a `project_id` filter field; the 240-char snippet must then be computed in JS.
3. Missing unique constraint on `(project_id, source_ref)` for ingest upserts → add an index and do a proper get-or-insert.
4. `notes.get/update/delete` take only `id` with no project check → add ownership assertions.
5. The rail bypasses the unsaved-changes guard.
6. Loading spinner never returns after the first load on the list page.
