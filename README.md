# BreezyScript Web

Web rebuild of the BreezyScript desktop tools (Second Brain + Scripts Pro), now centered on the **Idea Bank** stepped idea→production workflow. Plans of record: `docs/idea-workflow-plan.md` (workflow rebuild) and `docs/implementation-plan.md` (original build).

## Stack

Vite + React 19 + TypeScript SPA (`/app` base) · TanStack Router · Tailwind v4 · Convex (DB/functions/auth) · Cloudflare Pages + Access.

## Development

```sh
pnpm install
pnpm convex        # terminal 1 — Convex dev backend
pnpm dev           # terminal 2 — app at http://localhost:5199/app/
```

The dev port is **fixed at 5199** (`strictPort` — it fails rather than shifting, because the
OAuth `SITE_URL` points at it). `pnpm preview` uses 5198.

Dev seed data:

- `npx convex run seed:run` — original demo channel (sample notes + Scripts Pro ideas)
- `npx convex run seedIdeaBank:run` — Idea Bank workflow fixture: the "Creator Compass"
  channel with ideas at every workflow state plus title shapes/templates. Re-runnable —
  it wipes and re-seeds only its own channel.

`pnpm build` → typecheck + production bundle + assembles `dist/`:

```
dist/index.html    ← public landing page
dist/app/          ← the SPA
dist/_redirects    ← /app/* /app/index.html 200   (scoped — never a bare /*)
```

## AI provider keys (Idea Bank workflow)

The workflow's AI features (title generation now; leading questions, descriptions, and
script drafting later) call LLM providers from Convex **actions** only. Keys live in
**Convex deployment env vars** — never in tables, never in the browser, never `VITE_*`,
and not read from `.env` files (see `.env.example`).

Set at least one key on the deployment you're using (dev or prod):

```sh
npx convex env set ANTHROPIC_API_KEY sk-ant-...   # Claude
npx convex env set OPENAI_API_KEY sk-...          # OpenAI
npx convex env set XAI_API_KEY xai-...            # Grok
```

Then, in the app: channel home → **Settings → AI integrations**

1. The provider card shows **key detected** once the env var is set.
2. Enter a **simple-tasks model** (titles, questions, descriptions) and a
   **script-writing model** for that provider, and save.
3. Pick the **active provider** for each task class at the top of the section.
4. Hit **Test connection** — it runs one tiny round-trip and reports success or the
   exact configuration problem.

Without a key, every AI feature degrades to a friendly message pointing here; nothing
else in the app depends on the keys. Note: `npx convex env set` targets the deployment
in `.env.local` — when prod exists, set the vars there too (`--prod` or the dashboard:
Settings → Environment Variables).

## One-time owner setup (interactive — run these yourself)

1. **Convex cloud project** (currently using an anonymous local deployment):
   run `! npx convex login` then `! npx convex dev` and follow the prompts to create the
   `breezyscript-web` project. This rewrites `.env.local` with the real `VITE_CONVEX_URL`.
2. **Convex env vars** (Convex dashboard → Settings → Environment Variables):
   - `OWNER_EMAIL` — the Google account allowed in (checked by `requireOwner` in every function)
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from step 3
   - `SITE_URL` — the deployed app origin (e.g. `https://breezyscript.com/app`), used for OAuth redirects
   - `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` — AI providers for the Idea Bank
     workflow (at least one; see "AI provider keys" above)
3. **Google OAuth client** (console.cloud.google.com → Credentials → OAuth client, Web application):
   - Authorized redirect URI: `https://<your-convex-deployment>.convex.site/api/auth/callback/google`
   - Scopes: only `openid email profile`. Do NOT add YouTube scopes here — that is a separate,
     later grant (stack decision §4).
4. **Cloudflare Pages**: project with build command `pnpm build`, output directory `dist`.
   Set `VITE_CONVEX_URL` as a build env var (production deployment URL from step 1).
5. **Cloudflare Access**: policy on `breezyscript.com/app*` — Google IdP, allow-list = owner email.
   The landing page at `/` stays public.
6. **Verify before calling deploy done** (migration brief §2.2): hard-refresh a deep link like
   `/app/c/<id>/scripts` on a deployed preview, and confirm `/` still serves the landing page.

## Repo layout

- `src/routes/` — TanStack Router file routes (`basepath: '/app'`)
- `src/components/ui/` — hand-written primitives + Radix-based overlays, styled with tokens
- `src/styles/globals.css` — design tokens ported from the desktop app (see `docs/audit/design-system-audit.md`)
- `convex/` — schema + functions; every function starts with `requireOwner(ctx)`
- `landing/` — static public landing page, copied to `dist/` at build
- `docs/` — migration brief, stack decision, implementation plan, phase-0 audits
