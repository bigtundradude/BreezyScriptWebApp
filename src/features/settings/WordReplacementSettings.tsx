import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ArrowRight, Check, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Button, Input, Spinner } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'
import { COMPOUND_FAMILIES, CONTRACTION_GROUPS, resolveCompoundStyle } from '@/features/bank/personalize'

// Word replacement settings (owner spec 2026-08-18). Sections follow the
// Personalize-text flow order: phrase replacements run FIRST, contractions
// second — so they are listed in that order here.
export function WordReplacementSettings({ channelId }: { channelId: Id<'channels'> }) {
  const settings = useQuery(api.bankPersonalize.getSettings, { channelId })
  const addReplacement = useMutation(api.bankPersonalize.addReplacement)
  const removeReplacement = useMutation(api.bankPersonalize.removeReplacement)
  const toggleContraction = useMutation(api.bankPersonalize.toggleContraction)
  const setContractionsDisabled = useMutation(api.bankPersonalize.setContractionsDisabled)
  const setCompoundStyle = useMutation(api.bankPersonalize.setCompoundStyle)
  const { confirm, ConfirmUI } = useConfirm()

  const [before, setBefore] = useState('')
  const [after, setAfter] = useState('')
  const [adding, setAdding] = useState(false)

  if (!settings) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner size={14} /> Loading…
      </div>
    )
  }

  const disabled = settings.disabledContractions

  const add = async () => {
    setAdding(true)
    try {
      await addReplacement({ channelId, before, after })
      setBefore('')
      setAfter('')
    } finally {
      setAdding(false)
    }
  }

  const confirmRemove = async (replacement: Doc<'bankReplacements'>) => {
    const ok = await confirm({
      title: 'Delete this replacement?',
      message: `“${replacement.before} → ${replacement.after}” is permanently removed.`,
      confirmLabel: 'Delete',
    })
    if (ok) await removeReplacement({ channelId, replacementId: replacement._id })
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-secondary">
        Powers the Personalize-text button in Script Refinement. It runs your phrase
        replacements first, then the enabled contractions.
      </p>

      {/* ——— 1. Phrase replacements (run first) ——— */}
      <div className="flex flex-col gap-2">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          1 · Phrase replacements
        </div>
        {settings.replacements.length === 0 && (
          <p className="text-xs text-text-muted">
            None yet — add phrases you say differently, like "going to" → "gonna".
          </p>
        )}
        {settings.replacements.map((replacement) => (
          <div
            key={replacement._id}
            className="flex items-center gap-2 rounded-row border border-border bg-surface py-1 pl-3 pr-1"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
              {replacement.before}
              <ArrowRight size={12} className="mx-2 inline text-text-muted" />
              {replacement.after}
            </span>
            <button
              aria-label={`Delete replacement ${replacement.before}`}
              onClick={() => void confirmRemove(replacement)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <div className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Before, e.g. going to"
              value={before}
              onChange={(e) => setBefore(e.target.value)}
              className="flex-1"
            />
            <ArrowRight size={14} className="shrink-0 text-text-muted" />
            <Input
              placeholder="After, e.g. gonna"
              value={after}
              onChange={(e) => setAfter(e.target.value)}
              className="flex-1"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            disabled={!before.trim() || !after.trim()}
            loading={adding}
            onClick={() => void add()}
          >
            <Plus size={13} />
            Add replacement
          </Button>
        </div>
      </div>

      {/* ——— 2. Contractions (run second) ——— */}
      <div className="flex flex-col gap-2">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          2 · Contractions
        </div>
        <p className="text-xs text-text-secondary">
          Common US English contractions. Uncheck any you do not want applied.
        </p>
        <div className="flex flex-col gap-3 rounded-panel border border-border bg-surface px-4 py-3">
          <div>
            <div className="text-sm font-medium text-text-primary">Compound contractions</div>
            <p className="mt-0.5 text-xs text-text-secondary">
              Phrases where two contractions compete — pick which side wins.
            </p>
          </div>
          {COMPOUND_FAMILIES.map((family) => (
            <StyleChooser
              key={family.key}
              label={family.label}
              value={resolveCompoundStyle(settings.compoundStyles, family.key)}
              options={family.options.map((o) => ({ value: o.value, label: o.example }))}
              onChange={(style) => void setCompoundStyle({ channelId, family: family.key, style })}
            />
          ))}
        </div>
        {CONTRACTION_GROUPS.map((group) => {
          const ids = group.patterns.map((p) => p.id)
          const enabledCount = ids.filter((id) => !disabled.includes(id)).length
          return (
            <div key={group.name} className="rounded-panel border border-border bg-surface">
              <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
                <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">
                  {group.name}
                  <span className="ml-2 text-2xs text-text-muted">
                    {enabledCount}/{ids.length} on
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void setContractionsDisabled({
                      channelId,
                      contractionIds: ids,
                      disabled: enabledCount === ids.length,
                    })
                  }
                >
                  {enabledCount === ids.length ? 'All off' : 'All on'}
                </Button>
              </div>
              <div className="flex flex-col px-2 py-1">
                {group.patterns.map((pattern) => {
                  const isEnabled = !disabled.includes(pattern.id)
                  return (
                    <button
                      key={pattern.id}
                      role="checkbox"
                      aria-checked={isEnabled}
                      onClick={() => void toggleContraction({ channelId, contractionId: pattern.id })}
                      className="flex min-h-11 items-center gap-3 rounded-control px-2 text-left transition-colors hover:bg-surface-raised"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                          isEnabled ? 'border-primary bg-primary' : 'border-border bg-transparent'
                        }`}
                      >
                        {isEnabled && <Check size={12} strokeWidth={3} className="text-text-inverse" />}
                      </span>
                      <span className="text-sm text-text-primary">
                        {pattern.from}
                        <ArrowRight size={12} className="mx-2 inline text-text-muted" />
                        {pattern.to}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {ConfirmUI}
    </div>
  )
}

function StyleChooser({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-text-secondary">{label}</span>
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex min-h-9 items-center rounded-control border px-3 text-sm transition-colors ${
              active
                ? 'border-primary bg-primary-subtle text-text-primary'
                : 'border-border bg-surface-raised text-text-secondary hover:text-text-primary'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
