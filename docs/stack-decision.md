# BreezyScripts Web App — Stack Decision

**Date:** 2026-08-14 (rev. 5 — public surface split + §8 security posture)
**Context:** Single-user (Tundra only) tool for: YouTube video idea storage, script creation workflow, ElevenLabs voice rendering, and — later — a private "broadcast engine" layer over YouTube Studio. Explicitly no comments surface.

**Status:** YouTube integration is **deferred**. Build the ideas → scripts → audio core first. §5 is retained as research so nothing has to be re-derived later, but nothing in it is on the near-term build path except the one-time action below.

**Companion doc:** `claude/web-migration-brief.md` — the migration brief for porting the `Scripts Pro` and `Second Brain` micro tools out of the existing **BreezyScript Tauri app**. That doc is what goes to Claude Code alongside the repo. This doc is the canonical record of *why* each choice was made.

> **⚡ Only YouTube item worth doing early:** create the Reporting API job for `channel_reach_basic_a1`. Backfill reaches only 30 days back from job creation and reports expire after 60 days, so impressions/CTR history accrues only from the day the job exists. ~20 lines, standalone, no app code. Optional but cheap. See §5.3.

---

## 1. Recommended stack

**Frontend**

- **Vite + React 19 + TypeScript** — plain SPA, no meta-framework
- **TanStack Router** (file-based, fully type-safe params/search)
- **Tailwind v4 + shadcn/ui** — copy-in components, no runtime UI dependency. Init with **`npx shadcn init -b radix`** (see §1.2)
- **Deploy:** **Cloudflare Pages** — public landing page at `/`, app at `/app` behind Cloudflare Access (see §1.3 and §8)

**Backend: Convex**

**Total moving parts: two.** A static site and Convex. No API layer, no server framework, no Docker, no separate cron service, no separate object store.

### Why no Next.js / Remix / TanStack Start

Meta-frameworks buy SSR, SEO, streaming, and edge rendering. This app is private, single-user, behind a login, and has zero public pages *inside the app*. None of that applies. What they cost is real: a server to host, a server/client boundary to reason about constantly, and a build model that fights you. A pure SPA loads once and behaves like a desktop app — exactly the feel wanted for a daily driver.

