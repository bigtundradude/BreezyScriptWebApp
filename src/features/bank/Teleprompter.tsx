import { useEffect, useRef, useState } from 'react'
import {
  AlignHorizontalSpaceAround,
  Bold,
  Contrast,
  FlipVertical2,
  Gauge,
  Pause,
  Play,
  SlidersHorizontal,
  Type,
  X,
} from 'lucide-react'

// Ported from the proven teleprompter in breezyportalelectron
// (src/features/script-shared/components/ScriptPreview.tsx), adapted for web:
// no drag regions, prefs in localStorage, and per the owner (2026-08-18) the
// width control is side PADDING so the text can use the full screen at 0.
// Renders plain pre-wrap text (not Markdown) so the font-size slider always
// wins, and the scroll loop accumulates fractional pixels before applying
// them — assigning fractions straight to scrollTop gets rounded away by the
// browser, which is why slow speeds used to stall.
const PREFS_KEY = 'bs.teleprompter'

// Text never drops below this opacity, so the screen can't go fully blank.
const MIN_OPACITY = 30

const WEIGHT_LABELS: Record<number, string> = {
  300: 'Light',
  400: 'Normal',
  500: 'Medium',
  600: 'Semibold',
  700: 'Bold',
  800: 'Extrabold',
}

interface Prefs {
  fontSize: number
  fontWeight: number
  paddingPct: number
  opacity: number
  speed: number
  mirror: boolean
  railOpen: boolean
}

// Padding is a % of the text area's width so one setting works on both a
// phone and a wide monitor. 40% per side leaves a 20%-wide text column at
// the extreme, so the text can never be squeezed to nothing.
const MAX_PADDING_PCT = 40

const DEFAULT_PREFS: Prefs = {
  fontSize: 32,
  fontWeight: 400,
  paddingPct: 6,
  opacity: 100,
  speed: 40,
  mirror: false,
  railOpen: true,
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as Partial<Prefs> & {
        width?: number
        padding?: number
      }
      delete stored.width // pre-2026-08-18 prefs stored a max-width instead
      if (stored.padding != null && stored.paddingPct == null) {
        // Pre-percentage prefs stored padding in px; convert on this screen.
        // A px value too big for this screen (e.g. a stale 320 on a phone)
        // is meaningless, so reset it to the default instead of pinning max.
        const pct = Math.round((stored.padding / window.innerWidth) * 100)
        stored.paddingPct = pct > MAX_PADDING_PCT ? DEFAULT_PREFS.paddingPct : pct
      }
      delete stored.padding
      return { ...DEFAULT_PREFS, ...stored }
    }
  } catch {
    // fall through
  }
  return DEFAULT_PREFS
}

