# Tauri Surface & Data Layer — Repo Audit Findings

> Phase-0 audit of the BreezyScript Tauri repo (read-only), per `docs/breezyscript-web-migration-design.md` §5.3.
> Audited: 2026-08-14. All paths relative to `/Users/tundra/TundraTools/BreezyScript`.

**Headline:** the Tauri surface is astonishingly small. There are **zero custom `#[tauri::command]` handlers** and **zero `invoke()` call sites** in `src/`. The Rust side (`src-tauri/src/lib.rs`, 48 lines) does nothing but register 5 plugins and 4 SQL migrations. Everything else is either (a) SQL issued directly from the webview via `plugin-sql`, or (b) six plugin JS APIs. One external network call exists in the entire app (ElevenLabs). Confirmed by `VOICE_PRO_SPEC.md:54` ("No Rust commands, no sidecar, no bundled binaries. The Tauri layer is back to plugins-only.").

The brief's §5.3 "`invoke()` → Convex mapping table" therefore becomes a **frontend-API-module → Convex function mapping** (see implementation plan §4) — the API layer is `src/lib/api/*.ts`, not Rust.

---

## 1. Plugin registry and every call site

### Plugins registered (Rust, `lib.rs:36-45`; `Cargo.toml:21-29`)
sql (sqlite) · fs · dialog · clipboard-manager · opener · process · core `protocol-asset` feature.

### Every plugin/API call site in `src/`

| # | API | Call site(s) | What it does | Feature | Web equivalent |
|---|---|---|---|---|---|
| 1 | `Database.load` | `db.ts:13` (opens `sqlite:breezyscript.db`, WAL at `:18`) | data layer | all | Convex client |
| 2 | `db.select` via `query<T>` | `db.ts:42-44` | raw SELECT | all | Convex queries |
| 3 | `db.execute` via `run` | `db.ts:54-59`; `backup.ts:70,103` (wal_checkpoint) | writes + PRAGMA | all | Convex mutations |
| 4 | `save` dialog | `backup.ts:72-75` | backup save picker | Backup | browser download |
| 5 | `open` dialog | `backup.ts:90-93` | restore picker | Backup | `<input type=file>` |
| 6 | `copyFile` fs | `backup.ts:79,110` | copy DB to/from path | Backup | n/a (server export) |
| 7 | `exists` fs | `backup.ts:29,31,116` | path probing | Backup | n/a |
| 8 | `readFile` fs | `backup.ts:46` | SQLite magic-byte check | Backup | `File.arrayBuffer()` |
| 9 | `remove` fs | `backup.ts:116` | delete `-wal`/`-shm` | Backup | n/a |
| 10 | `relaunch` process | `backup.ts:123` | restart after restore | Backup | `location.reload()` |
| 11 | `appConfigDir`/`appDataDir`/`join` path | `backup.ts:28-30`, `voicePro.ts:184-190`, `voice-pro/lib.ts:9-10`, `TakeRow.tsx:31` | path resolution | Backup, Voice Pro | n/a |
| 12 | `getVersion` | `GeneralPage.tsx:16` | version in Settings | Settings | build-time constant |
| 13 | `isTauri` | `CreateFirstChannel.tsx:26` | browser-vs-desktop error | Onboarding | **delete** |
| 14 | `convertFileSrc` | `voice-pro/lib.ts:10` | local audio → `asset://` URL | Voice Pro | Convex `storage.getUrl()` |
| 15 | `writeText` clipboard plugin | `TakeRow.tsx:97` (only site; app otherwise uses `navigator.clipboard` — 4 sites, web-portable) | copy recipe | Voice Pro | `navigator.clipboard` |
| 16 | `revealItemInDir` opener | `TakeRow.tsx:31` | reveal in Finder | Voice Pro | **no equivalent** — drop/download |
| 17 | `mkdir`/`writeFile`/`remove`/`copyFile` fs | `voicePro.ts:156-160, 20, 191` | write/delete/export render audio | Voice Pro | Convex file storage |
| 18 | `data-tauri-drag-region` | `Header.tsx:13`, `Launcher.tsx:83` | frameless drag | shell | **delete** |

