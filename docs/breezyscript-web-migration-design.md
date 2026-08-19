# BreezyScript Web — High-Level Design & Migration Brief

**Version:** 1.2 · **Date:** 2026-08-14
**Audience:** Claude Code, with read access to the existing **BreezyScript** Tauri repo
**Author's constraint:** This document was written **without repo access.** Everything about the target architecture is decided and authoritative. Everything about the *existing* app is a hypothesis to verify. §5 tells you exactly what to go find.

---

## 1. What this document is and how to use it

BreezyScript is an existing **Tauri desktop app**. We are building a **web-based version** of it. This is a migration of *user experience, workflow, and styling* — not a code port.

**Scope of the first phase: two micro tools currently living inside the app's "Flow" section — `Scripts Pro` and `Second Brain`.** Nothing else migrates yet.

Your job is to read the Tauri repo and turn this high-level brief into a **detailed implementation plan**. The output contract is in §9.

**Do not begin implementation from this document alone.** It intentionally contains gaps that only the repo can fill.

---

## 2. Decisions already made (authoritative — do not relitigate)

These were settled in prior design work. Treat as fixed constraints.

| Area | Decision |
|---|---|
| **Frontend** | Vite + React 19 + TypeScript, **plain SPA** — no Next.js / Remix / TanStack Start |
| **Routing** | TanStack Router (file-based, type-safe params & search) |
| **Styling** | Tailwind v4 + shadcn/ui, initialized with **`npx shadcn init -b radix`** (see §2.1) |
| **Backend** | **Convex** — database, file storage, server functions, crons, secrets |
| **Auth** | Google OAuth via Convex Auth, scopes `openid email profile` **only** |
| **Authorization** | Single-user. `requireOwner(ctx)` helper checking `identity.email === OWNER_EMAIL`, called first in every Convex function |
| **Deploy** | Static build → **Cloudflare Pages** (confirmed). Public landing page at `/`, app at `/app` behind Cloudflare Access — see §2.2 |
| **Devtools** | Keep `@tanstack/devtools-vite` (pipes browser console → terminal). **Do not mount the `<TanStackDevtools>` panel** — its default hotkey fires while typing capital letters into textareas |

### Migration parameters (confirmed by the owner)

| Question | Answer | Consequence |
|---|---|---|
| Migrate existing data? | **No — start clean** | No export/import path. No data-migration code. Do not build one. |
| Fate of the Tauri app? | **Retire it** once web works | No sync layer, no conflict resolution, no dual-write. Web becomes sole source of truth. |
| Visual fidelity? | **Same design system, web-adapted** | Extract tokens, palette, type scale, spacing, component vocabulary **faithfully**. Adapt *layout and navigation* to browser conventions: responsive, URL-driven, back-button-correct, keyboard-accessible. |

**Read that third row carefully.** It is the central styling instruction: *the design language is preserved, the interaction shell is rebuilt for the web.* A pixel-for-pixel clone of a desktop window is the wrong outcome.

### 2.1 Component strategy — where the shadcn line sits

shadcn is **not a dependency.** The CLI copies source into the repo; we own, edit, and delete those files freely. What we are actually adopting is the **headless behavior layer underneath** (Radix) — focus trapping and restoration, escape/outside-click dismissal, ARIA wiring, keyboard nav with typeahead, popover collision detection, scroll locking, portal and z-index management.

The Tailwind classes shadcn ships are **boilerplate to be replaced** with the tokens extracted in §5.1. Do not treat shadcn's default look as the target.

**Draw the line by this test: does the component manage focus, keyboard navigation, or floating position?**

| Write by hand, against our tokens | Take from shadcn |
|---|---|
| Button, Card, Badge, Input, Textarea, Label, Separator, Skeleton, layout primitives, anything that is a styled `div` | Dialog, DropdownMenu, Select, Combobox, Command, Popover, Tooltip, Toast, Tabs, ScrollArea, ContextMenu |

Rationale for the left column: these are 15–30 lines of Tailwind each. shadcn's versions carry `cva` variant machinery we mostly don't need, and removing its opinions takes longer than writing ours. Rationale for the right column: a correct Dialog or Combobox is days of work and the failure modes are subtle — focus escaping on shift-tab, typeahead not firing, dismissal triggering on scrollbar clicks.

**Do not bulk-add components.** Add each one at the moment it is first needed.

**⚠️ Use the Radix variant, not the default.** As of July 2026 `shadcn init` defaults to Base UI. Radix remains fully supported via `-b radix` and receives every update. We deliberately choose Radix because this project is built through LLM-driven development, and Radix has far more training data behind it — Claude Code writes correct Radix component code from memory and is measurably shakier on Base UI's newer API surface. That daily friction outweighs being on the newer default. A migration path exists if that calculus changes.

