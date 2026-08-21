# Native sync log

Running log of app changes, written so Claude can port each one to the native
version of BreezyScript and keep the two apps in sync. Started 2026-08-21
(owner instruction). Every behavior-affecting change to the web app MUST append
an entry here in the same commit (CLAUDE.md hard rule).

**Entry format:** date, short title, then three parts:
- **Behavior** — what the user-visible behavior is now, platform-agnostic. This
  is the part the native app must match.
- **Web implementation** — where it lives in this repo, for reference.
- **Porting notes** — anything platform-specific to watch for.

Entries are append-only, newest at the top. A porting session should work from
the top down to the last entry it has already applied.

---

## Baseline — 2026-08-21, commit `b052e29`

The native app should be brought level with the web app as of this commit
before applying entries above it. The authoritative behavior references for the
baseline are `CLAUDE.md` (patterns and hard rules), `docs/idea-workflow-plan.md`
(Scripts Pro stepped workflow), and `docs/affiliate-links-plan.md`. Summary of
the app at baseline: three channel-scoped tools (Scripts Pro stepped
idea→production workflow at the bank routes, Second Brain notes, Affiliate
Links) plus a Settings area (personas with LLM voice extraction, audience with
AI walkthrough, title shapes, video structures, snippets, affiliate tags, word
replacement, reading pace, app-wide AI integrations and channel manager, and a
dev-only seed/wipe section). Google sign-in via Convex Auth with a single
OWNER_EMAIL gate. Mobile-first throughout: compact list toolbars with debounced
live search (250ms, clear resets, no Search buttons), state-driven editor
action bars, FABs on phones, confirmed deletes, 44px tap targets.

---

## 2026-08-21 — Teleprompter defaults and query-param settings

- **Behavior:** teleprompter defaults are now font 38px, side padding 12%,
  scroll speed 25 (fresh installs and anyone who never re-tuned get these; the
  stored-prefs key was versioned so the new defaults apply once over old saved
  values). Font, side padding, and speed are mirrored into the URL as
  ?tpFont=&tpPad=&tpSpeed= (debounced) in addition to local storage; on open,
  query values override stored prefs, so a tuned setup survives reloads and
  can be reused via link. Weight, opacity, mirror, and rail state stay in
  local storage only.
- **Web implementation:** `src/features/bank/Teleprompter.tsx` (PREFS_KEY
  bs.teleprompter.v2, DEFAULT_PREFS, query sync effects).
- **Porting notes:** the native equivalent of query params is a shareable/
  restorable settings payload; the precedence is explicit setting > stored
  prefs > defaults.

## 2026-08-21 — Ready always advances to the next workflow step

- **Behavior:** in every Scripts Pro workflow step the Ready button is always
  visible in the action bar, enabled whenever the step's criteria pass
  (validated against live unsaved state). Clicking it saves any unsaved edits,
  marks the step ready if not already, and navigates to the NEXT step; the
  last step (Publish Metadata) returns to the idea overview. While dirty,
  Cancel and Save appear beside Ready (Save still saves-and-closes,
  Cmd/Ctrl+S saves-and-stays). Step 1 in a NEW idea: Ready creates the idea,
  marks step 1 ready, and lands in Potential Titles. Script Drafter's Send to
  Refinement now advances into Script Refinement instead of the overview.
- **Web implementation:** `src/features/bank/WorkflowActionBar.tsx`,
  `nextStepRoute` in `src/features/bank/steps.ts`, `ready()` handlers in every
  step component under `src/features/bank/`.
- **Porting notes:** the save-then-mark-then-advance sequence must stop on a
  failed save; validation for Ready runs on local form state so it works while
  dirty.

## 2026-08-21 — Resilient JSON parsing for title and question generation

- **Behavior:** when the model reply wraps the JSON array in prose or gets cut
  off mid-array at the token limit, generation now salvages every complete row
  instead of failing with "no usable JSON". Token budgets raised (titles
  16000, questions 8000). On total parse failure the raw reply head is logged
  server-side so failures are diagnosable.
- **Web implementation:** shared `convex/llm/json.ts` `extractJsonArray`, used
  by `convex/bankTitles.ts` and `convex/bankQuestions.ts`.
- **Porting notes:** whatever LLM plumbing the native app uses needs the same
  three-step parse: strict array slice, truncation salvage to the last
  complete object, then log-and-fail.

## 2026-08-21 — One page-level Save on AI integrations settings

- **Behavior:** the AI integrations page no longer has per-provider save
  buttons. Changing any provider's model picks shows one docked bar at the
  bottom of the page with a primary Save button and a Cancel button that
  reverts unsaved picks. Save writes all touched providers at once; the bar
  only exists while something is unsaved. Active-provider selection still
  applies immediately on change. Test connection and Load/Refresh models remain
  per provider.
- **Web implementation:** `src/features/settings/AiIntegrationsSettings.tsx`.
- **Porting notes:** follow the platform's equivalent of the app's editor
  action bar pattern; never show a disabled Save.

## 2026-08-21 — AI setup notice on the channel home

- **Behavior:** when the AI configuration is incomplete (either task class,
  simple or scripts, lacks an active provider, a chosen model, or a detected
  API key), the channel home shows a warning banner above the tool cards:
  title "AI is not set up yet", body explaining generation features need a
  provider, whole banner tappable and opening the AI integrations settings.
  Hidden while settings are loading; disappears reactively once setup is
  complete.
- **Web implementation:** `src/routes/c.$channelId.index.tsx` reading
  `aiSettings.getAll` (config + key presence booleans, never key values).
- **Porting notes:** the readiness check must match when generation actually
  fails, not just "any key exists".

## 2026-08-21 — Sign-in flow polish (from production debugging)

- **Behavior:** (1) while an OAuth authorization code is being exchanged after
  returning from Google, the app shows a "Signing you in…" spinner instead of
  the sign-in card, so users never see a second sign-in prompt mid-exchange.
  (2) Sign-in failures show their error message under the button instead of a
  silent spinner reset. (3) The viewport prevents focus auto-zoom on iOS
  (maximum-scale=1) so sub-16px inputs don't leave the page zoomed and
  clipping content.
- **Web implementation:** `src/components/auth/SignIn.tsx`, `index.html`,
  `src/routes/__root.tsx` (AuthLoading/Unauthenticated/Authenticated gate).
- **Porting notes:** native OAuth flows differ; the principles to keep are
  "never show a sign-in prompt while a sign-in is completing" and "surface
  auth errors as text".