Capabilities allowlist (`capabilities/default.json:8-36`) grants a few things with **no call sites** (`opener:allow-open-url`, `clipboard read`, `fs:scope-home-recursive`) — nothing hidden behind them.

---

## 2. Full SQLite schema (by feature ownership)

DB: `<appConfigDir>/breezyscript.db`, migrations versioned in Rust (`lib.rs:8-33`), at version 4. WAL on.

### A. Global
- **`settings`** (`001_base.sql:16-20`): `key PK, value, updated_at`.
- **`projects`** (`:26-33`): `id PK, name, description '', youtube_channel_id '' (vestigial — removed Analytics tool, `:24-25`; no UI), created_at, updated_at`. Note: schema defaults are `datetime('now')` but app writes ISO-8601 — **mixed timestamp formats in same columns** across the DB.

### B. Scripts Pro (`bsp_*`) — 8 tables
See `scripts-pro-audit.md` §1 for full column detail: `bsp_ideas`, `bsp_personas`, `bsp_audience_profiles`, `bsp_frameworks` (3 identical "foundation asset" tables), `bsp_title_templates`, `bsp_title_shapes`, `bsp_productions` (9 json-in-text columns), `bsp_library`, `bsp_feedback`.

### C. Clarity — 1 table (NOT migrating, but Scripts Pro reads 2 fields)
**`clarity_profile`** (`001_base.sql:198-238`), `UNIQUE(project_id)`: scalars (`creator_name`, `last_active_step`, 3 `*_complete` flags, `target_audience`, `problem_statement`, `brand_statement`) + **20 json-in-text columns** (friction map, values phrases/rules, content persona, opposition, audience raw, problem/framework/named framework, content pillars, hub video, book outline, video master list, products, assets, profit analysis, lane, focus guard, needs review). Effectively a document store crammed into one SQLite row. Scripts Pro reads only `brand_statement` + `content_persona_json` via `gatherIdentityContext`.

### D. Second Brain — 1 table
**`sb_notes`** (`:245-257`) + index `idx_sb_notes_project`. See `second-brain-audit.md` §1.

### E. Voice Pro (`vp_*`) — migrations 002–004 (OUT OF SCOPE phase 1)
Live tables: `vp_profiles` (global, no project_id; only `elevenlabs` engine ever used), `vp_renders` (takes; `status queued|rendering|ready|failed`; `file_path` relative to `<appdata>/voicepro/`; `voiceover_id` has NO FK — SQLite ALTER limitation, app deletes explicitly), `vp_voiceovers` (`title, script, settings_json {profile_id, seed, el}`).
**Dead schema — do not migrate:** `vp_clips` (entire table, zero references), `vp_renders.engine`/`clip_id`, `vp_profiles.engine`, v1 columns dropped by migration 003.

### Index summary
Only 6 indexes exist: `idx_sb_notes_project`, `idx_vp_clips_profile`, `idx_vp_renders_project/profile/voiceover`, `idx_vp_voiceovers_project`. **No index on any `bsp_*.project_id`** despite every query filtering by it — Convex indexes fix this.

---

## 3. Settings / KV persistence — complete key inventory

All settings live in the **`settings` SQLite table only**. No localStorage, no plugin-store, no `.env` (verified by grep).

Two write paths with **mixed encoding**: `settingsApi` (raw strings, `settings.ts:7-29`) and `useToolSetting` (JSON-encoded, `useToolSetting.ts:22,31`).