### 2.2 Public surface: landing page at `/`, app at `/app`

**Decided.** One Cloudflare Pages project, one deploy, two surfaces:

| Path | What | Access |
|---|---|---|
| `breezyscript.com/` | Public landing page — plain HTML + Tailwind, **no framework, no login form** | Public |
| `breezyscript.com/app/*` | The React SPA | **Behind Cloudflare Access** (Google IdP, allow-list = owner email only) |

Rationale: the root domain gets an honest public face for branding, and strangers never load a byte of app code. **There is no decoy login page** — a fake login was considered and rejected: with Google OAuth there is no password to brute-force, and the app bundle contains `VITE_CONVEX_URL` in plaintext anyway, so obscuring the entry point protects nothing.

**Required config — all three, or deep links break:**

1. **Vite** — `base: '/app/'`
2. **TanStack Router** — `basepath: '/app'`
3. **`_redirects`**, scoped to the app only:

```
/app/* /app/index.html 200
```

**⚠️ Do not use a bare `/* /index.html 200`** — it would swallow the landing page and break the split.

**⚠️ `_redirects` must land at `dist/_redirects`, not `dist/app/_redirects`.** If the app builds into `dist/app/`, Vite's `publicDir` will copy it to the wrong place. Handle this explicitly in the build script and verify the file's location in the output before deploying.

**Verify before calling deploy done:** hard-refresh a deep link like `/app/c/<id>/bank` on a deployed preview, and confirm `/` still serves the landing page.

The landing page should consume the **same design tokens** extracted in §5.1 so both surfaces read as one product. It is a brochure — do not build it in React.

*(A subdomain split — `app.breezyscript.com` — would avoid the base-path and `_redirects` config entirely. The owner chose the single-deploy path variant; note the alternative only if the path config proves troublesome.)*

---

## 3. The information-architecture change

This is the one deliberate structural departure from the desktop app.

**In the Tauri app:** `Scripts Pro` and `Second Brain` are micro tools nested inside a **"Flow" section**.

**In the web app:** the "Flow" wrapper is **removed**. Both become **top-level micro tools**.

Rationale, in the owner's words: *"these will exist as micro tools at the top level because we will not have separate sections for clarity and flow."*

### What this means concretely

- No section-level nav tier. Navigation is flat: the two tools sit at the root.
- Each tool owns its own URL space and is independently addressable and bookmarkable.
- Any "Flow"-level chrome (section header, breadcrumb, section-scoped sidebar, section landing page) is **not** carried over. If shared state or shared UI lived at the Flow level in the desktop app, **flag it in your plan** — it needs a new home (see §5.2).
- Design the shell so adding a third micro tool later requires no restructuring.

### Proposed route shape (validate against actual repo entities)

All app routes sit under the `/app` basepath (§2.2). Paths below are **router-relative** — TanStack Router's `basepath: '/app'` prepends it, so write routes without it.

```
/                          → home / launcher      (served at /app)
/c/$channelId/bank         → Scripts Pro          (historical: originally /scripts,
/c/$channelId/bank/$ideaId    the megaprompt tool this doc describes was removed
                              2026-08-18 and the stepped workflow took the name)
/brain                     → Second Brain
/brain/$itemId
/settings
```

Prefer **search params over component state** for anything a reload should preserve — filters, active tab, selected item, sort order. This is a concrete web-adaptation win over the desktop app and TanStack Router makes it type-safe. Call this out explicitly wherever the desktop app used ephemeral local state.

---

## 4. Working hypotheses about the two tools

**Unverified.** Confirm or correct each from the repo; do not build on them as stated.

**Second Brain** — capture and retrieval of raw material: ideas, notes, snippets, references, stories. Low-friction input, searchable, taggable. Likely the upstream feeder for Scripts Pro.

**Scripts Pro** — the script creation workflow: turning a concept into a structured, versioned script. Likely has multi-step or multi-pane structure and iterative drafting.

**Their relationship is the highest-value thing to characterize.** If Second Brain feeds Scripts Pro, that hand-off is the core workflow and must survive migration intact — even though the "Flow" section that visually implied the relationship is being removed. **Removing the section wrapper must not sever the data path.** Explicitly address in your plan how the two tools reference each other once flattened.

### Alignment with the existing content model

