# Design System — Repo Audit Findings

> Phase-0 audit of the BreezyScript Tauri repo (read-only), per `docs/breezyscript-web-migration-design.md` §5.1.
> Audited: 2026-08-14. All paths relative to `/Users/tundra/TundraTools/BreezyScript`.

---

## 1. CSS approach

**Tailwind CSS v4 (`^4.3.3`) via the `@tailwindcss/vite` plugin. No `tailwind.config.js`, no `postcss.config.js`.** Everything is configured in CSS.

- `package.json:31,36` — `@tailwindcss/vite ^4.3.3`, `tailwindcss ^4.3.3`.
- `vite.config.ts:3,11` — `tailwindcss()` in plugins; `vite.config.ts:13-17` — alias `@` → `src`.
- `src/styles/globals.css:1` — `@import "tailwindcss";` (v4 form).
- `src/styles/globals.css:3-41` — `@theme { … }` block holds the entire token set.
- `src/main.tsx:4` — `globals.css` is the **only** stylesheet imported.

**`src/App.css` is dead Tauri/Vite boilerplate** — never imported. Do not port it.

### The hybrid styling convention (defining trait)

Codified in `.claude/microtool-design-guide.md:57-59`:

> - **All colors are CSS variables.** Never hardcode a hex or `rgb()` in a component.
> - **Layout via Tailwind utility classes** (`flex`, `gap`, `p-*`). **CSS-variable references and dynamic values via inline `style={{}}`.**
> - Merge classes with the local `cn()` helper (`clsx`-based). **Do not** add `tailwind-merge`.

In practice ~70/30 toward inline `style={{}}` objects. Only the form primitives (`Button`, `Input`, `Textarea`, `Select`, `SearchInput`, `PillInput`, `LinkButton`) use Tailwind meaningfully, via **arbitrary-value bracket syntax** (`bg-[var(--color-surface-raised)]`), not the auto-generated `@theme` utilities. Everything else is inline style objects. `cn()`: `src/lib/utils.ts:3-5` (bare `clsx`).

**Migration note:** the `@theme` block names tokens `--color-*`, so Tailwind v4 auto-generates utilities (`bg-surface`, `text-text-primary`, …) which the app never uses. The web rewrite can adopt the generated utilities and drop the bracket syntax — same tokens, cleaner classes.

### Dark mode

**There is no light mode and no dark-mode mechanism.** No `dark:` variants, no `prefers-color-scheme` in live code, no toggle. Single hardcoded dark theme at `:root`/`body`. Intentional — `.claude/microtool-design-guide.md:30`: *"Dark, calm, content-first. The UI recedes; the creator's text/media is the bright object."*

---

## 2. Full color palette

All from `src/styles/globals.css:3-41`; duplicated as a table in `.claude/components.md:90-121`.

### Brand / primary (`globals.css:4-7`)

| Token | Hex | Role |
|---|---|---|
| `--color-primary` | `#818cf8` | indigo-400. Buttons, active states, focus rings, tab underline, toggle-on, caret, progress fill |
| `--color-primary-hover` | `#6366f1` | indigo-500. Primary button hover only |
| `--color-primary-subtle` | `#1e1b4b` | very dark indigo. Selected-row fills, `Badge primary` bg, `Card selected` glow ring |

### Surfaces (`globals.css:9-16`)

| Token | Hex | Role |
|---|---|---|
| `--color-bg` | `#09090b` | zinc-950. `body`, `<main>`, launcher, md code/pre |
| `--color-surface` | `#18181b` | zinc-900. Cards, panels, modals, list cards, drawers |
| `--color-surface-raised` | `#27272a` | zinc-800. Inputs, dropdowns, popovers, pills, icon wells, hover fills |
| `--color-header` | `#09090b` | Top bar (= `--color-bg`) |
| `--color-sidebar` | `#111114` | Left rail |
| `--color-sidebar-hover` | `#1c1c20` | Rail nav hover |
| `--color-sidebar-active` | `#27272a` | Rail active item (= `surface-raised`); also `Button secondary` hover |

Elevation ramp (non-monotonic): `#09090b` → `#111114` → `#18181b` → `#1c1c20` → `#27272a`.

### Text (`globals.css:18-23`)

