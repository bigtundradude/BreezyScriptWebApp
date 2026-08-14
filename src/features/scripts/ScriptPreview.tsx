import { useEffect, useRef, useState } from 'react'
import { Minus, Pause, Play, Plus, X } from 'lucide-react'
import { Markdown } from '@/components/ui'

// Teleprompter, ported: full-screen overlay, Space = play/pause, Escape = close,
// adjustable font size / width / scroll speed. Prefs persist per device.
const PREFS_KEY = 'bs.teleprompter'

interface Prefs {
  fontSize: number
  width: number
  speed: number
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { fontSize: 32, width: 720, speed: 40, ...(JSON.parse(raw) as Partial<Prefs>) }
  } catch {
    // fall through
  }
  return { fontSize: 32, width: 720, speed: 40 }
}

export function ScriptPreview({
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
  const rafRef = useRef<number | null>(null)
  const lastTime = useRef<number>(0)

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      // ignore
    }
  }, [prefs])

  useEffect(() => {
    if (!open) {
      setPlaying(false)
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }
    lastTime.current = performance.now()
    const step = (now: number) => {
      const dt = (now - lastTime.current) / 1000
      lastTime.current = now
      const el = scrollRef.current
      if (el) {
        el.scrollTop += prefs.speed * dt
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) setPlaying(false)
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, prefs.speed])

  if (!open) return null

  const adjust = (key: keyof Prefs, delta: number, min: number, max: number) =>
    setPrefs((p) => ({ ...p, [key]: Math.min(max, Math.max(min, p[key] + delta)) }))

  return (
    <div className="fixed inset-0 z-300 flex flex-col bg-bg">
      <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-2.5">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-text-inverse"
          title="Space to play/pause"
        >
          {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>
        <Control label={`${prefs.fontSize}px`} onMinus={() => adjust('fontSize', -2, 20, 56)} onPlus={() => adjust('fontSize', 2, 20, 56)} />
        <Control label={`${prefs.width}px`} onMinus={() => adjust('width', -40, 480, 1000)} onPlus={() => adjust('width', 40, 480, 1000)} />
        <Control label={`${prefs.speed}/s`} onMinus={() => adjust('speed', -5, 10, 160)} onPlus={() => adjust('speed', 5, 10, 160)} />
        <div className="flex-1" />
        <span className="text-xs text-text-muted">Space play/pause · Esc close</span>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted hover:bg-surface-raised hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className="mx-auto py-[40vh] [&_.md-body]:!text-inherit [&_.md-body]:leading-[1.7]"
          style={{ maxWidth: prefs.width, fontSize: prefs.fontSize }}
        >
          <div style={{ fontSize: prefs.fontSize, lineHeight: 1.7 }}>
            <Markdown>{text || '*Nothing to read.*'}</Markdown>
          </div>
        </div>
      </div>
    </div>
  )
}

function Control({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-control border border-border bg-surface-raised px-1.5 py-1">
      <button onClick={onMinus} className="text-text-muted hover:text-text-primary">
        <Minus size={12} />
      </button>
      <span className="w-11 text-center text-xs tabular-nums text-text-secondary">{label}</span>
      <button onClick={onPlus} className="text-text-muted hover:text-text-primary">
        <Plus size={12} />
      </button>
    </span>
  )
}