| Key | Encoding | Class | Web disposition |
|---|---|---|---|
| `active_project_id` | raw | session state | URL segment (or per-user Convex doc) |
| `voice_pro.elevenlabs_api_key` | raw | 🔴 **SECRET, plaintext** | Convex env var (deferred phase) |
| `voice_pro.export_dir` | raw | desktop UI pref | drop |
| `script.words_per_minute` | JSON number | data-affecting pref (feeds draft prompt, `scriptsPro.ts:253`) | Convex (consider per-channel) |
| `debug_mode_enabled` | '1'/'0' | dev flag | drop or localStorage |
| `app.noAiNoteDismissed` | 'true' | UI pref | localStorage |
| `breezy_script.preview_font_size/weight/width/opacity/speed/teleprompter/rail_open` | JSON | teleprompter UI prefs (`ScriptPreview.tsx:30-36`) | localStorage |

All settings are global, not project-scoped — including `script.words_per_minute`, which arguably should be per-channel.

Zustand store (`store/app.ts:11-14`) holds exactly one field, `activeProjectId`, mirrored from settings; DB is source of truth.

---

## 4. Secrets inventory

Exactly one secret in the app: **ElevenLabs API key**, plaintext in the `settings` table (`elevenLabs.ts:5-10`), sent as `xi-api-key` header (`elevenLabs.ts:35`). Set in `VoicesPage.tsx:52`. No LLM keys exist by design (`.claude/llm.md:5-8`). Backup export copies the raw `.db`, so **the plaintext key travels in every backup file** (`backup.ts:79`).

Web migration: key moves to a Convex env var; `elevenLabsApi.tts()` becomes a Convex action. (Deferred — Voice Pro/ElevenLabs is a later phase per `stack-decision.md`.)

---

## 5. File-system usage

| Purpose | Path/format | Code |
|---|---|---|
| Live DB | `<appConfigDir>/breezyscript.db` + WAL sidecars | `backup.ts:27-33` |
| Backup export | raw `.db` (deliberately not zipped), `wal_checkpoint(TRUNCATE)` first | `backup.ts:66-81` |
| Backup import | validated by 16-byte `"SQLite format 3\0"` magic; overwrites live DB; relaunch after 1500ms | `backup.ts:89-125` |
| Voice renders | `<appDataDir>/voicepro/renders/<uuid>.wav|.mp3`; WAV wrapped from PCM by `wavFromPcm` (`elevenLabs.ts:118-141`) | `voicePro.ts:152-160` |
| Voice playback | `convertFileSrc` → `asset://`; CSP `media-src` scope `$APPDATA/voicepro/**` | `voice-pro/lib.ts:8-11`, `tauri.conf.json:29,32` |
| PDF export (Clarity) | no file written — HTML → hidden iframe → `win.print()` → OS Save-as-PDF; known-broken stopgap (`pdf.ts:3-10` TODO) | `pdf.ts:19-60` |
| Markdown export (Clarity) | pure web Blob + `a.download` | `exportProfile.ts:143-152` |

`FileDropzone` uses plain web `File` APIs and currently has zero usages.

---

## 6. Dialog / shell / notification / clipboard / shortcuts / windows

- **Dialogs:** 3 sites (backup save/open, audio export save). App confirms via its own `ConfirmModal`, never native.
- **Shell/opener:** one `revealItemInDir`. No process spawning, no sidecars.
- **Notifications:** none anywhere.
- **Clipboard:** primary path is web `navigator.clipboard.writeText` (4 sites: CopyBlock, MegapromptPanel, CopyButton, CopyMenu) — portable. Tauri plugin used once (`TakeRow.tsx:97`).
- **Global shortcuts:** none. Only dev `Ctrl/Cmd+I` debug overlay (`DebugOverlay.tsx:11-17`, DEV-gated) + component-local Escape/Enter/Space handlers.
- **Windows:** single window, 1280×820 min 1080×720, overlay titlebar (see design audit §8). No multi-window, no `listen`/`emit`.
- **CSP** (`tauri.conf.json:29`): `connect-src` allows only self + `https://api.elevenlabs.io` — architecturally enforces the no-LLM claim.

---

## 7. LLM integration architecture