| Token | Hex | Role |
|---|---|---|
| `--color-text-primary` | `#f4f4f5` | zinc-100. Body, headings, active nav |
| `--color-text-secondary` | `#c4c4c8` | "zinc-350 — lifted from zinc-400 for readability". Helper text, inactive tabs, ghost button |
| `--color-text-muted` | `#9b9ba3` | "lifted again". Placeholders, icons, meta, section labels |
| `--color-text-inverse` | `#09090b` | Text on primary fills |
| `--color-text-sidebar` | `#d4d4d8` | zinc-300. Inactive sidebar labels |

The two "lifted" values are deliberate, iterated accessibility decisions — **preserve exactly** (do not snap back to stock zinc-400/500).

### Borders (`globals.css:25-27`)

| Token | Hex | Role |
|---|---|---|
| `--color-border` | `#3f3f46` | zinc-700. Default borders, scrollbar thumb |
| `--color-border-subtle` | `#27272a` | zinc-800. Faint dividers, header/rail borders |

### Status / semantic (`globals.css:29-35`)

| Token | Hex | Role |
|---|---|---|
| `--color-success` | `#34d399` | emerald-400 |
| `--color-warning` | `#fbbf24` | amber-400; also `RatingStar` fill |
| `--color-caution` | `#fb923c` | orange-400, "between warning and danger" (Clarity classification) |
| `--color-danger` | `#f87171` | red-400. Destructive + errors (no separate `destructive` token) |
| `--color-info` | `#60a5fa` | blue-400 |
| `--color-accent-purple` | `#c084fc` | purple-400, decorative |

Note: `Button variant="danger"` uses literal `text-white`, not `--color-text-inverse` (`Button.tsx:19`) — fix during port.

### Tool accents (`globals.css:37-40`)

| Token | Hex | Tool |
|---|---|---|
| `--color-tool-script` | `#a78bfa` | violet-400 — BreezyScript |
| `--color-tool-settings` | `#94a3b8` | slate-400 — Settings |
| `--color-tool-voice` | `#2dd4bf` | teal-400 — Voice Pro |

### Alpha compositing patterns (not tokenized)

1. **Hardcoded rgba in `Badge`** (`Badge.tsx:8-11`): e.g. `rgba(52,211,153,0.12)` bg + `rgba(52,211,153,0.3)` border — the one place `ui/` breaks the "never hardcode" rule. In Tailwind v4: `bg-success/12 border-success/30`.
2. **`color-mix(in srgb, …)`** — newer idiom: `FileDropzone.tsx:46` (6%), `RouteError.tsx:27-28` (14%/30%), Clarity steps (9%/30%).
3. **Hex-alpha suffix concatenation** for accent washes — `${accentColor}20`, `18`, `30`, `08`, `0d`, `55` (`ToolCard.tsx:68,86,94-95`, `Launcher.tsx:219,254,269,281,287-288`). Breaks if accents move to `oklch()` — convert to `color-mix()`.

Fixed non-token colors: modal backdrop `rgba(0,0,0,0.7)` (`Modal.tsx:51`), drawer scrim `rgba(0,0,0,0.45)`, toggle knob `#fff`, danger button `white`.

(Out-of-scope: the Clarity PDF report has its own warm bronze/paper palette — `clarity/reports/renderHtml.ts:212-224` — a print artifact, not app UI.)

---

## 3. Typography

### Families

**No web fonts, no `@font-face`, no Google Fonts.** CSP blocks remote fonts (`tauri.conf.json:29`, `font-src 'self' data:`).

- **Body** (`globals.css:54`): `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` → SF Pro on macOS.
- **Mono**: `ui-monospace, SFMono-Regular, Menlo, monospace` (`globals.css:98`, `CopyBlock.tsx:71`, `RouteError.tsx:45,49`; looser variants in feature files).
- `-webkit-font-smoothing: antialiased` (`globals.css:57`).

**Biggest single visual decision for the web app:** SF Pro is free in Tauri on macOS; a browser on Windows/Linux falls back to Segoe/Roboto. Either ship a self-hosted font (Inter/Geist) or accept platform drift.

### Size scale (px census across all `.tsx`)

| px | Count | Role |
|---|---|---|
| 10 | 2 | micro eyebrow |
| **11** | **53** | badges, eyebrows, section labels, meta |
| **12** | **164** | hints, errors, secondary meta, small buttons — most used |
| **13** | **150** | **body default**, nav labels, form labels, descriptions |
| 14 | 69 | modal body, larger nav |
| 15 | 30 | modal title, card title |
| 18 | 13 | `ListPage` h2 page heading |
| 20 | 5 | ProductCard title |
| 28–30 | 3 | hero wordmarks (Dashboard "Flow", Launcher "BreezyScript") |