export function Teleprompter({
  text,
  open,
  onClose,
}: {
  text: string
  open: boolean
  onClose: () => void
}) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [playing, setPlaying] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const remainderRef = useRef(0)

  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    setPrefs((p) => ({ ...p, [key]: value }))

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      // ignore
    }
  }, [prefs])

  // Keyboard: Escape closes, Space toggles play, ← rewinds to the current
  // paragraph's start (placed where it has just barely entered the screen),
  // → jumps forward 20% of screen height. Keys defer to a focused control
  // only where the control actually uses them (see the guard below).
  // All geometry uses layout coordinates (offsetTop is unaffected by the
  // mirror transform); in mirror mode the viewport shows the layout range
  // [scrollHeight - scrollTop - clientHeight, scrollHeight - scrollTop] and
  // new text enters at the opposite edge, so targets are mirrored.
  useEffect(() => {
    if (!open) {
      setPlaying(false)
      return
    }
    const clampScroll = (el: HTMLDivElement, target: number) =>
      Math.max(0, Math.min(el.scrollHeight - el.clientHeight, target))
    const jumpBack = () => {
      const el = scrollRef.current
      const paragraphs = contentRef.current?.children
      if (!el || !paragraphs?.length) return
      const line = prefs.fontSize * 1.6
      const center = prefs.mirror
        ? el.scrollHeight - el.scrollTop - el.clientHeight / 2
        : el.scrollTop + el.clientHeight / 2
      let current = paragraphs[0] as HTMLElement
      for (const p of paragraphs) {
        if ((p as HTMLElement).offsetTop > center) break
        current = p as HTMLElement
      }
      el.scrollTop = clampScroll(
        el,
        prefs.mirror
          ? el.scrollHeight - current.offsetTop - line
          : current.offsetTop - el.clientHeight + line,
      )
    }
    const jumpForward = () => {
      const el = scrollRef.current
      if (!el) return
      const delta = el.clientHeight * 0.2 * (prefs.mirror ? -1 : 1)
      el.scrollTop = clampScroll(el, el.scrollTop + delta)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== ' ' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const target = e.target as HTMLElement | null
      // Sliders/text fields consume arrows natively, so defer to them. Buttons
      // only consume Space (native click activation, so Space on the focused
      // play button still toggles play); arrows must keep driving the
      // prompter even while a just-clicked button holds focus.
      if (target?.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === ' ' && target?.closest('button')) return
      e.preventDefault()
      if (e.key === ' ') setPlaying((p) => !p)
      else if (e.key === 'ArrowLeft') jumpBack()
      else jumpForward()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, prefs.mirror, prefs.fontSize])

  // When mirror mode toggles, jump to the reading start for that direction:
  // mirrored starts at the bottom (scrolls up), normal starts at the top.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = prefs.mirror ? el.scrollHeight : 0
  }, [prefs.mirror, open])

  // Auto-scroll loop — accumulate fractional pixels, apply whole ones.
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }
    const el = scrollRef.current
    // If already at the end for this direction, restart from the beginning.
    if (el) {
      if (prefs.mirror && el.scrollTop <= 1) el.scrollTop = el.scrollHeight
      else if (!prefs.mirror && el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
        el.scrollTop = 0
    }
    remainderRef.current = 0
    let last = performance.now()
    const dir = prefs.mirror ? -1 : 1
    const step = (now: number) => {
      const node = scrollRef.current
      if (!node) return
      const dt = (now - last) / 1000
      last = now
      remainderRef.current += prefs.speed * dt
      const whole = Math.floor(remainderRef.current)
      if (whole >= 1) {
        node.scrollTop += whole * dir
        remainderRef.current -= whole
        const atEnd = prefs.mirror
          ? node.scrollTop <= 0
          : node.scrollTop + node.clientHeight >= node.scrollHeight - 1
        if (atEnd) {
          setPlaying(false)
          return
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, prefs.speed, prefs.mirror])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-300 flex flex-col bg-bg">
      {/* Top bar: settings toggle · play/pause · exit */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-3 py-1.5 md:px-4">
        <button
          onClick={() => set('railOpen', !prefs.railOpen)}
          title={prefs.railOpen ? 'Hide controls' : 'Show controls'}
          className={`flex h-11 w-11 items-center justify-center rounded-control border transition-colors ${
            prefs.railOpen
              ? 'border-primary bg-primary-subtle text-text-primary'
              : 'border-border bg-surface-raised text-text-secondary hover:text-text-primary'
          }`}
        >
          <SlidersHorizontal size={16} />
        </button>
        <div className="flex-1" />
        <span className="hidden text-xs text-text-muted md:inline">
          Space play/pause · ← paragraph back · → jump ahead · Esc close
        </span>
        <button
          onClick={() => setPlaying((p) => !p)}
          title="Play/pause (Space)"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-text-inverse"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <button
          onClick={onClose}
          title="Close (Esc)"
          className="flex h-11 w-11 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body: collapsible controls rail + scrolling text. On phones the rail
          overlays the text as a drawer; on md+ it is a static left column. */}
      <div className="relative flex min-h-0 flex-1">
        {prefs.railOpen && (
          <div className="absolute inset-y-0 left-0 z-10 flex w-64 flex-col gap-5 overflow-y-auto border-r border-border-subtle bg-surface p-4 md:static md:z-auto md:w-60 md:shrink-0">
            <RailSlider
              icon={<Type size={14} />}
              label="Font"
              value={`${prefs.fontSize}px`}
              min={18}
              max={72}
              step={2}
              val={prefs.fontSize}
              onChange={(n) => set('fontSize', n)}
            />
            <RailSlider
              icon={<Bold size={14} />}
              label="Weight"
              value={WEIGHT_LABELS[prefs.fontWeight] ?? `${prefs.fontWeight}`}
              min={300}
              max={800}
              step={100}
              val={prefs.fontWeight}
              onChange={(n) => set('fontWeight', n)}
            />
            <RailSlider
              icon={<AlignHorizontalSpaceAround size={14} />}
              label="Side padding"
              value={`${prefs.paddingPct}%`}
              min={0}
              max={MAX_PADDING_PCT}
              step={1}
              val={prefs.paddingPct}
              onChange={(n) => set('paddingPct', n)}
            />
            <RailSlider
              icon={<Contrast size={14} />}
              label="Opacity"
              value={`${prefs.opacity}%`}
              min={MIN_OPACITY}
              max={100}
              step={5}
              val={prefs.opacity}
              onChange={(n) => set('opacity', n)}
            />
            <RailSlider
              icon={<Gauge size={14} />}
              label="Scroll speed"
              value={`${prefs.speed}`}
              min={5}
              max={110}
              step={5}
              val={prefs.speed}
              onChange={(n) => set('speed', n)}
            />

            {/* Mirror — flips the text on both axes for beam-splitter glass
                and reverses scrolling to bottom→top. */}
            <button
              onClick={() => set('mirror', !prefs.mirror)}
              title="Mirror the text for teleprompter glass and scroll bottom-to-top"
              className={`flex min-h-11 items-center justify-center gap-2 rounded-control border px-3 text-xs font-semibold transition-colors ${
                prefs.mirror
                  ? 'border-primary bg-primary text-text-inverse'
                  : 'border-border bg-surface-raised text-text-secondary hover:text-text-primary'
              }`}
            >
              <FlipVertical2 size={14} /> Mirror (invert)
            </button>
          </div>
        )}

        {/* Spacer divs (not padding) provide the top/bottom runway so the
            first and last lines can both reach screen centre — padding-bottom
            on an overflow:auto container is dropped by Chromium. */}
        <div
          ref={scrollRef}
          className="relative flex-1 overflow-y-auto"
          style={{
            paddingLeft: `${prefs.paddingPct}%`,
            paddingRight: `${prefs.paddingPct}%`,
          }}
        >
          <div style={{ height: '75vh' }} aria-hidden="true" />
          {/* Paragraphs are separate divs (split on blank lines) so the ←
              rewind can find the current paragraph's position. The scroller is
              position:relative so offsetTop measures from it directly. */}
          <div
            ref={contentRef}
            className="text-text-primary"
            style={{
              fontSize: prefs.fontSize,
              fontWeight: prefs.fontWeight,
              lineHeight: 1.6,
              opacity: Math.max(MIN_OPACITY, prefs.opacity) / 100,
              transform: prefs.mirror ? 'scaleX(-1) scaleY(-1)' : undefined,
              transformOrigin: 'center',
            }}
          >
            {(text.trim() ? text.split(/\n{2,}/) : ['This script is empty.']).map(
              (paragraph, i) => (
                <div
                  key={i}
                  className="whitespace-pre-wrap break-words"
                  style={{ marginBottom: '1.6em' }}
                >
                  {paragraph}
                </div>
              ),
            )}
          </div>
          <div style={{ height: '75vh' }} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

function RailSlider({
  icon,
  label,
  value,
  min,
  max,
  step,
  val,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  value: string
  min: number
  max: number
  step: number
  val: number
  onChange: (n: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.04em] text-text-muted">
          {icon}
          {label}
        </span>
        <span className="text-xs tabular-nums text-text-secondary">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-primary"
      />
    </div>
  )
}