The broader project already defines these entities (see the project's `stack-decision.md`). Map repo concepts onto them where they fit; **note mismatches rather than forcing them**:

```
ideas, stories, concepts        ← likely Second Brain territory
scripts, scriptVersions         ← likely Scripts Pro territory
personas, framework, audienceProfile,
titleTemplates, hookStructures,
videoStructures, ctas, disclosures   ← supporting libraries, ownership TBD
```

Several of these correspond to existing BreezyScripts **skills** (`persona-voice-capture`, `story-library-curator`, `script-blueprint-drafter`, etc.). Where a repo feature overlaps a skill, note it — the web app should eventually call the skill rather than reimplement its logic.

---

## 5. Extraction brief — what to find in the repo

Work through these in order. Report findings as structured notes; this becomes the evidence base for the detailed plan.

### 5.1 Design system extraction (highest fidelity requirement)

Produce a **token inventory**, in whatever form the repo actually uses:

- Color palette — every semantic role (surface, elevated surface, border, text primary/secondary/muted, accent, destructive, success, warning). Note light/dark handling.
- Typography — families, weights, sizes, line heights, and the scale's logic
- Spacing scale, border radii, shadows/elevation, and any depth model
- Motion — durations, easings, which interactions are animated
- Existing CSS approach: Tailwind already? CSS Modules? styled-components? vanilla? Tauri window theming or native-appearance styling?

**Deliverable:** a Tailwind v4 theme config reproducing the palette and scales, plus a mapping table `repo token → Tailwind token → shadcn variable`.

Flag any styling that depends on **native window chrome** (custom titlebar, traffic lights, vibrancy/blur, native context menus, platform-conditional CSS). These have no web equivalent and need explicit design decisions.

### 5.2 Workflow and UX extraction

For **each** of the two tools:

1. **Entity model** — what objects exist, fields, relationships, lifecycle/status values
2. **Screen inventory** — every view, its purpose, its states (empty, loading, error, populated, saving)
3. **The primary loop** — the step-by-step path a user takes to accomplish the tool's main job. Be concrete and sequential.
4. **Input mechanics** — autosave vs. explicit save, debounce timing, draft handling, undo, validation, keyboard shortcuts. *For a script-writing tool this is critical: get the save semantics exactly right.*
5. **Cross-tool touchpoints** — every place one tool reads from, writes to, or navigates into the other
6. **Flow-level shared state** — anything that lived at the section level and now needs rehoming (§3)
7. **AI/LLM calls** — every model call: where it fires, prompt construction, streaming or not, error/retry handling, where output lands
8. **Long-running operations** — anything with a spinner or progress bar; note expected duration

### 5.3 Tauri-specific surface audit

**This is the highest-risk area** and the most likely source of hidden work. Enumerate every native capability in use.

| Tauri surface | Find in repo | Web target |
|---|---|---|
| `invoke()` → Rust commands | **Enumerate every command** with signature + behavior | **Each becomes a Convex query, mutation, or action.** This is the single most important mapping in the migration. |
| `plugin-sql` / SQLite | Schema + queries | Convex tables + functions |
| `plugin-store` (KV persistence) | Keys and usage | Convex table, or `localStorage` for pure UI prefs |
| `plugin-fs` | Read/write paths | Convex file storage; File System Access API for local import/export |
| `plugin-dialog` (native pickers) | Call sites | `<input type="file">` / drag-drop |
| `plugin-shell` / process spawn | Call sites | **No web equivalent** — must move server-side into a Convex action, or be dropped. Flag loudly. |
| `plugin-notification` | Triggers | Web Notifications API and/or Resend email |
| Global shortcuts | Registered accelerators | In-page only; OS-global shortcuts are impossible |
| Native menus / tray | Menu structure | Command palette + in-app menus |
| Multi-window / window state | Windows and persistence | Routes; consider popout via `window.open` only if genuinely needed |
| Auto-update | — | Deploy pipeline; drop entirely |
| Deep links / custom protocol | Handlers | **Real URLs — a straight upgrade.** Note where this improves on desktop. |
| Secrets in Rust / local config | **Every API key** | **Must move into Convex env vars + actions.** Never ship a key to the browser. |

### 5.4 ⚠️ Offline behavior — explicit decision required

The Tauri app almost certainly works **fully offline against a local database**. **Convex is online-first.** For a tool whose core activity is typing long-form scripts, an unnoticed connection drop mid-draft is a real data-loss risk and a real regression.

Determine from the repo how much the current UX assumes local-first behavior, then **propose an explicit strategy** — options ranging from optimistic updates plus a clear connection indicator, through local draft buffering in `localStorage` with reconciliation on reconnect, up to a full offline layer. **Do not leave this implicit.** State the chosen posture and its failure modes.

### 5.5 What NOT to carry over

- Data migration code (start clean — confirmed)
- Sync or dual-write logic (Tauri is being retired — confirmed)
- The "Flow" section wrapper (§3)
- Rust business logic reimplemented client-side — it belongs in Convex functions
- Any secret currently held in the desktop binary
- Auto-update machinery
- Anything the owner has already stopped using — **ask before porting dead features**

---

## 6. Target architecture sketch

```
┌────────────────────────────────────────┐
│  Static SPA  (Cloudflare Pages)        │
│  React 19 · TanStack Router            │
│  Tailwind v4 · shadcn/ui               │
│  Routes: / · /scripts · /brain         │
└───────────────┬────────────────────────┘
                │  reactive queries + mutations (typed)
                ▼
┌────────────────────────────────────────┐
│  Convex                                │
│  ├── schema.ts       entities          │
│  ├── queries/        reads (reactive)  │
│  ├── mutations/      writes            │
│  ├── actions/        external APIs,    │
│  │                   long jobs         │
│  ├── crons.ts        scheduled work    │
│  ├── files           audio, images     │
│  └── env             all secrets       │
└────────────────────────────────────────┘
```

**Rules:**

- Every Convex function starts with `requireOwner(ctx)`
- No secret ever reaches the browser
- Queries are reactive by default — do not add a client cache layer or hand-rolled polling
- External API calls (LLM, ElevenLabs, later YouTube) go in **actions**, never in the client
- Anything that could exceed a second belongs in an action, not a mutation

---

## 7. Migration principles

1. **Extract behavior, not code.** Rust and React-in-Tauri don't port. The workflow, the entity model, and the design tokens are the assets.
2. **Faithful tokens, adapted shell.** Same visual language; browser-native navigation.
3. **URL is state.** Anything worth returning to gets a URL. This is a genuine improvement over the desktop app — lean into it.
4. **Preserve the primary loop above all.** Screens may be rearranged; the sequence of actions that gets real work done should feel unchanged.
5. **Single-user simplicity is a feature.** No orgs, roles, sharing, or invites. Don't build extensibility nobody needs.
6. **Two moving parts.** Every proposed addition to the stack needs a justification.
7. **Ship one tool end-to-end first.** A complete Second Brain beats two half-built tools — it makes the app usable daily and validates the whole architecture under real use.

---

## 8. Suggested phasing (validate and refine)

| Phase | Deliverable |
|---|---|
| **0** | Repo audit per §5. No code. Output = findings document. |
| **1** | Skeleton: Vite (`base: '/app/'`) + React + Convex + Google auth + `requireOwner` + app shell + Tailwind theme from extracted tokens. Landing page stub at `/`. Cloudflare Access policy on `/app*`. Deep-link refresh verified on a deployed preview. |
| **2** | **Second Brain, end to end.** Simpler tool, immediately useful, proves the architecture. |
| **3** | **Scripts Pro,** including the Second Brain → Scripts Pro hand-off |
| **4** | Polish: keyboard shortcuts, command palette, offline posture (§5.4), empty/error states |
| **5** | Deploy; retire the Tauri app |

---

## 9. Output contract — what your detailed plan must contain

Produce a plan that includes **all** of:

1. **Repo audit findings** — §5.1–5.4, with file references
2. **Design token mapping** — repo → Tailwind v4 theme, as usable config
3. **Convex schema** — concrete `schema.ts` for both tools, with rationale for departures from §4's entity list
4. **`invoke()` → Convex function mapping table** — every Rust command, its new home, its signature
5. **Route map** — full URL structure, including which state lives in search params
6. **Component inventory** — every component the two tools need, each classified per the §2.1 line as *hand-written*, *shadcn (Radix)*, or *custom-complex*. Justify anything taken from shadcn that isn't focus/keyboard/positioning-heavy.
7. **Screen-by-screen build order** with dependencies
8. **Offline strategy** — explicit decision per §5.4, with stated failure modes
9. **Open questions for the owner** — anything ambiguous, dead-looking, or requiring a product judgment call. **Ask rather than assume.**
10. **Risk register** — what could go wrong, ordered by likelihood × impact

### Ground rules

- **Cite the repo.** Every claim about existing behavior should reference a file or path.
- **Separate observed from inferred.** Mark inferences explicitly.
- **Surface disagreements.** If the repo reveals something that makes a §2 decision wrong, say so directly with evidence — don't silently work around it.
- **Don't pad.** A short plan grounded in the actual repo beats a long speculative one.

---

## 10. Non-goals for this phase

- YouTube integration (deferred — see `stack-decision.md` §5)
- ElevenLabs audio rendering (deferred to a later phase)
- Any micro tool other than Scripts Pro and Second Brain
- Multi-user, sharing, collaboration, or permissions
- Mobile-native apps (responsive web only)
- Data migration from the Tauri app
- Offline-first parity with the desktop app (unless §5.4 concludes otherwise)