(The public landing page at `/` is static HTML, not part of the SPA — see §1.3. It doesn't change this reasoning.)

The one thing a SPA can't do is hold secrets. That's what the backend is for.

### 1.1 Devtools: take the Vite plugin, skip the panel

Hot reloading is **100% Vite** (React Fast Refresh). TanStack Devtools has nothing to do with it.

- **`@tanstack/devtools-vite`** — keep. It pipes browser `console.log`/errors into the terminal, the single most useful thing for LLM-driven development: Claude Code reads a text stream instead of needing to see a browser.
- **`<TanStackDevtools>` React panel** — skip. It's a visual panel an agent can't read, and its default open-hotkey is a bare `Shift`+letter that fires while typing capital letters into textareas (known issue, TanStack/devtools discussion #199). This app's primary daily activity is typing long personal stories into textareas, so that's a real hazard.

If ever needed for a specific session, gate it so it can't fire ambiently:

```tsx
<TanStackDevtools config={{ requireUrlFlag: true, urlFlag: 'devtools', openHotkey: [] }} />
```

**Principle: text streams beat visual panels.** Optimize the dev setup for things that print to stdout.

### 1.2 Why shadcn — and why the Radix variant

**shadcn is not a dependency.** The CLI copies source into the repo; we own, edit, and delete those files. "shadcn vs. our own components" is a false dichotomy — shadcn components *become* our components. There is no package lock-in and nothing upgrades against our will.

**What we're actually adopting is the headless behavior layer (Radix)**, not the styling. The Tailwind classes shadcn ships get replaced by tokens extracted from the Tauri app. Radix supplies the parts that are genuinely hard: focus trapping and restoration, escape/outside-click dismissal that ignores scrollbar clicks, full ARIA wiring, keyboard nav with typeahead, popover collision detection, scroll locking without layout shift, portal and z-index management.

**Where the line sits** — does the component manage focus, keyboard navigation, or floating position?

| Hand-write against our tokens | Take from shadcn |
|---|---|
| Button, Card, Badge, Input, Textarea, Label, Separator, Skeleton, layout primitives | Dialog, DropdownMenu, Select, Combobox, Command, Popover, Tooltip, Toast, Tabs, ScrollArea, ContextMenu |

The left column is 15–30 lines of Tailwind each; shadcn's versions carry `cva` machinery we don't need, and deleting its opinions takes longer than writing ours. The right column is days of work each to get right, with subtle failure modes.

**Add components one at a time, at first need. Never bulk-add.**

**⚠️ Use `-b radix`.** As of July 2026 `shadcn init` defaults to **Base UI**. Radix is not deprecated and receives every update. We choose Radix deliberately: this project is built through LLM-driven development, and Radix has years more training data behind it — Claude Code writes correct Radix from memory and is measurably shakier on Base UI's newer surface. That daily friction outweighs being on the newer default. shadcn ships a migration path if that changes.

### 1.3 Public surface & deployment layout

One Cloudflare Pages project, one deploy, two surfaces:

| Path | What | Access |
|---|---|---|
| `breezyscript.com/` | Public landing page — plain HTML + Tailwind, **no framework, no login form** | Public |
| `breezyscript.com/app/*` | The React SPA | **Cloudflare Access**, Google IdP, allow-list = owner email |

**Required config — all three, or deep links break:**

1. **Vite** — `base: '/app/'`
2. **TanStack Router** — `basepath: '/app'` (write routes router-relative; the basepath is prepended)
3. **`_redirects`**, scoped to the app only:

```
/app/* /app/index.html 200
```

**⚠️ Do not use a bare `/* /index.html 200`** — it swallows the landing page.

**⚠️ `_redirects` must land at `dist/_redirects`, not `dist/app/_redirects`.** If the app builds into `dist/app/`, Vite's `publicDir` copies it to the wrong place. Handle explicitly in the build script and verify the output location.

**Verify before deploy is done:** hard-refresh `/app/c/<id>/bank` on a preview, and confirm `/` still serves the landing page.

The landing page consumes the **same design tokens** as the app so both read as one product. It's a brochure — don't build it in React.

*A subdomain split (`app.breezyscript.com`) would avoid the base-path and `_redirects` config entirely. Path variant chosen for single-deploy simplicity; revisit only if the config proves troublesome.*

---

## 2. Backend comparison

| | **Convex** | **Supabase** | **Firebase / Firestore** |
|---|---|---|---|
| Data model fit (ideas, scripts, versions) | Document DB, schema-in-TypeScript — good | Postgres — best if you want real SQL over script history | Document DB, weakest querying |
| API layer to write | **None.** Query/mutation functions *are* the API, end-to-end typed | Some. PostgREST + hand-written Edge Functions | None, but Security Rules become the logic layer |
| Server-side secrets (ElevenLabs key, later YT refresh token) | Actions + env vars, built in | Edge Functions + Vault | Cloud Functions — **requires Blaze plan** |
| Long jobs (ElevenLabs render) | **10 min (Node) / 30 min (Convex runtime)** | 150 s wall clock free, 400 s paid, **2 s CPU** | 9 min (60 min gen-2), plus cold starts |
| Scheduled jobs | **Built-in crons, first-class** | pg_cron + pg_net, or Queues | Cloud Scheduler — separate GCP wiring |
| File storage (MP3s, thumbnails) | Built in, 1 GB free | 1 GB free, S3-compatible, cheapest at scale | **Requires Blaze since Oct 2024** |
| Single-user auth ceremony | Minimal | RLS policies on every table — pure overhead for one user | Security Rules — same overhead |
| Local dev / DX | Best in class (live-reloading backend) | Very good | Mediocre (heavy emulator suite) |
| Realtime | Default, every query reactive | Good, opt-in per channel | Good |
| Lock-in | Highest | **Lowest — it's just Postgres** | High |

### Verdict: **Convex** ✅ (confirmed)

1. **Long-running actions.** ElevenLabs renders of a full 15-minute script are exactly the shape Supabase Edge Functions are worst at. The 150 s free-tier wall clock is a real ceiling you'd engineer around with a queue + worker. Convex actions just run for 10 minutes.
2. **Crons are first-class**, which matters the moment any scheduled work appears.
3. **No API layer at all.** For a solo project the biggest tax is boilerplate maintained forever.

**Pick Supabase instead if** you want to own your data in Postgres with zero lock-in, expect real SQL over script/metric history, or audio storage grows into tens of GB.

**Firestore: don't.** Last on every dimension here, and since Oct 2024 needs a billing card for Storage and Functions anyway — so it isn't even the free option.

---

## 3. ElevenLabs integration

- **Never call from the browser** — the API key would be exposed in network requests. Call from a Convex action, stream the MP3 into Convex file storage, store the `storageId` on the script section.
- **Chunk by section, not whole script.** Regenerate one paragraph after an edit instead of re-billing the whole video; keeps every call well inside timeouts.
- **Use `previous_request_ids`** when chunking so prosody and pacing carry across boundaries — without it, chunk seams are audible.
- Store `voiceId` + model + settings per render so a re-render is reproducible.

---

## 4. Authentication — **DECIDED: Google OAuth**

**Google OAuth for sign-in**, via **Convex Auth** with the Google provider. Structured so YouTube authorization can be added later without rework.

### Why Google over emailed magic links

1. **Delivery risk is lockout risk.** Login would depend on email delivery working every time. A link in spam or delayed four minutes means no access to your own tool. Google OAuth has no such failure mode.
2. **Friction compounds.** You'll open this daily. Google is one click — you're already signed into Chrome. Magic link is switch → wait → click → hope it hasn't expired.
3. **Google OAuth is coming anyway** when YouTube lands. A second identity path would be duplicated work.

### ⭐ Same provider, separate grants

The structural decision that keeps the YouTube door open. **Do not merge login with the YouTube API grant.**

| | Scopes | Lifetime | When |
|---|---|---|---|
| **Sign-in** | `openid email profile` | Short-lived session | Now |
| **"Connect YouTube"** (separate button, separate flow) | `youtube` or `youtube.force-ssl`, `yt-analytics.readonly`, `access_type=offline` | Long-lived refresh token, server-side | Later |

- Sensitive YouTube scopes would otherwise trigger re-consent on every login
- The YouTube grant needs `access_type=offline` and a persisted refresh token; the login session doesn't
- If the YouTube grant breaks or is revoked, you can still log in and repair it instead of being locked out
- Google's **incremental authorization** is designed for exactly this pattern

### Authorization model

No users table, no roles, no invites. One allow-list check, server-side, in **every** Convex function:

```ts
const identity = await ctx.auth.getUserIdentity()
if (identity?.email !== process.env.OWNER_EMAIL) throw new Error("nope")
```

Wrap it as `requireOwner(ctx)` and call it first in every query, mutation, and action.

### Implementation note

**Convex Auth** is officially **beta / early preview** and may change in backward-incompatible ways. Acceptable here: personal single-user tool, React-only client library matches this stack exactly, keeps the "two moving parts" property. **Clerk** is the contained fallback if beta status becomes annoying.

---

## 5. YouTube integration research (DEFERRED — retained so it isn't re-derived)

### 5.1 The upload audit wall

Videos uploaded via `videos.insert` from **unverified API projects created after 28 July 2020 are permanently locked to private.** You can upload and set every field, but cannot make it public until the project passes Google's compliance audit.

**⭐ The fix — invert the flow.** Drag the file into Studio (one drag), then have the app run `videos.update` + `thumbnails.set` + `playlistItems.insert` against the video ID. **`videos.update` is not restricted by the audit rule.** Since it includes `publishAt`, the app can also set scheduled go-live. Result: fully configured and scheduled with **zero further clicks in Studio**, and the audit restriction never applies because nothing was uploaded via the API.

### 5.2 Quota

- General bucket: **10,000 units/day**, resets midnight Pacific
- `videos.insert`: separate bucket, **100/day** · `search.list`: separate bucket, **100/day**
- Reads (`videos.list`, `channels.list`): **1 unit** · Writes (`videos.update`, `thumbnails.set`, `playlistItems.insert`): **50 units** each

A full metadata pass is ~150 units. Quota is a non-issue as long as the dashboard reads a local snapshot table, not YouTube.

### 5.3 Impressions & CTR — two different APIs

**YouTube Analytics API** (`reports.query`) — real-time, on demand: `views`, `estimatedMinutesWatched`, `averageViewDuration`, `averageViewPercentage`, `subscribersGained`/`Lost`, retention curves, traffic sources, geography, demographics. **Does not expose impressions or CTR.**

**YouTube Reporting API** — bulk daily CSVs. **This is where impressions and CTR live:**

- Report type **`channel_reach_basic_a1`** (or `channel_reach_combined_a1` for breakdowns)
- `video_thumbnail_impressions` — thumbnail shown >1 s with ≥50% visible
- `video_thumbnail_impressions_ctr` — clicks ÷ impressions
- Scope `yt-analytics.readonly`

| | |
|---|---|
| Job required | YouTube generates nothing until you **create a reporting job** |
| Backfill | Only **30 days back** from job creation |
| Latency | **48-hour delay** |
| Retention | Available **30–60 days**, then deleted |
| Format | CSV via HTTP GET on a `downloadUrl` |
| Revisions | YouTube may reissue a corrected report with a new ID — re-download and overwrite |

**Why archiving matters:** YouTube deletes it after 60 days. Studio won't show thumbnail CTR for a video from eight months ago. Archiving the daily CSV yields **unlimited CTR history that exists nowhere else** — year-over-year CTR by title shape, feeding `title-shape-miner` and `performance-feedback-analyzer`.

### 5.4 The "no comments" part is free

No filtering to build. Never request comment scopes, never call `commentThreads.list`. The broadcast engine is defined by what you *don't* build.

---

## 6. Data model

```
audienceProfile      one doc — from audience-profile-builder
framework            one doc — from channel-framework-definer
personas             voice profiles — from persona-voice-capture
titleTemplates       mined shapes — from title-shape-miner
hookStructures       from hook-structure-definer
videoStructures      from video-structure-definer
stories              tagged library — from story-library-curator
ctas / disclosures   from cta-disclosure-normalizer

ideas                raw capture: text, source, status, createdAt
concepts             ideaId, workingTitle, angle, titleVariants[], thumbnailConcepts[]
scripts              conceptId, status
scriptVersions       scriptId, n, sections[], wordCount, createdAt
audioRenders         scriptVersionId, sectionId, storageId, voiceId, settings, status

--- deferred, YouTube phase ---
publishPresets       category, tags[], language, license, madeForKids,
                     playlistIds[], defaultDescriptionTail, commentsDisabled
videos               scriptId, youtubeVideoId, publishedAt, presetUsed, titleTemplateId
reportingJobs        reportTypeId, jobId, lastFetchedReportId, createdAt
metricSnapshots      videoId, date, views, avd, avp, minutesWatched, subsGained,
                     retentionCurve, thumbnailImpressions, thumbnailCtr
```

Keep `titleTemplateId` on `videos` — that join eventually turns archived CTR into "which title shapes actually earn clicks."

**Note:** this model predates the Tauri migration decision. The repo audit in `web-migration-brief.md` §5 may reshape `ideas` / `concepts` / `scripts` to match what `Second Brain` and `Scripts Pro` actually do. **Treat the repo as source of truth where they conflict.**

---

## 7. Build order

1. Vite (`base: '/app/'`) + React + Convex skeleton; landing page stub at `/`; Access policy on `/app*`; deep-link refresh verified on a preview
2. **Google OAuth sign-in** (Convex Auth, `openid email profile` only) + `requireOwner` helper
3. **Second Brain**, end to end — simpler tool, immediately useful, proves the architecture
4. **Scripts Pro**, including the Second Brain → Scripts Pro hand-off
5. ElevenLabs render pipeline, chunked by section
6. Resend notifications for long-running jobs

**Deferred:** "Connect YouTube" incremental-auth flow → publish panel → analytics cron + dashboard.

Steps 3–4 are governed by `claude/web-migration-brief.md` — run the repo audit first.

---

## 8. Security posture

### Three layers

| Layer | Stops | Effort |
|---|---|---|
| **1. Cloudflare Access** on `/app*` — Google IdP, allow-list = owner email | Strangers loading app assets at all | ~10 min, free ≤50 users |
| **2. `requireOwner(ctx)`** in every Convex function | Anyone who has the Convex deployment URL | Already planned; **non-negotiable** |
| **3. `@convex-dev/rate-limiter`** — per-user/per-IP, token bucket or fixed window, transactional | Function-call consumption against the 1M/mo free tier | Only if abuse actually appears |

Layers 1 and 2 are independent and both required. **Access does not protect Convex** — the browser calls Convex directly, on Convex's own origin, so an edge policy in front of the static site is invisible to it. Conversely `requireOwner` doesn't stop strangers from loading the app shell. Each covers the other's gap.

Layer 3 is an escalation, not a default. Don't build it preemptively.

### ❌ Rejected: decoy login page

A splash page with a fake login that always returns "unauthorized" was considered and rejected:

- **With Google OAuth there is no password to brute-force.** No credential to guess, no attempt counter. The threat model it defends against was already eliminated by choosing OAuth.
- **It hides nothing.** The app bundle contains `VITE_CONVEX_URL` in plaintext. Anyone who loads `/app` — the first path anyone would guess, and present in browser history, analytics, and any shared link — has the deployment URL regardless.
- **It costs real complexity:** two login UIs that must look alike but behave differently, and a permanent maintenance trap.
- **It would mislead the owner** — landing on the decoy from a stale bookmark and getting "unauthorized" reads as a broken app.

Security through obscurity where the obscured thing is one guess away. The landing page at `/` is honest — it describes the product and has **no login form at all**.

### Known cost: two sign-ins

Cloudflare Access asks for Google, then Convex Auth asks for Google. This is unavoidable — Convex is a separate origin and Access can't vouch for it. In practice both are one-click when already signed into Google, and both sessions persist (Access session duration is configurable), so it's rare rather than per-visit. Accepted.