**Effective scale: 11 / 12 / 13 / 14 / 15 / 18 / 20 / 28-30. Body is 13px** — denser than typical web. `.md-body` prose is 14px (`globals.css:80`).

### Weights

`400` default · `500` labels/nav-active/pills · `600` card titles, modal titles, section labels, active tab · `700` page headings, wordmark, md headings · `800` hero wordmarks.

### Line heights

`1.6` dominant (body, `.md-body`) · `1.5` · `1.55` (popovers) · `1.4` (toasts) · `1.3` (md headings).

### Letter spacing

`0.05em`/`0.06em` for uppercase eyebrows; negative for display: `-0.01em` (page h2), `-0.02em` (wordmark), `-0.03/-0.04em` (heroes).

Uppercase micro-label recipe (~12×, e.g. `BreezyScriptProNav.tsx:105-108`):
```
fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
textTransform: 'uppercase', color: 'var(--color-text-muted)'
```

### Markdown body (`.md-body`, `globals.css:79-114`)

14px/1.6; `p` margin `0 0 10px`; headings `18px 0 8px`, weight 700, lh 1.3, sizes h1 1.4em / h2 1.25em / h3 1.1em / h4 1em; lists `padding-left: 22px`, `li` `3px 0`; links primary + underline; inline `code` 0.875em on `--color-bg`, border-subtle border, r4, `1px 5px`; `pre` r8 `12px 14px`; `blockquote` 3px left border; tables collapsed, cells `6px 10px`, `th` on surface-raised 600.

---

## 4. Spacing, radii, shadows

### Spacing (no token scale; raw numbers in inline styles)

- **Gaps:** 2 (nav) · 4 · 6 · 8 (list items) · 10 (icon↔label, filter rows) · 12 · 14 · 16 · 18 · 20 (ListPage sections) · 24
- **Page padding:** `28px 32px` (standard ListPage), `48px 32px` (hero pages)
- **Common paddings:** `7px 10px` (rail item), `10px 12px` (most common control), `12px 16px` (ListCard), `16px 20px` (modal header)
- **Control heights:** 28 (sm button) · 36 (md button, Input, Select, SearchInput) · 38 (PillInput min) · 44 (lg) · 48 (Header) · 24 (Toggle)
- **Max content widths:** 760 (launcher/dashboard grids, note editor) · 800 · 840 · 680 · 640 · 560 · 460
- **Fixed widths:** 200 (left rail) · 220/240 (project selector) · 360 (drawer)

### Border radii

**Effective scale: 6 (dense controls) / 8 (buttons, inputs — `rounded-lg`) / 10 (list rows, popovers — most common, 39×) / 12 (cards, modals — `rounded-xl`) / 16-18 (hero cards) / full (pills, badges).**

### Shadows / elevation

Elevation is primarily **background lightness + border**, not shadow. Shadow only on floating layers:

| Shadow | Used by |
|---|---|
| `0 1px 4px rgba(0,0,0,0.2)` | Card resting |
| `0 8px 24px rgba(0,0,0,0.4)` | Select listbox, ProjectSelector dropdown |
| `0 8px 24px rgba(0,0,0,0.35)` | Popover |
| `0 6px 24px rgba(0,0,0,0.35)` | Toast, error banner |
| `0 24px 64px rgba(0,0,0,0.6)` | Modal |
| `-8px 0 32px rgba(0,0,0,0.4)` | right drawer |
| `0 0 0 2px var(--color-primary-subtle)` | Card selected ring |
| `0 0 0 1px ${accent}20, 0 8px 32px rgba(0,0,0,0.3)` | ToolCard hover |

### z-index scale

`55` toast · `60` error banner · `100` ProjectSelector dropdown · `200` Modal/scrim · `201` drawer · `1000` portaled Select/Popover.

### Focus ring

- Global (`globals.css:74-77`): `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }`
- Component rings: Button `focus-visible:ring-2` + offset on bg; inputs `focus:ring-2 …/20` + primary border (`Input.tsx:32-33`).

### Scrollbars (`globals.css:64-71`)

6px, transparent track, thumb `--color-border` r3, hover `--color-text-muted`. WebKit-only — needs `scrollbar-color` fallback for Firefox on web.

---

## 5. Motion

Deliberately minimal. **No animation library, no transition tokens.** Two `@keyframes`, inlined in components.

