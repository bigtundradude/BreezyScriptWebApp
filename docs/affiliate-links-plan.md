# Affiliate Links — plan of record

Owner request 2026-08-18. A channel-scoped micro tool: a searchable list of affiliate
links with one-tap copy actions, plus a tag library in Settings. No LLM involvement
anywhere in this tool.

## Why it is shaped this way

The same product often needs different tracking URLs depending on where the link is
posted (Amazon tracker for a video description vs the website vs a course page). So the
unit is a **link** (one product, entered once: title + short title) holding **multiple
URLs, each labeled with exactly one tag** that says where that URL belongs.

## Data model (all new tables; both carry `channelId` + `by_channel` index)

- `affiliateTags`: `channelId`, `name`, `sortOrder`, `updatedAt`.
  - Seeded per channel on first use with the defaults **Video Description**, **Website**,
    **Course**. Fully editable afterward (rename, reorder, add, delete).
  - Deleting a tag that any URL still references is blocked with a count message
    ("Used by 4 links"), so links can never point at a missing tag.
- `affiliateLinks`: `channelId`, `title`, `shortTitle`,
  `urls: [{ url, tagId }]`, `updatedAt`.
  - Each URL row has exactly one tag; the same tag may appear on more than one row
    (no hard uniqueness, the editor just preselects the first unused tag).

Convex module `convex/affiliateLinks.ts` (queries/mutations for links + tags in one
file). Every function starts with `requireOwner(ctx)` and asserts channel ownership on
id-addressed docs. `channels.remove` adds both tables to its cascade loop.

## Routes and UI

- **Channel home card**: "Affiliate Links", slug `links`, Link2 icon, reusing the now
  free `--color-tool-bank` accent. Card text is a simple clean description (no em
  dashes, no colons): "Your affiliate links, tagged by where they go, one tap to copy."
- **`/c/$channelId/links`** — list page using the compact list-page toolbar pattern
  (back link "Channel home", explicit-submit search matching against **title and short
  title** only, filter toggle revealing a **tag** select that shows links having at
  least one URL with that tag, New link as toolbar button on md+ and FAB on phones,
  `h-14 md:hidden` bottom spacer).
- **Link card** (in the list, no separate detail page needed to copy):
  - Row 1: title (medium) + short title (muted).
  - Then one row per URL: tag badge, truncated URL, and two copy actions, each a
    ≥44 px tap target with the standard copied-checkmark feedback (`CopyButton`):
    1. **Copy link** — puts just the URL on the clipboard.
    2. **Copy with title** — puts `{shortTitle} ⟶ {url}` on the clipboard: the short
       title, then the long rightwards arrow U+27F6 with exactly one space on each
       side of it, then the URL.
  - Tapping the card body opens the editor.
- **Editor** (state-driven action bar pattern, like the persona editor): fields for
  title and short title, then URL rows (url input + tag select + remove) and an
  "Add URL" button. Delete goes through the confirm dialog; removing a URL row with
  content also confirms. Dirty → `[Delete] … [Cancel] [Save]`, Cmd/Ctrl+S
  saves-and-stays, clean → `[Close]`.
- **Settings → new "Affiliate tags" section** (Templates group): list of tags with
  rename inline, add field, drag-free reorder (up/down buttons, tap-friendly), delete
  behind the confirm dialog and blocked while referenced.

## Behavior details

- Search is explicit-submit into the URL (`?q=`), matching the decided pattern, and
  matches title + short title (not URLs); tag filter as `?tag=`. Filtering runs
  client-side over the channel's list (volumes are single-user small), mirroring the
  ideas list.
- Copy uses `navigator.clipboard.writeText` via the existing `CopyButton`.
- Phone-first: URL rows wrap, copy buttons never sit adjacent to the delete control.
- Seeding: the three default tags are inserted by the list query path on first read of
  an empty tag table (idempotent), so no owner setup step is added to the README.

## Open items (defaults chosen, say the word to change)

1. Copy-with-title separator is `⟶` (U+27F6, the long rightwards arrow) with one
   space on both sides (owner, 2026-08-18). If a target platform mangles that
   character, a hyphen fallback is a one-line change.
2. No per-URL note field in v1; the tag is assumed to say enough about placement.
