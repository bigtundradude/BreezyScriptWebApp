# BreezyScript Web

Web rebuild of the BreezyScript desktop tools: **Second Brain**, **Scripts Pro** (the stepped idea→production workflow, formerly "Idea Bank"; the original megaprompt-based Scripts Pro was removed 2026-08-18), and **Affiliate Links**. Plans of record: `docs/idea-workflow-plan.md` (workflow rebuild), `docs/affiliate-links-plan.md`, and `docs/implementation-plan.md` (original build, historical).

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

- Settings (channel manager page) shows a **Developer** section in local dev builds with
  **Seed demo data** and **Wipe all data** (full reset to the new-user state, including
  everything you added by hand). Both need `ALLOW_DEV_DATA=1` set on the dev deployment
  (`npx convex env set ALLOW_DEV_DATA 1`) — never set it on prod. Seed content lives in
  `convex/seedIdeaBank.ts`: checked into git, deployed server-side, never in the browser
  bundle.
- CLI equivalent: `npx convex run seedIdeaBank:run` — the "Creator Compass" channel with
  ideas at every workflow state plus title shapes/templates. Re-runnable — it wipes and
  re-seeds only its own channel.

`pnpm build` → typecheck + production bundle + assembles `dist/`:

```
dist/index.html    ← public landing page
dist/app/          ← the SPA
dist/_redirects    ← /app/* /app/index.html 200   (scoped — never a bare /*)
dist/_headers      ← explicit MIME types for /app assets so Cloudflare can never
                     serve a module script as application/octet-stream
```

## AI provider keys (Scripts Pro workflow)

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
   - `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` — AI providers for the Scripts Pro
     workflow (at least one; see "AI provider keys" above)

   Set each var on the **prod** deployment either in the dashboard (Settings →
   Environment Variables, with Production selected) or from the CLI:

   ```sh
   npx convex env set --prod OWNER_EMAIL you@example.com
   npx convex env set --prod AUTH_GOOGLE_ID ...
   npx convex env set --prod AUTH_GOOGLE_SECRET ...
   npx convex env set --prod SITE_URL https://breezyscript.com/app
   npx convex env set --prod ANTHROPIC_API_KEY sk-ant-...
   ```

   Do NOT set `ALLOW_DEV_DATA` on prod — it is the dev-only switch for the seed/wipe
   tools (see "Dev seed data" above).
3. **Google OAuth client** (console.cloud.google.com → Credentials → OAuth client, Web application):
   - Authorized redirect URI: `https://<your-convex-deployment>.convex.site/api/auth/callback/google`
   - Scopes: only `openid email profile`. Do NOT add YouTube scopes here — that is a separate,
     later grant (stack decision §4).
4. **Cloudflare Pages**: project with build command `pnpm build`, output directory `dist`.
   Set `VITE_CONVEX_URL` as a build env var (production deployment URL from step 1, e.g.
   `https://reliable-lion-127.convex.cloud`).

   **Why this one lives in Cloudflare, not Convex:** `VITE_*` vars are BUILD-TIME values —
   Vite stamps them into the JavaScript bundle when Cloudflare compiles the frontend. The
   browser needs the Convex URL before it can connect to anything, so it can't come from
   Convex. Everything server-side (API keys, `SITE_URL`, `OWNER_EMAIL`, Google secrets)
   stays in Convex env vars and never reaches the browser.

   **Changing it requires a rebuild:** saving the variable does nothing by itself — the old
   bundle stays live with the old URL baked in. After editing, go to Deployments → ⋯ on the
   latest production deployment → **Retry deployment** (or push any commit).
5. **Cloudflare Access**: policy on `breezyscript.com/app*` — Google IdP, allow-list = owner email.
   The landing page at `/` stays public.
6. **Verify before calling deploy done** (migration brief §2.2): hard-refresh a deep link like
   `/app/c/<id>/bank` on a deployed preview, and confirm `/` still serves the landing page.

## Repo layout

- `src/routes/` — TanStack Router file routes (`basepath: '/app'`)
- `src/components/ui/` — hand-written primitives + Radix-based overlays, styled with tokens
- `src/styles/globals.css` — design tokens ported from the desktop app (see `docs/audit/design-system-audit.md`)
- `convex/` — schema + functions; every function starts with `requireOwner(ctx)`
- `landing/` — static public landing page, copied to `dist/` at build
- `docs/` — migration brief, stack decision, implementation plan, phase-0 audits
