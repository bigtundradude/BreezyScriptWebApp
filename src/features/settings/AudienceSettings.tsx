import { useMemo, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Check, Sparkles, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button, Spinner, Textarea } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'

// Target audience (owner spec 2026-08-18): one description of who the viewer
// is, the problem they have, and the creator's framework for solving it. Type
// or paste it directly, or run the AI walkthrough: answer discovery questions,
// compose a description from the answers, and accept it into the field.

// App-authored discovery questions (owner content rule: no em or en dashes).
const QUESTIONS = [
  'Who is your ideal viewer? Their age range, situation, and what their day looks like.',
  'What do they already know or believe about your topic?',
  'What is the painful problem that brings them to your videos?',
  'What does that problem cost them, and how does it feel day to day?',
  'What have they already tried that did not work?',
  'What result do they want most?',
  'What is your framework or method for getting them that result, and why does it work?',
]

export function AudienceSettings({ channelId }: { channelId: Id<'channels'> }) {
  const audience = useQuery(api.bankAudience.get, { channelId })
  const save = useMutation(api.bankAudience.save)
  const compose = useAction(api.bankAudience.compose)
  const { confirm, ConfirmUI } = useConfirm()

  const loaded = audience !== undefined
  const baseline = useMemo(
    () => ({
      description: audience?.description ?? '',
      answers: QUESTIONS.map(
        (question) =>
          audience?.interview?.find((entry) => entry.question === question)?.answer ?? '',
      ),
    }),
    [audience],
  )

  const [form, setForm] = useState<{ description: string; answers: string[] } | null>(null)
  const [walkthrough, setWalkthrough] = useState(false)
  const [generated, setGenerated] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner size={14} /> Loading audience…
      </div>
    )
  }

  const current = form ?? baseline
  const dirty = JSON.stringify(current) !== JSON.stringify(baseline)
  const answeredCount = current.answers.filter((a) => a.trim()).length

  const doSave = async () => {
    setSaving(true)
    try {
      await save({
        channelId,
        description: current.description,
        interview: QUESTIONS.map((question, i) => ({
          question,
          answer: current.answers[i],
        })).filter((entry) => entry.answer.trim()),
      })
      setForm(null)
    } finally {
      setSaving(false)
    }
  }

  const cancel = async () => {
    const ok = await confirm({
      title: 'Discard changes?',
      message: 'Your unsaved audience edits are lost.',
      confirmLabel: 'Discard',
    })
    if (ok) {
      setForm(null)
      setGenerated(null)
    }
  }

  const doCompose = async () => {
    setComposing(true)
    setComposeError(null)
    try {
      const result = await compose({
        interview: QUESTIONS.map((question, i) => ({ question, answer: current.answers[i] })),
      })
      if (result.error) setComposeError(result.error)
      else if (result.text) setGenerated(result.text)
    } finally {
      setComposing(false)
    }
  }

  const acceptGenerated = async () => {
    if (!generated) return
    if (current.description.trim() && current.description.trim() !== generated.trim()) {
      const ok = await confirm({
        title: 'Replace the audience description?',
        message: 'The current description text is overwritten with the generated version.',
        confirmLabel: 'Replace',
      })
      if (!ok) return
    }
    setForm({ ...current, description: generated })
    setGenerated(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Who you make videos for, the problem they have, and your framework for solving it. The
        Script Drafter writes every script for exactly this viewer. Type it yourself or let the
        walkthrough build it from your answers.
      </p>

      <Textarea
        label="Target audience description"
        rows={10}
        placeholder="Describe your viewer, the problem they are stuck on, and the framework you use to solve it…"
        value={current.description}
        onChange={(e) => setForm({ ...current, description: e.target.value })}
      />

      <div className="rounded-panel border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setWalkthrough((v) => !v)}>
            <Sparkles size={14} />
            {walkthrough ? 'Hide walkthrough' : 'AI walkthrough'}
          </Button>
          <span className="text-xs text-text-muted">
            Answer a few questions and the AI composes the description for you.
          </span>
        </div>

        {walkthrough && (
          <div className="mt-4 flex flex-col gap-4">
            {QUESTIONS.map((question, i) => (
              <Textarea
                key={question}
                label={`${i + 1}. ${question}`}
                rows={2}
                placeholder="Answer in your own words, rough is fine…"
                value={current.answers[i]}
                onChange={(e) =>
                  setForm({
                    ...current,
                    answers: current.answers.map((a, j) => (j === i ? e.target.value : a)),
                  })
                }
              />
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                disabled={answeredCount === 0}
                loading={composing}
                onClick={() => void doCompose()}
              >
                <Sparkles size={14} />
                Compose description
              </Button>
              <span className="text-xs text-text-muted">
                {answeredCount === 0
                  ? 'Answer at least one question first.'
                  : `${answeredCount} of ${QUESTIONS.length} answered. More answers make it sharper.`}
              </span>
            </div>
            {composeError && <p className="text-xs text-danger">{composeError}</p>}

            {generated && (
              <div className="flex flex-col gap-2 rounded-panel border border-primary/40 bg-primary-subtle p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.04em] text-text-muted">
                  Generated description
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                  {generated}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => void acceptGenerated()}>
                    <Check size={13} />
                    Use this description
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setGenerated(null)}>
                    <X size={13} />
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {dirty && (
        <div className="sticky bottom-0 z-10 mt-1 flex items-center justify-end gap-2 border-t border-border bg-bg py-3">
          <Button variant="secondary" onClick={() => void cancel()}>
            Cancel
          </Button>
          <Button loading={saving} onClick={() => void doSave()}>
            Save
          </Button>
        </div>
      )}
      {ConfirmUI}
    </div>
  )
}