- **Durations:** `0.1s` (nav/card hover, lift) · `120ms` (tabs, star) · `0.15s` (borders, shadows, toggle knob, chevron rotate, copy feedback) · `0.3s` (progress width) · `0.75s` spinner period · `1.2s` indeterminate cycle.
- **Easings:** only `ease` (explicit or default), `linear` (spinner), `ease-in-out` (indeterminate). **No cubic-bezier, no springs.**
- **What animates:** background, color, border-color, box-shadow, `translateY(-1/-2px)` hover lift, `scale(1.15)` star, `rotate(180deg)` chevron, toggle `left`, progress `width`.
- **What does NOT animate:** **modals, popovers, dropdowns, drawers, toasts mount/unmount instantly** (`if (!open) return null`). A deliberate "instant app" feel — decide whether to keep or add subtle enter/exit on web.
- **No `prefers-reduced-motion` handling anywhere** — add on web.
- Keyframes: `spin` (`Spinner.tsx:19`, 8-spoke SVG, `0.75s linear infinite`); `vp-indeterminate` (`ProgressBar.tsx:48`).

---

## 6. Component inventory — `src/components/ui/` (26 exports, barrel `index.ts:1-26`; prop docs `.claude/components.md:124-306`)

| Component | What it is | API surface |
|---|---|---|
| **Button** | Primary action primitive, Tailwind-styled, `forwardRef` | `variant`: primary\|secondary\|ghost\|danger; `size`: sm(28)\|md(36)\|lg(44); `loading` (Spinner swap + disabled); `iconOnly` (square). Disabled = `opacity-50` |
| **LinkButton** | Text-styled button | `underline?` (default true). Fixed 13px, secondary → primary on hover |
| **Spinner** | 8-spoke SVG | `size?` (16), `color?` (currentColor) |
| **Input** | Labeled field; `className`→wrapper, `style`→input | `label`, `error`, `hint`, `suffix`; `useId()` wiring. `h-9 px-3 rounded-lg text-sm` on surface-raised |
| **Textarea** | Multiline | `label`, `error`, `hint`, **`bare`** (strips chrome). `resize-y min-h-[80px]` |
| **Select** | Custom dropdown (not native), generic `<T>`; **portals listbox to body, `position:fixed`**, re-anchors on scroll/resize, flips up when tight | `options {value,label,description?,disabled?}`, `value`, `onChange`, `placeholder`, `label`, `error`, `disabled`. Esc/Enter/Space/ArrowDown. LIST_MAX 240 |
| **Modal** | Centered dialog; backdrop `rgba(0,0,0,.7)` z-200, r12 panel, `maxHeight calc(100vh-64px)`, sticky header/footer, restores focus on close | `open,onClose,title,footer?`, `size`: sm\|md\|lg\|xl → 400/540/720/960, `persistent?` |
| **ConfirmModal** | Destructive confirm over Modal sm; mandated `window.confirm` replacement | `onConfirm`, `confirmLabel`, `variant` danger\|primary, `loading` |
| **Card / CardHeader / CardSection** | Container r12 on surface; clickable = role=button + Enter/Space; `selected` ring. CardSection = bordered rows pattern for settings | `onClick?, selected?, padding?(16)` |
| **Badge** | Pill, 11px, `2px 8px` | `variant`: default\|primary\|success\|warning\|danger\|info\|muted. (Hardcoded rgba map — fix) |
| **Toggle** | `role="switch"`; 44×24 track, 20px white knob, `left 2→22` 0.15s | `checked, onChange, label?, disabled?` |
| **EmptyState** | Centered zero-state; 48px icon well, 15px/600 title, 13px description max 320 | `icon?: LucideIcon, title, description?, action?{label,onClick}` |
| **FileDropzone** | Dashed r12 drop target; drag-hover → primary border + 6% mix bg; hidden input | `onFile, accept?, disabled?, title?, hint?` |
| **RatingStar** | 5-star, hover preview scale 1.15 | `value, onChange?, readonly?, size?(16)` |
| **PillInput** | Tag entry; Enter/comma/blur commit, Backspace-on-empty removes last, lowercased+trimmed, dedupe | `pills, onAdd, onRemove, placeholder?, label?, hint?, validate?` |
| **Popover** | Click-anchored panel; **portals to body, fixed**, re-anchors, Esc/outside close, CSS arrow | `trigger, side top\|bottom, maxWidth?(280)`. surface-raised r10 z-1000 |
| **Markdown** | `react-markdown`+`remark-gfm` in `.md-body`; links `_blank` | `children, renderLink?` (return null → default) |
| **CopyButton** | Icon copy w/ 1500ms Copy→Check success state | `text, size?(13), label?, showLabel?` |
| **CopyBlock** | Scrollable mono block + floating copy button | `text, maxHeight?(300), label?` |
| **CopyMenu** | Copy-format picker on Popover: URL / `Title → URL` / `[title](url)` | `title, url, size sm\|md` |
| **SearchInput** | Search field w/ left icon + conditional clear button; `forwardRef` | input attrs + `onClear?`. h36, pl34 |
| **Tabs** | Underline tabs on border rule; active = 2px primary underline + 600 | `tabs{id,label,disabled?}, active, onChange`, **`flow?`** (decorative `→` between tabs) |
| **MegapromptPanel** | The signature "AI-shaped without AI" primitive: compose→copy→user runs in own AI→paste→apply | `getPrompt():Promise<string>`, `onApply(raw):Promise<void\|boolean>` (false = keep paste), `what, disabled?, hint?`. 2500ms copy confirmation, auto-opens paste box |
| **ProgressBar** | 6px bar r3; indeterminate mode when `max<=0`; aria-complete | `value, max?(100), label?, sublabel?` |
| **AudioPlayer** | Minimal player (Voice Pro; out of scope phase 1) | `src, compact?` |

