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

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
