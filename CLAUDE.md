# BreezyScriptWebApp

Web rebuild of two micro tools (**Second Brain**, **Scripts Pro**) from the BreezyScript Tauri desktop app at `../BreezyScript`. **Scripts Pro is the stepped idea→production workflow** (formerly called "Idea Bank", living at the `bank` routes and `bank*` tables); the original megaprompt-based Scripts Pro was fully removed on 2026-08-18 (code, routes, Convex functions, tables, and seed data).

**⚠️ Never modify anything in `../BreezyScript`.** It is read-only reference material. Copying patterns/values out of it is fine; importing from it or depending on it is not.

## Read these first

- `docs/idea-workflow-plan.md` — **plan of record for the Scripts Pro workflow (2026-08, written under the old "Idea Bank" name)**: the stepped idea→production pipeline, lock/unlock model, Settings area, AI integrations, thumbnails. New work happens here.
- `docs/implementation-plan.md` — the original plan of record (historical; describes the removed megaprompt-based Scripts Pro): schema, routes, component inventory, build order, offline strategy, open questions, risks.
- `docs/breezyscript-web-migration-design.md` — the migration brief (authoritative architecture decisions — do not relitigate §2).
- `docs/stack-decision.md` — why each stack choice was made.
- `docs/audit/*.md` — phase-0 audit of the Tauri repo with file:line citations (design tokens, both tools' behavior, Tauri surface).

## Stack (decided)

Vite + React 19 + TS, plain SPA (`base: '/app/'`) · TanStack Router (`basepath: '/app'`) · Tailwind v4 + shadcn init `-b radix` · Convex (DB, functions, storage, crons, secrets) · Convex Auth Google (`openid email profile` only) · Cloudflare Pages (landing at `/`, app at `/app` behind Cloudflare Access).

## Hard rules

- Every Convex function starts with `requireOwner(ctx)` and asserts channel ownership on id-addressed docs.
- No secret ever ships to the browser; external API calls live in Convex actions.
- **LLM calls (Claude/OpenAI/Grok) happen only in Convex actions** through the common message format in `convex/llm/` — never from the browser, and keys live only in env vars (see `docs/idea-workflow-plan.md` §6–7).
- Design tokens come from the Tauri app's `@theme` block (see `docs/audit/design-system-audit.md` §2) — dark-only, 13px body, don't substitute stock Tailwind values. Font: self-hosted Inter (variable woff2), system stack fallback.
- shadcn components: add one at a time at first need, Radix variant only; hand-write simple styled primitives.
- `_redirects` must land at `dist/_redirects` with `/app/* /app/index.html 200` — never a bare `/*` rule.
- **Phone-first, phone-PRIMARY:** the owner uses this app mostly from a phone. Every screen must be usable at 390px wide — rows wrap (`flex-wrap`/`max-md:flex-col`), side-by-side splits stack, nothing clips or forces horizontal page scroll. Page padding is `px-4 … md:px-8`. **Touch handlers must work flawlessly:** tap targets ≥ 44×44px, no hover-only affordances, no drag-only interactions (every drag/drop needs a tap alternative), destructive controls never adjacent to high-frequency tap targets. Check new UI at 390px AND under touch before calling it done.
- **Scripts Pro workflow structure (the app's core flow — see `docs/idea-workflow-plan.md`):** an idea advances through ordered steps, each unlocked only when the previous is marked **Ready** (server-validated via `readySteps` on `bankIdeas`, with cascade invalidation when edits break a ready step's criteria): 1 Idea (title/description/rating) → 2 Potential Titles (3 titles + primary) → 3 Thumbnails (1–3 uploads) → 4 Leading Questions → 5 Research Collection → 6 Script Drafter → 7 Script Refinement → 8 Ready to Record → 9 Publish Metadata. Opening an idea shows the step-1 editor until step 1 is ready, then a mobile-first stacked-card overview of all steps (ready / unlocked / locked). Earlier steps stay editable forever — each step owns its data and downstream steps reference it; the ONE copy boundary is Script Drafter → Refinement (chosen draft is copied, original preserved; refinement keeps multiple drafts with one current; Ready to Record is read-only + teleprompter). No left rails anywhere in the app (Second Brain dropped its rail 2026-08-18); every view carries its own back link.
- **Compact list-page toolbar (decided 2026-08; use for new list screens):** skip the in-page page heading; content starts at a back link plus the toolbar. The toolbar is one row: search input + explicit-submit Search button (icon-only below `md`) + a filter-toggle icon button that shows/hides the filter selects on the row beneath (panel starts open when the URL carries an active filter; the toggle renders `primary` while any filter is active so hidden filters stay visible). The primary create action is a floating action button (round, fixed bottom-right, `md:hidden`) on phones and a labeled `primary` button at the right end of the toolbar on `md+` where the sidebar shows — never both at once; give the list a bottom spacer (`h-14 md:hidden`) so the FAB can't cover the last row. Reference implementations: `src/routes/c.$channelId.bank.index.tsx`, `src/routes/c.$channelId.brain.index.tsx`.
- **State-driven editor action bar (decided 2026-08; use for all editor views):** editors dock a sticky bottom bar (`sticky bottom-0`, `border-t`, page background) inside the scroll column. Its buttons reflect the document state, not a fixed layout — **dirty:** `[Delete] … [Cancel] [Save]` where Save saves-and-closes, Cmd/Ctrl+S saves-and-stays, and Cancel is guarded by the unsaved-changes blocker; **clean**: in workflow steps the exit is ALWAYS a single primary `[Ready]` (owner, 2026-08-18 — never "Done"): it marks the step ready when qualified, simply closes when the step is already ready, and renders disabled with the missing-criteria hint when not yet qualified (the header back link remains the exit there). Never render a disabled Save, and never label the exit "Cancel" when there is nothing to cancel. Delete sits left, separated from the exit/save group, and always goes through the confirm dialog. Reference implementation: `src/features/bank/BankIdeaEditor.tsx`.
- **No em dashes or en dashes in generated content — no exceptions (owner, 2026-08-18):** applies to every LLM-generated artifact (title ideas, questions, descriptions, scripts) and to app-authored content shown as such (required questions, seed templates/examples). Every generation prompt must include `NO_DASH_RULE` and every parsed model output must pass through `stripDashes` (both in `convex/llm/types.ts`). Use commas, periods, colons, or hyphens instead.
- **Keep README setup docs accurate:** whenever a change adds, renames, or removes a setup requirement — env vars (Convex or Vite), API keys, seed commands, services, or one-time owner steps — update `README.md` (the "AI provider keys" and "One-time owner setup" sections and `.env.example`) in the same change. The README must always be a complete, current description of what a fresh setup needs; stale setup docs are a bug.
- **Every delete operation must go through a confirmation dialog** (`ConfirmDialog` or the `useConfirm` hook) before the mutation fires — no one-click destructive actions. This covers entity deletes (channels, notes, ideas, drafts, thumbnails, personas, structures, shapes, templates) and in-editor removals that discard user-written content (e.g. a pasted persona sample). Removals that only discard a copy may skip the dialog but must say the source is untouched.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