### Shared helpers — `src/components/shared/`

`useUnsavedChanges`/`UnsavedChangesGuard` (dirty-state nav interception), `useConfirm` (promise ConfirmModal), `useAutosave` (700ms debounced patch/flush), `SendToSecondBrainButton`.

---

## 7. Layout chrome

### Composition (`AppShell.tsx:67-85`)

```
<AppShellContext.Provider>
  <div flex-col h-100vh overflow-hidden>
    <Header toolName right />                      ← 48px, flexShrink 0
    <div flex flex-1 overflow-hidden>
      {leftRail}                                   ← 200px, flexShrink 0
      <main flex-1 overflowY-auto bg=--color-bg>
        <Outlet />
```

**Slot-injection pattern** (`AppShell.tsx:12-26`): shell owns `toolName`/`leftRail`/`headerRight` state via `useAppShell()`; each tool registers chrome in `useEffect` with unmount cleanup (`.claude/microtool-design-guide.md:104-111`). Chrome suppressed on `/flow` (dashboard) and when gated (first-run `CreateFirstChannel`). The `/` launcher sits entirely outside AppShell.

### Header (`Header.tsx:9-54`)

h48, `--color-header` bg, border-subtle bottom, `userSelect none`, gap 12. **`paddingLeft: 80 // clear macOS traffic lights`** (`:19`). Order: wordmark ("BreezyScript", primary, 15/700, -0.02em, → `/`) → `/` separator → tool name (14/500 secondary) → right cluster ({right} slot + ProjectSelector, gap 10).

### LeftRail (`LeftRail.tsx:89-206`)

w200, `--color-sidebar` bg, border-subtle right, `padding 8px 8px`. Structure: back-link → divider → scrollable nav (gap 2) → optional pinned `actions` → optional "Tool settings". Nav item: `7px 10px`, r6, gap 10, 13px, icon 15. Active = sidebar-active bg + text-primary + 500; hover via **JS mouseenter/leave** (convert to CSS `hover:` on web). Active match: exact or `startsWith(path + '/')` with `exact` flag. Back link points to the tool's space — `SPACE_FLOW = { label: 'Flow tools', path: '/flow' }` default (`LeftRail.tsx:35`). `onNavigate?` exists for unsaved guards (mostly unused — a known gap).

**`BreezyScriptProNav.tsx:63-105` hand-rolls its own identical rail** because it needs section headers (Foundations / Library / Setup) that `LeftRail` lacks. Unify in rewrite: add `section` support to the shared rail.

### ListPage (`ListPage.tsx:37-102`) — standard page template

`28px 32px`, flex-col gap 20. Zones: header row (h2 18/700 + description + primary Button) → filter row (SearchInput flex-1 minW 200 + filters, wrap) → content branch: loading spinner / EmptyState / `flex-col gap 8` children.

### ListCard (`ListCard.tsx:11-47`)

