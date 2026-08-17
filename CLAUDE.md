# BreezyScriptWebApp

Web rebuild of two micro tools (**Second Brain**, **Scripts Pro**) from the BreezyScript Tauri desktop app at `../BreezyScript`.

**⚠️ Never modify anything in `../BreezyScript`.** It is read-only reference material. Copying patterns/values out of it is fine; importing from it or depending on it is not.

## Read these first

- `docs/implementation-plan.md` — **the plan of record**: schema, routes, component inventory, build order, offline strategy, open questions, risks.
- `docs/breezyscript-web-migration-design.md` — the migration brief (authoritative architecture decisions — do not relitigate §2).
- `docs/stack-decision.md` — why each stack choice was made.
- `docs/audit/*.md` — phase-0 audit of the Tauri repo with file:line citations (design tokens, both tools' behavior, Tauri surface).

## Stack (decided)

Vite + React 19 + TS, plain SPA (`base: '/app/'`) · TanStack Router (`basepath: '/app'`) · Tailwind v4 + shadcn init `-b radix` · Convex (DB, functions, storage, crons, secrets) · Convex Auth Google (`openid email profile` only) · Cloudflare Pages (landing at `/`, app at `/app` behind Cloudflare Access).

## Hard rules

- Every Convex function starts with `requireOwner(ctx)` and asserts channel ownership on id-addressed docs.
- No secret ever ships to the browser; external API calls live in Convex actions.
- The app makes **zero LLM calls** — "AI" is the megaprompt copy/run/paste loop (`MegapromptPanel`). Preserve this.
- Design tokens come from the Tauri app's `@theme` block (see `docs/audit/design-system-audit.md` §2) — dark-only, 13px body, don't substitute stock Tailwind values. Font: self-hosted Inter (variable woff2), system stack fallback.
- shadcn components: add one at a time at first need, Radix variant only; hand-write simple styled primitives.
- `_redirects` must land at `dist/_redirects` with `/app/* /app/index.html 200` — never a bare `/*` rule.
- **Phone-first responsiveness:** the owner uses this app from a phone regularly. Every screen must be usable at 390px wide — rows wrap (`flex-wrap`/`max-md:flex-col`), side-by-side splits stack, nothing clips or forces horizontal page scroll. Page padding is `px-4 … md:px-8`. Check new UI at 390px before calling it done.
- **Compact list-page toolbar (decided on Idea Bank, 2026-08; use for new list screens):** skip the in-page page heading — the left rail / collapsed top bar already names the page; content starts at the toolbar. The toolbar is one row: search input + explicit-submit Search button (icon-only below `md`) + a filter-toggle icon button that shows/hides the filter selects on the row beneath (panel starts open when the URL carries an active filter; the toggle renders `primary` while any filter is active so hidden filters stay visible). The primary create action is a floating action button (round, fixed bottom-right, `md:hidden`) on phones and a labeled `primary` button at the right end of the toolbar on `md+` where the sidebar shows — never both at once; give the list a bottom spacer (`h-14 md:hidden`) so the FAB can't cover the last row. Reference implementation: `src/routes/c.$channelId.bank.index.tsx`.
- **State-driven editor action bar (decided on Idea Bank, 2026-08; use for all editor views, including the future script editor):** editors dock a sticky bottom bar (`sticky bottom-0`, `border-t`, page background) inside the scroll column. Its buttons reflect the document state, not a fixed layout — **dirty:** `[Delete] … [Cancel] [Save]` where Save saves-and-closes, Cmd/Ctrl+S saves-and-stays, and Cancel is guarded by the unsaved-changes blocker; **clean** (fresh open, or right after a Cmd+S): `[Delete] … [Done]` where Done simply closes. Never render a disabled Save, and never label the exit "Cancel" when there is nothing to cancel. Delete sits left, separated from the exit/save group, and always goes through the confirm dialog. Reference implementation: `src/features/bank/BankIdeaEditor.tsx`.
- **Every delete operation must go through a confirmation dialog** (`ConfirmDialog` or the `useConfirm` hook) before the mutation fires — no one-click destructive actions. This covers entity deletes (channels, notes, ideas, productions, assets, templates, shapes, library items, feedback) and in-editor removals that discard user-written content (e.g. an answered interview question). Removals that only discard a copy (e.g. unpulling a Second Brain block from a script) may skip the dialog but must say the source is untouched.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
