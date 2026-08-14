import { useEffect, useRef, useState } from 'react'
import { Check, Clipboard, Sparkles } from 'lucide-react'
import { Button } from './Button'
import { Textarea } from './Textarea'

// The app's signature "AI-shaped without AI" primitive, ported: compose a
// prompt → copy → the user runs it in their own AI → pastes the reply → apply.
// onApply may return false to keep the paste for retry; thrown errors surface
// as friendly text.
export function MegapromptPanel({
  getPrompt,
  onApply,
  what,
  disabled,
  hint,
}: {
  getPrompt: () => Promise<string>
  onApply: (raw: string) => Promise<void | boolean>
  what: string
  disabled?: boolean
  hint?: string
}) {
  const [busy, setBusy] = useState<'copy' | 'apply' | null>(null)
  const [copied, setCopied] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const copy = async () => {
    setBusy('copy')
    setError('')
    try {
      const prompt = await getPrompt()
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setPasteOpen(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the prompt.')
    } finally {
      setBusy(null)
    }
  }

  const apply = async () => {
    if (!paste.trim()) return
    setBusy('apply')
    setError('')
    try {
      const keep = await onApply(paste)
      if (keep !== false) {
        setPaste('')
        setPasteOpen(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply the reply.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-row border border-border bg-surface p-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          loading={busy === 'copy'}
          onClick={() => void copy()}
        >
          <Sparkles size={13} />
          Copy prompt for {what}
        </Button>
        {copied && (
          <span className="flex items-center gap-1 text-xs text-success">
            <Check size={13} /> Copied. Paste it into your AI.
          </span>
        )}
        {!pasteOpen && !copied && (
          <button
            type="button"
            className="text-xs text-text-muted underline underline-offset-2 hover:text-text-secondary"
            onClick={() => setPasteOpen(true)}
          >
            Paste a reply
          </button>
        )}
      </div>
      {hint && <div className="text-xs text-text-muted">{hint}</div>}
      {pasteOpen && (
        <>
          <Textarea
            rows={5}
            placeholder="Paste the model's entire reply here."
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <div className="flex items-center gap-2.5">
            <Button size="sm" loading={busy === 'apply'} disabled={!paste.trim()} onClick={() => void apply()}>
              <Clipboard size={13} />
              Apply {what}
            </Button>
            {error && <span className="text-xs text-warning">{error}</span>}
          </div>
        </>
      )}
    </div>
  )
}