`12px 16px`, surface bg, border, r10, hover→surface-raised (JS handlers incl. focus/blur). **Auto-appends ChevronRight when clickable** — consumers must not add their own. `accent?` → 3px left border.

### Other chrome

- **ProjectSelector** (`ProjectSelector.tsx:76-155`): header channel switcher; trigger `5px 9px` r7 surface-raised maxW 220, FolderOpen icon primary; dropdown w240 r8 z-100 with 10px "Channel" label + inline create row.
- **Toast** (`NoticeToast.tsx:20-32`): fixed bottom-center pill r20, z-55, auto-dismiss 4000ms.
- **Error banner** (`SaveErrorBanner.tsx:22-39`): same anchor z-60, danger border, retry Button.
- **Drawer** (`ProfileDrawer.tsx:46-60`): scrim + right aside w360 z-201.

---

## 8. Native window chrome dependencies (highest migration risk in styling)

Tauri config (`tauri.conf.json:12-27`): 1280×820, min 1080×720, `titleBarStyle: "Overlay"`, `hiddenTitle: true`, traffic lights at (20,17).

Consequences:
1. **`Header.tsx:19` — `paddingLeft: 80`** exists solely to clear macOS traffic lights → becomes normal padding on web.
2. **`data-tauri-drag-region`** at `Header.tsx:13` and `Launcher.tsx:83` (an invisible 48px strip) → delete both.
3. **`.drag-region`/`.no-drag`** (`globals.css:61-62`, Electron-era `-webkit-app-region`) + `NO_DRAG` const (`ScriptPreview.tsx:18`) → inert on web, strip.
4. **`height: 100vh` + `overflow: hidden` shell** (`AppShell.tsx:69`, `Launcher.tsx:70`) — desktop assumption; use `100dvh`/`min-h-screen` on web.
5. **No responsive design whatsoever.** Zero media queries, zero `sm:`/`md:` prefixes. Only fluid bits: `repeat(auto-fit, minmax(320px,1fr))` grids. Web needs a responsive strategy from scratch.
6. **NOT used:** vibrancy, backdrop-filter, transparency, platform-conditional CSS. Window is opaque `#09090b` — no native material look to reproduce.

---

## 9. Per-tool accent mechanism

Principle (`.claude/microtool-design-guide.md:31,64`): one accent per tool, used for identity (hero icon, cards), names identical across tools.

**No runtime theming** — accent is just a color string prop. Three partly-inconsistent registries:
- `@theme` tokens: `--color-tool-script #a78bfa`, `--color-tool-settings #94a3b8`, `--color-tool-voice #2dd4bf`.
- Dashboard registry (`Dashboard.tsx:5-33`), raw hex: Scripts Pro `#c084fc` (**mismatches the token**), Voice Pro `#2dd4bf`, Second Brain `#f472b6` (**no token exists**).
- Launcher (`Launcher.tsx:130-171`): Clarity `#c084fc`, Flow `#34d399`, Second Brain `#f472b6`, Settings `#94a3b8`.

Render recipe (`ToolCard.tsx:64-102`, `Launcher.tsx:206-290`): icon well `${accent}18` bg + `${accent}30` border; icon/eyebrow full accent; glow `${accent}08`/`0d`; hover border full + ring `0 0 0 1px ${accent}20`; ListCard left border `3px solid accent`.

Accents never touch buttons/focus/links — those are always `--color-primary`.

Cleanups for the rewrite:
1. Reconcile Scripts Pro accent (`#a78bfa` vs `#c084fc`).
2. Add tokens: `--color-tool-second-brain: #f472b6` (and any others kept).
3. Replace hex-suffix alpha with `color-mix()`.

---

## Migration summary — highest-signal items

1. **Tokens are portable as-is** — the `@theme` block is already Tailwind v4-native; copy it, then use the generated utilities.
2. **The big styling job is inline-style → utility conversion** (~70% of styling is inline px objects).
3. **Body 13px, radius-10 dominant** — denser and softer than Tailwind defaults; preserve or the character changes.
4. **No fonts loaded** — decide explicitly (system stack vs self-hosted).
5. **JS hover handlers → CSS `hover:`** utilities.
6. **Delete:** App.css, drag regions, traffic-light padding, launcher drag strip.
7. **Add:** responsive strategy, `prefers-reduced-motion`, overlay enter/exit motion (optional), Firefox scrollbar fallback, `100dvh`.
8. **Fix during port:** Badge rgba → opacity utilities; danger button `text-white` → token; accent registry reconciliation.