**There is no LLM integration — the app's core product claim, not an oversight** (`.claude/llm.md:3-8`: "BreezyScript contains no AI. The app does the thinking-structure; your AI does the typing — and we never see either."). `fetch(` appears exactly once in `src/` (`elevenLabs.ts:38`). Two AI-shaped patterns instead: deterministic composition (Clarity) and megaprompt compose/apply (Scripts Pro — see scripts-pro audit §5). No streaming, explicitly forbidden (`.claude/llm.md:127-128`).

**Migration implication:** compose/apply is pure TS over DB reads. On Convex, `compose*` becomes a query and `apply*` a mutation — near-mechanical port, no keys, no streaming. The 882-line `scriptsPro.ts` is the largest single port but is all `get/query/run` calls.

---

## 8. Channel/project model

- A project == a YouTube channel; the only tenancy scope. **No user/account concept exists anywhere.**
- `projectsApi` (`projects.ts:12-64`): list (created_at DESC) / create / update (one UPDATE per changed field) / delete / getActive / setActive.
- Active project = `settings['active_project_id']`, mirrored into zustand; Header `ProjectSelector` writes it; self-heals to first project.
- **Delete relies entirely on FK CASCADE** (11 CASCADE edges + 2 SET NULL edges: `bsp_productions.idea_id`, `bsp_feedback.production_id`). **Convex has no cascades — project delete must be an explicit fan-out mutation; SET NULL semantics need explicit null-out.**
- `vp_profiles` is the one non-project-scoped entity.
- First-run gate: zero channels ⇒ `CreateFirstChannel` replaces all tool content.

---

## 9. Offline / local-first UX dependencies

1. **Everything except ElevenLabs TTS works fully offline** (`VOICE_PRO_SPEC.md:14-15`).
2. **Zero-latency reads; autosave is a debounce straight to disk** with no optimistic-UI or conflict machinery — Convex optimistic updates cover this but latency behavior changes.
3. **Privacy as product claim** — "nothing is transmitted", CSP-enforced. Convex breaks this architecturally; the creator's strategy content will live on a server. (Owner has accepted Convex; surface, don't relitigate.)
4. **The DB file is the user's data** — backup = copy one file; `MIGRATION_PLAN.md:146-151` even planned iCloud-folder sync as a no-backend model. The desktop app's one-time-purchase/no-backend framing conflicts with Convex — but the web app is a personal single-user tool per the brief, so this is context, not a blocker.
5. **`createMemoryRouter`** (`App.tsx:38`) — no URL bar at all today. Web must switch to real URLs; every route needs a deep-link/refresh story.
6. **No auth, no concurrency control** — single-writer assumption throughout.

---

## 10. Auto-update, deep links, tray, menus

**All absent** (verified): no updater, no deep-link plugin, no tray, no custom menus, no single-instance/window-state/log/notification/http plugins. Distribution is manual DMG. Nothing to migrate.

---

## Cross-cutting migration risks (ranked)

1. **No user/auth model exists** — every table needs the owner-auth wrapper (`requireOwner`), and channel scoping must be enforced server-side (today `get/update/delete` by id skip the project check).
2. **FK cascades → explicit fan-out** (11 CASCADE + 2 SET NULL edges).
3. **~35 json-in-text columns** become native Convex objects; current parsing is defensively lenient (try/catch everywhere), implying malformed data exists in the wild — moot since we start clean, but keep lenient parsing at the megaprompt paste boundary.
4. **Dynamic table-name SQL** (3 foundation tables share one `${table}` code path) → one Convex table with a `type` discriminator.
5. **Mixed timestamp formats** and **mixed settings encoding** — don't replicate; use numbers (`Date.now()` per-mutation) and typed fields.
6. **Dead schema to NOT migrate:** `vp_clips`, hook columns' UI, `projects.youtube_channel_id`, `bsp_library` kind `hook_structure`.
7. **`.claude/ipc.md` and `.claude/database.md` are stale Electron-era docs** (ipcMain, better-sqlite3, encrypted settings, zip backups — none true of current code). Do not use as spec; `MIGRATION_PLAN.md:86-87` flags them as never-done rewrites.
8. **PDF export already a known-broken stopgap** — and Clarity-only, out of scope.
