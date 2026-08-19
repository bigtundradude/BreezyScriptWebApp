import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Pause, Play } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button, Input, Spinner } from '@/components/ui'

// Reading pace (docs/idea-workflow-plan.md §5e): read the sample aloud at your
// natural recording pace; we time it and compute words per minute. The Script
// Drafter multiplies minutes × this WPM to size scripts.

const SAMPLE = `Here is the honest truth about starting a channel: the first videos are not for your audience, they are for you. Every upload teaches your hands where the buttons are, teaches your voice how to land a sentence, and teaches your brain that publishing is survivable. The camera feels heavy at first. Then one day it does not. You learn to write the way you talk, to cut the sentence that sounds clever but says nothing, and to end a video one beat before people want you to. Nobody remembers a creator's early uploads except the creator, and that is a gift. So set the light, press record, and say the first line like you are telling a friend. That is the whole trick. That is the entire job. Everything else, the thumbnails, the analytics, the strategy, only matters once you can sit down and speak like yourself with the red light on.`

const SAMPLE_WORDS = SAMPLE.split(/\s+/).filter(Boolean).length

export function ReadingPaceSettings({ channelId }: { channelId: Id<'channels'> }) {
  const wpm = useQuery(api.pace.getWordsPerMinute, { channelId })
  const setWpm = useMutation(api.pace.setWordsPerMinute)

  const [reading, setReading] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [measured, setMeasured] = useState<number | null>(null)
  const [manual, setManual] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedNote, setSavedNote] = useState('')
  const startedAt = useRef(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
  }, [])

  if (wpm === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner size={14} /> Loading…
      </div>
    )
  }

  const start = () => {
    startedAt.current = Date.now()
    setElapsedMs(0)
    setMeasured(null)
    setSavedNote('')
    setReading(true)
    timer.current = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 250)
  }

  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    setReading(false)
    const minutes = (Date.now() - startedAt.current) / 60000
    if (minutes > 0.05) setMeasured(Math.round(SAMPLE_WORDS / minutes))
  }

  const save = async (value: number) => {
    setSaving(true)
    setSavedNote('')
    try {
      await setWpm({ channelId, wordsPerMinute: value })
      setSavedNote(`Saved ${Math.max(60, Math.min(260, Math.round(value)))} wpm.`)
      setManual('')
    } finally {
      setSaving(false)
    }
  }

  const seconds = Math.floor(elapsedMs / 1000)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Your reading pace sizes drafted scripts: minutes × words-per-minute. Current pace:{' '}
        <span className="font-semibold text-text-primary">{wpm} wpm</span>.
      </p>

      <div className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-4">
        <div className="text-sm font-medium text-text-secondary">
          Read this aloud at your natural recording pace ({SAMPLE_WORDS} words)
        </div>
        <p className="rounded-row border border-border-subtle bg-bg px-4 py-3 text-sm leading-relaxed text-text-primary">
          {SAMPLE}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {!reading ? (
            <Button onClick={start}>
              <Play size={14} />
              {measured === null ? 'Start reading' : 'Read again'}
            </Button>
          ) : (
            <Button variant="secondary" onClick={stop}>
              <Pause size={14} />
              Stop ({Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')})
            </Button>
          )}
          {measured !== null && (
            <>
              <span className="text-sm text-text-primary">
                Measured: <span className="font-semibold">{measured} wpm</span>
              </span>
              <Button size="sm" variant="secondary" loading={saving} onClick={() => void save(measured)}>
                Save as my pace
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <Input
          label="Or set it manually (60-260)"
          type="number"
          min={60}
          max={260}
          placeholder={String(wpm)}
          value={manual}
          onChange={(e) => {
            setManual(e.target.value)
            setSavedNote('')
          }}
          className="w-44"
        />
        <Button
          variant="secondary"
          disabled={!manual || Number(manual) <= 0}
          loading={saving}
          onClick={() => void save(Number(manual))}
        >
          Save
        </Button>
        {savedNote && <span className="pb-2.5 text-xs text-success">{savedNote}</span>}
      </div>
    </div>
  )
}
