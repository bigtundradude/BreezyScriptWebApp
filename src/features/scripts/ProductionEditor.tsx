import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ArrowDown, ArrowUp, ChevronLeft, History, MonitorPlay, Plus, Star, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import {
  Badge,
  Button,
  Input,
  MegapromptPanel,
  Modal,
  Spinner,
  Textarea,
} from '@/components/ui'
import { Tabs } from '@/components/ui/Tabs'
import { useAutosave } from '@/components/shared/useAutosave'
import { useConfirm } from '@/components/shared/useConfirm'
import { MarkdownEditor } from './MarkdownEditor'
import { ScriptPreview } from './ScriptPreview'
import { SecondBrainPicker } from './SecondBrainPicker'
import { usePromptContext } from './usePromptContext'
import {
  classifyInterviewAnswers,
  composeDraftPrompt,
  composeMetadataPrompt,
  composePackagePrompt,
  computeDraftBudget,
  parseJsonLenient,
  serializeBrainDump,
  thumbnailBrief,
  toDraftMegaprompt,
  toMegaprompt,
  type DraftPromptOpts,
  type InterviewAnswer,
  type PackageResult,
  type MetadataResult,
  type TitleShapeGuide,
  type PromptContext,
} from '@/lib/megaprompt'
import { BUILTIN_TITLE_SHAPES, builtinTemplatesForShape } from './lib/titleShapes'
import { formatDate } from '@/lib/utils'

type TabId = 'package' | 'interview' | 'material' | 'script' | 'metadata'
type Production = Doc<'productions'>

// The user sets one thing: target minutes (default 8). The format bucket the
// prompts need (FORMAT: line + per-format output budgets) is derived from it —
// no second length control in the UI.
function minutesToFormat(minutes: number): Production['format'] {
  if (minutes <= 2) return 'shorts'
  if (minutes <= 12) return 'medium'
  if (minutes <= 30) return 'long'
  return 'podcast'
}

const DEFAULT_MINUTES = 8

export function ProductionEditor({
  channelId,
  productionId,
  tab,
  onTabChange,
}: {
  channelId: Id<'channels'>
  productionId: Id<'productions'>
  tab: TabId
  onTabChange: (tab: TabId) => void
}) {
  const production = useQuery(api.productions.get, { channelId, productionId })
  const update = useMutation(api.productions.update)
  const setStatus = useMutation(api.productions.setStatus)
  const ctx = usePromptContext(channelId)
  const navigate = useNavigate()

  // Local state for the autosaved long-form fields; server doc owns the rest.
  const [name, setName] = useState<string | null>(null)
  const [minutes, setMinutes] = useState<number | null>(null)
  const [interview, setInterview] = useState<InterviewAnswer[] | null>(null)
  const [draft, setDraft] = useState<string | null>(null)

  const autosave = useAutosave<{
    name: string
    format: Production['format']
    targetMinutes: number
    interview: InterviewAnswer[]
    draftMarkdown: string
  }>(async (patch) => {
    // The megaprompt lib types interview.type as string; the schema narrows it
    // to the literal union — values always come from that union.
    await update({
      channelId,
      productionId,
      ...patch,
      interview: patch.interview as Production['interview'] | undefined,
    })
  })

  useEffect(() => {
    if (!production) return
    if (name === null) setName(production.name)
    if (minutes === null) {
      setMinutes(production.targetMinutes || DEFAULT_MINUTES)
      // One-time repair for docs created before the minutes-drives-format change
      // (they carry targetMinutes 0 / a hand-picked format).
      if (production.targetMinutes === 0) {
        autosave.patch({
          targetMinutes: DEFAULT_MINUTES,
          format: minutesToFormat(DEFAULT_MINUTES),
        })
      }
    }
    if (interview === null) setInterview(production.interview)
    if (draft === null) setDraft(production.draftMarkdown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [production])

  // Cmd/Ctrl+S = flush pending autosaves immediately.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void autosave.flush()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [autosave])

  if (production === null) {
    return <div className="px-4 py-5 md:px-8 md:py-7 text-sm text-danger">Production not found. It may have been deleted.</div>
  }
  if (production === undefined || name === null || interview === null || draft === null || minutes === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={18} />
      </div>
    )
  }

  const go = (next: TabId) => {
    void autosave.flush()
    onTabChange(next)
  }

  const mainTitle =
    production.chosenTitles.find((t) => t.main)?.text ||
    production.concept.workingTitle ||
    name

  const tabDefs = [
    {
      id: 'package',
      label: 'Package',
      done: production.chosenTitles.length > 0 && Boolean(production.chosenThumbnail),
    },
    { id: 'interview', label: 'Interview', done: interview.some((b) => b.a.trim() !== '') },
    { id: 'material', label: 'Second Brain' },
    { id: 'script', label: 'Script', done: draft.trim() !== '' },
    { id: 'metadata', label: 'Metadata', done: production.metadata.tags.length > 0, disabled: !draft.trim() },
  ]

  const tabOrder: TabId[] = ['package', 'interview', 'material', 'script', 'metadata']
  const tabIndex = tabOrder.indexOf(tab)

  const ready = async () => {
    await autosave.flush()
    await setStatus({ channelId, productionId, status: 'ready' })
    void navigate({ to: `/c/${channelId}/scripts/review/${productionId}` })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4 md:px-8 md:pt-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            onClick={() => {
              void autosave.flush()
              void navigate({ to: `/c/${channelId}/scripts/build` })
            }}
            className="flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            <ChevronLeft size={15} />
            Build
          </button>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              autosave.patch({ name: e.target.value })
            }}
            onBlur={() => void autosave.flush()}
            className="min-w-40 max-w-100 flex-1"
          />
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-xs text-text-secondary">Minimum length</span>
            <Input
              type="number"
              min={1}
              value={minutes === 0 ? '' : String(minutes)}
              title="Target spoken length in minutes — sets the word target in the draft prompt and the pacing meter"
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  setMinutes(0) // show empty while editing; blur restores the default
                  return
                }
                const next = Math.max(1, Math.round(Number(raw) || 0))
                setMinutes(next)
                autosave.patch({ targetMinutes: next, format: minutesToFormat(next) })
              }}
              onBlur={() => {
                if (minutes === 0) {
                  setMinutes(DEFAULT_MINUTES)
                  autosave.patch({
                    targetMinutes: DEFAULT_MINUTES,
                    format: minutesToFormat(DEFAULT_MINUTES),
                  })
                }
                void autosave.flush()
              }}
              className="w-20"
            />
            <span className="whitespace-nowrap text-xs text-text-secondary">minutes</span>
          </div>
          {autosave.status === 'error' && (
            <Badge variant="danger" title="A save failed — it will retry on the next change or flush">
              save failed, retrying
            </Badge>
          )}
        </div>
        <Tabs flow tabs={tabDefs} active={tab} onChange={(id) => go(id as TabId)} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-5">
        {tab === 'package' && ctx && (
          <PackageTab
            channelId={channelId}
            production={production}
            ctx={ctx}
            mainTitleFallback={name}
            beforeApply={() => autosave.flush()}
            onInterviewSynced={(next) => setInterview(next)}
          />
        )}
        {tab === 'interview' && ctx && (
          <InterviewTab
            ctx={ctx}
            production={production}
            interview={interview}
            draft={draft}
            minutes={minutes}
            mainTitle={mainTitle}
            setInterview={(next) => {
              setInterview(next)
              autosave.patch({ interview: next })
            }}
            flush={() => void autosave.flush()}
          />
        )}
        {tab === 'material' && (
          <SecondBrainPicker
            channelId={channelId}
            interview={interview}
            onAdd={(block) => {
              const next = [...interview, block]
              setInterview(next)
              autosave.patch({ interview: next })
              void autosave.flush()
            }}
            onRemove={(id) => {
              const next = interview.filter((b) => b.id !== id)
              setInterview(next)
              autosave.patch({ interview: next })
              void autosave.flush()
            }}
          />
        )}
        {tab === 'script' && ctx && (
          <ScriptTab
            channelId={channelId}
            productionId={productionId}
            ctx={ctx}
            production={production}
            interview={interview}
            minutes={minutes}
            mainTitle={mainTitle}
            draft={draft}
            setDraft={(next) => {
              setDraft(next)
              autosave.patch({ draftMarkdown: next })
            }}
            onDraftReplaced={(next) => {
              setDraft(next)
            }}
            flush={() => autosave.flush()}
          />
        )}
        {tab === 'metadata' && ctx && (
          <MetadataTab
            channelId={channelId}
            productionId={productionId}
            ctx={ctx}
            production={production}
            draft={draft}
            mainTitle={mainTitle}
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3 md:px-8">
        <Button
          variant="secondary"
          size="sm"
          disabled={tabIndex === 0}
          onClick={() => go(tabOrder[tabIndex - 1])}
        >
          ← {tabIndex > 0 ? tabDefs[tabIndex - 1].label : ''}
        </Button>
        {tab === 'metadata' || (tab === 'script' && !draft.trim()) ? (
          <Button size="sm" disabled={!draft.trim()} onClick={() => void ready()}>
            Ready for production
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={tabIndex === tabOrder.length - 1 || Boolean(tabDefs[tabIndex + 1]?.disabled)}
            onClick={() => go(tabOrder[tabIndex + 1])}
          >
            {tabDefs[tabIndex + 1]?.label} →
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Package tab ────────────────────────────────────────────────────────────────

function PackageTab({
  channelId,
  production,
  ctx,
  mainTitleFallback,
  beforeApply,
  onInterviewSynced,
}: {
  channelId: Id<'channels'>
  production: Production
  ctx: PromptContext
  mainTitleFallback: string
  /** flush pending autosaves so the apply can't race a stale interview patch */
  beforeApply: () => Promise<void>
  /** re-sync the parent's local interview with the server-seeded questions */
  onInterviewSynced: (next: InterviewAnswer[]) => void
}) {
  const update = useMutation(api.productions.update)
  const applyPackage = useMutation(api.productions.applyPackage)
  const customShapes = useQuery(api.titles.listShapes, { channelId })
  const templates = useQuery(api.titles.listTemplates, { channelId })
  const [targetShapes, setTargetShapes] = useState<string[]>([])

  const shapeGuides = (): TitleShapeGuide[] =>
    targetShapes.map((shapeId) => {
      const builtin = BUILTIN_TITLE_SHAPES.find((s) => s.id === shapeId)
      const custom = (customShapes ?? []).find((s) => s._id === shapeId)
      const userPatterns = (templates ?? [])
        .filter((t) => t.shapeId === shapeId)
        .map((t) => t.pattern)
      const builtinPatterns = builtin ? builtinTemplatesForShape(shapeId).map((t) => t.text) : []
      return {
        name: builtin?.name ?? custom?.name ?? '',
        mechanism: builtin?.mechanism ?? custom?.mechanism ?? '',
        patterns: [...userPatterns, ...builtinPatterns].slice(0, 10),
      }
    })

  const chosen = production.chosenTitles
  const setChosen = (next: { text: string; main: boolean }[]) =>
    void update({ channelId, productionId: production._id, chosenTitles: next })

  const toggleTitle = (text: string) => {
    if (chosen.some((t) => t.text === text)) {
      const next = chosen.filter((t) => t.text !== text)
      if (next.length > 0 && !next.some((t) => t.main)) next[0] = { ...next[0], main: true }
      setChosen(next)
    } else if (chosen.length < 3) {
      setChosen([...chosen, { text, main: chosen.length === 0 }])
    }
  }
  const setMain = (text: string) =>
    setChosen(chosen.map((t) => ({ ...t, main: t.text === text })))

  const allShapes = [
    ...BUILTIN_TITLE_SHAPES.map((s) => ({ id: s.id, name: s.name })),
    ...(customShapes ?? []).map((s) => ({ id: s._id as string, name: s.name })),
  ]

  return (
    <div className="flex max-w-200 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Target title shapes (optional)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allShapes.map((shape) => (
            <button
              key={shape.id}
              onClick={() =>
                setTargetShapes((prev) =>
                  prev.includes(shape.id) ? prev.filter((s) => s !== shape.id) : [...prev, shape.id],
                )
              }
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                targetShapes.includes(shape.id)
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface text-text-secondary hover:bg-surface-raised'
              }`}
            >
              {shape.name}
            </button>
          ))}
        </div>
      </div>

      <MegapromptPanel
        what="the packaging"
        hint="One prompt produces title candidates, thumbnail briefs, a working description, and your interview questions."
        getPrompt={async () =>
          toMegaprompt(
            composePackagePrompt(ctx, {
              workingTitle: production.concept.workingTitle || mainTitleFallback,
              descriptionAngle: production.concept.descriptionAngle,
              shapes: targetShapes.length > 0 ? shapeGuides() : undefined,
            }),
          )
        }
        onApply={async (raw) => {
          const parsed = parseJsonLenient(raw) as PackageResult | null
          if (!parsed || !Array.isArray(parsed.titles) || parsed.titles.length === 0) {
            throw new Error(
              "Couldn't find packaging in the reply. Paste the model's entire ```json block and try Apply again.",
            )
          }
          if (!parsed.description || typeof parsed.description !== 'object') {
            throw new Error('The reply is missing a description.')
          }
          await beforeApply()
          const applied = await applyPackage({
            channelId,
            productionId: production._id,
            titleCandidates: parsed.titles,
            thumbnailCandidates: Array.isArray(parsed.thumbnails) ? parsed.thumbnails : [],
            description: {
              firstLine: String(parsed.description.first_line ?? ''),
              body: String(parsed.description.body ?? ''),
              notes: parsed.description.notes ? String(parsed.description.notes) : undefined,
            },
            questions: (Array.isArray(parsed.questions) ? parsed.questions : []).map((q) => ({
              type: 'informative',
              facet: '',
              q: String(q.q ?? ''),
            })),
          })
          onInterviewSynced(applied.interview as InterviewAnswer[])
        }}
      />

      {production.titleCandidates.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Title candidates — pick up to 3, star the main one
          </div>
          {(production.titleCandidates as Array<{ text?: string; rationale?: string }>).map(
            (candidate, i) => {
              const text = String(candidate.text ?? '')
              const isChosen = chosen.some((t) => t.text === text)
              const isMain = chosen.some((t) => t.text === text && t.main)
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-row border px-4 py-2.5 transition-colors ${
                    isChosen ? 'border-primary bg-surface' : 'border-border bg-surface'
                  }`}
                >
                  <button
                    onClick={() => toggleTitle(text)}
                    className={`min-w-0 flex-1 text-left text-sm ${isChosen ? 'font-medium text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {text}
                  </button>
                  {isChosen && (
                    <button
                      title="Main title — frames the script"
                      onClick={() => setMain(text)}
                      className="shrink-0"
                    >
                      <Star
                        size={15}
                        className={isMain ? 'fill-warning text-warning' : 'text-text-muted hover:text-warning'}
                      />
                    </button>
                  )}
                </div>
              )
            },
          )}
        </div>
      )}

      {production.thumbnailCandidates.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Thumbnail briefs — pick one
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5">
            {(production.thumbnailCandidates as Array<Record<string, unknown>>).map((thumb, i) => {
              const isChosen =
                JSON.stringify(production.chosenThumbnail) === JSON.stringify(thumb)
              return (
                <button
                  key={i}
                  onClick={() =>
                    void update({ channelId, productionId: production._id, chosenThumbnail: thumb })
                  }
                  className={`rounded-row border p-3.5 text-left transition-colors ${
                    isChosen ? 'border-primary bg-primary-subtle/30' : 'border-border bg-surface hover:bg-surface-raised'
                  }`}
                >
                  <div className="text-sm font-medium text-text-primary">
                    {String(thumb.direction ?? `Concept ${i + 1}`)}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {String(thumb.depicts ?? '')}
                  </p>
                  {typeof thumb.text_overlay === 'string' && thumb.text_overlay && (
                    <div className="mt-1.5 text-xs text-text-muted">Overlay: {thumb.text_overlay}</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Interview tab ──────────────────────────────────────────────────────────────

function InterviewTab({
  ctx,
  production,
  interview,
  draft,
  minutes,
  mainTitle,
  setInterview,
  flush,
}: {
  ctx: PromptContext
  production: Production
  interview: InterviewAnswer[]
  draft: string
  minutes: number
  mainTitle: string
  setInterview: (next: InterviewAnswer[]) => void
  flush: () => void
}) {
  const questions = interview.filter((b) => b.type !== 'second_brain')
  const [budget, setBudget] = useState<{ statuses: Map<string, 'full' | 'partial' | 'cut' | 'empty'>; dumpTokens: number; budgetTokens: number } | null>(null)

  const draftOpts: DraftPromptOpts = useMemo(
    () => ({
      // Derive from LOCAL minutes, not the server doc — pre-change docs carry a
      // stale format, and a just-edited value must not race the autosave write.
      format: minutesToFormat(minutes > 0 ? minutes : DEFAULT_MINUTES),
      chosenTitle: mainTitle,
      descriptionAngle: production.concept.descriptionAngle,
      thumbnailBrief: thumbnailBrief(production.chosenThumbnail as never),
      brainDump: serializeBrainDump(interview),
      titles: production.chosenTitles,
      targetMinutes: minutes > 0 ? minutes : DEFAULT_MINUTES,
    }),
    [production, interview, mainTitle, minutes],
  )
  void draft

  // Advisory budget meter — 800 ms debounce (desktop parity); never blocks.
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = computeDraftBudget(ctx, draftOpts)
      const statuses = classifyInterviewAnswers(
        interview.map((b) => ({ q: b.q, a: b.a })),
        result.cutoffChar,
      )
      const map = new Map<string, 'full' | 'partial' | 'cut' | 'empty'>()
      statuses.forEach((s) => {
        const block = interview[s.index]
        if (block) map.set(block.id, s.status)
      })
      setBudget({ statuses: map, dumpTokens: result.dumpTokens, budgetTokens: result.budgetTokens })
    }, 800)
    return () => clearTimeout(timer)
  }, [ctx, draftOpts, interview])

  const move = (id: string, dir: -1 | 1) => {
    const index = interview.findIndex((b) => b.id === id)
    const target = index + dir
    if (index < 0 || target < 0 || target >= interview.length) return
    const next = [...interview]
    ;[next[index], next[target]] = [next[target], next[index]]
    setInterview(next)
    flush()
  }

  const setAnswer = (id: string, answer: string) =>
    setInterview(interview.map((b) => (b.id === id ? { ...b, a: answer } : b)))

  const { confirm, ConfirmUI } = useConfirm()
  const removeBlock = async (id: string) => {
    const block = interview.find((b) => b.id === id)
    // Empty questions remove instantly; a written answer gets a confirm (CLAUDE.md rule).
    if (block && block.a.trim()) {
      const ok = await confirm({
        title: 'Remove this question?',
        message: 'Your written answer is discarded with it. This can’t be undone.',
        confirmLabel: 'Remove',
      })
      if (!ok) return
    }
    setInterview(interview.filter((b) => b.id !== id))
    flush()
  }

  const addManual = () => {
    setInterview([
      ...interview,
      { id: crypto.randomUUID(), type: 'manual', facet: '', q: 'Note to self', a: '' },
    ])
  }

  const overBudget = budget && budget.dumpTokens > budget.budgetTokens

  return (
    <div className="flex max-w-200 flex-col gap-4">
      {questions.length === 0 ? (
        <div className="rounded-row border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          No interview questions yet — apply the Package prompt first, or add your own below. This is
          the brain dump the script is written from: answer in your own words, mess is fine.
        </div>
      ) : (
        <>
          {budget && (
            <div
              className={`flex items-center gap-2 rounded-row border px-4 py-2 text-xs ${
                overBudget ? 'border-warning/40 bg-warning/8 text-warning' : 'border-border bg-surface text-text-muted'
              }`}
            >
              Brain dump ≈{budget.dumpTokens} tokens of {budget.budgetTokens} available
              {overBudget && ' — later answers get trimmed first; reorder to protect the good stuff.'}
            </div>
          )}
          {questions.map((block) => {
            const status = budget?.statuses.get(block.id)
            return (
              <div key={block.id} className="flex flex-col gap-1.5 rounded-row border border-border bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">{block.q}</span>
                  {status === 'partial' && <Badge variant="warning">partially trimmed</Badge>}
                  {status === 'cut' && <Badge variant="danger">won't fit</Badge>}
                  <button onClick={() => move(block.id, -1)} className="text-text-muted hover:text-text-primary">
                    <ArrowUp size={13} />
                  </button>
                  <button onClick={() => move(block.id, 1)} className="text-text-muted hover:text-text-primary">
                    <ArrowDown size={13} />
                  </button>
                  <button onClick={() => void removeBlock(block.id)} className="text-text-muted hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                </div>
                <Textarea
                  bare
                  rows={2}
                  placeholder="Answer in your own words — mess is fine, it's material."
                  value={block.a}
                  onChange={(e) => setAnswer(block.id, e.target.value)}
                  onBlur={flush}
                  className="[&>textarea]:min-h-16 [&>textarea]:[field-sizing:content]"
                />
              </div>
            )
          })}
        </>
      )}
      <Button variant="secondary" size="sm" className="self-start" onClick={addManual}>
        <Plus size={13} />
        Add your own question
      </Button>
      {ConfirmUI}
    </div>
  )
}

// ─── Script tab ─────────────────────────────────────────────────────────────────

function ScriptTab({
  channelId,
  productionId,
  ctx,
  production,
  interview,
  minutes,
  mainTitle,
  draft,
  setDraft,
  onDraftReplaced,
  flush,
}: {
  channelId: Id<'channels'>
  productionId: Id<'productions'>
  ctx: PromptContext
  production: Production
  interview: InterviewAnswer[]
  minutes: number
  mainTitle: string
  draft: string
  setDraft: (next: string) => void
  onDraftReplaced: (next: string) => void
  flush: () => Promise<void>
}) {
  const applyDraft = useMutation(api.productions.applyDraft)
  const restoreSnapshot = useMutation(api.productions.restoreSnapshot)
  const snapshots = useQuery(api.productions.listSnapshots, { channelId, productionId })
  const { confirm, ConfirmUI } = useConfirm()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [teleprompterOpen, setTeleprompterOpen] = useState(false)

  const draftOpts = (): DraftPromptOpts => ({
    format: production.format,
    chosenTitle: mainTitle,
    descriptionAngle: production.concept.descriptionAngle,
    thumbnailBrief: thumbnailBrief(production.chosenThumbnail as never),
    brainDump: serializeBrainDump(interview),
    titles: production.chosenTitles,
    targetMinutes: minutes,
  })

  const words = draft.split(/\s+/).filter(Boolean).length
  const spokenMinutes = words > 0 ? Math.round((words / ctx.wordsPerMinute) * 10) / 10 : 0
  const targetMinutes = minutes > 0 ? minutes : DEFAULT_MINUTES
  const floorWords = targetMinutes * ctx.wordsPerMinute

  // Pre-flight material check: a script can't honestly be longer than the raw
  // material supports. Warn before the prompt is even run (advisory, never blocks).
  // Memoized — this component re-renders on every draft keystroke.
  const dumpWords = useMemo(
    () => serializeBrainDump(interview).split(/\s+/).filter(Boolean).length,
    [interview],
  )
  const thinMaterial = dumpWords < floorWords * 0.5

  return (
    <div className="flex max-w-200 flex-col gap-4">
      {thinMaterial && (
        <div className="rounded-row border border-warning/40 bg-warning/8 px-4 py-2.5 text-sm text-text-secondary">
          <span className="font-medium text-warning">Thin material:</span> your brain dump is ~
          {dumpWords.toLocaleString()} words for a ≥{floorWords.toLocaleString()}-word script. The
          draft will likely run short or flag [NEED MORE MATERIAL] — add stories and examples in
          Interview, or pull notes in the Second Brain tab.
        </div>
      )}
      <MegapromptPanel
        what="the script"
        hint="The whole pipeline in one prompt: identity, persona, packaging, structure, and your brain dump."
        getPrompt={async () => {
          await flush()
          const composed = composeDraftPrompt(ctx, draftOpts())
          return toDraftMegaprompt(composed.system, composed.user)
        }}
        onApply={async (raw) => {
          if (!raw.trim()) return
          if (draft.trim()) {
            const ok = await confirm({
              title: 'Replace the current draft?',
              message:
                "Applying replaces the current draft, including any edits you made. The outgoing draft is snapshotted — you can restore it from History.",
              confirmLabel: 'Replace draft',
            })
            if (!ok) return false
          }
          await flush()
          await applyDraft({ channelId, productionId, draftMarkdown: raw.trim() })
          onDraftReplaced(raw.trim())
        }}
      />

      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted">
          {words.toLocaleString()} words · ~{spokenMinutes} min at {ctx.wordsPerMinute} wpm
          {` · minimum ${targetMinutes} min`}
        </span>
        {words > 0 && (
          // Floor semantics: under the minimum warns; anywhere above it is fine
          // (mild note past +30%, matching the prompt's aim range).
          <Badge
            variant={
              spokenMinutes < targetMinutes
                ? 'warning'
                : spokenMinutes > targetMinutes * 1.3
                  ? 'info'
                  : 'success'
            }
          >
            {spokenMinutes < targetMinutes
              ? 'under minimum'
              : spokenMinutes > targetMinutes * 1.3
                ? 'running long'
                : 'on target'}
          </Badge>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" disabled={!draft.trim()} onClick={() => setTeleprompterOpen(true)}>
          <MonitorPlay size={13} />
          Teleprompter
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
          <History size={13} />
          History{snapshots && snapshots.length > 0 ? ` (${snapshots.length})` : ''}
        </Button>
      </div>

      <MarkdownEditor
        value={draft}
        onChange={setDraft}
        onBlur={() => void flush()}
        placeholder="Paste your AI's script above, or start writing here."
        minRows={16}
      />

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Draft history" size="lg">
        {snapshots === undefined ? (
          <Spinner size={16} />
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No snapshots yet. One is taken automatically every time an applied draft replaces your
            text.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot._id}
                className="flex items-center gap-3 rounded-row border border-border bg-surface-raised px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    {formatDate(snapshot.createdAt)} · {snapshot.words.toLocaleString()} words ·{' '}
                    <Badge variant="muted">
                      {snapshot.reason === 'apply_replace' ? 'before apply' : 'before restore'}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{snapshot.preview}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void (async () => {
                      // Flush first so the pre-restore snapshot captures current
                      // edits, then re-sync the local editor with the restored text.
                      await flush()
                      const restored = await restoreSnapshot({
                        channelId,
                        productionId,
                        snapshotId: snapshot._id,
                      })
                      onDraftReplaced(restored)
                      setHistoryOpen(false)
                    })()
                  }}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
      <ScriptPreview text={draft} open={teleprompterOpen} onClose={() => setTeleprompterOpen(false)} />
      {ConfirmUI}
    </div>
  )
}

// ─── Metadata tab ───────────────────────────────────────────────────────────────

function MetadataTab({
  channelId,
  productionId,
  ctx,
  production,
  draft,
  mainTitle,
}: {
  channelId: Id<'channels'>
  productionId: Id<'productions'>
  ctx: PromptContext
  production: Production
  draft: string
  mainTitle: string
}) {
  const applyMetadata = useMutation(api.productions.applyMetadata)
  const metadata = production.metadata

  return (
    <div className="flex max-w-200 flex-col gap-4">
      <MegapromptPanel
        what="the metadata"
        hint="Description, chapters, and tags from the finished script — mirroring your starred description template."
        getPrompt={async () =>
          toMegaprompt(
            composeMetadataPrompt(
              ctx,
              mainTitle,
              thumbnailBrief(production.chosenThumbnail as never),
              draft,
            ),
          )
        }
        onApply={async (raw) => {
          const parsed = parseJsonLenient(raw) as MetadataResult | null
          if (!parsed?.description || typeof parsed.description !== 'object') {
            throw new Error(
              "Couldn't find metadata in the reply. Paste the model's entire ```json block and try Apply again.",
            )
          }
          await applyMetadata({
            channelId,
            productionId,
            metadata: {
              description: {
                firstLine: String(parsed.description.first_line ?? ''),
                body: String(parsed.description.body ?? ''),
                notes: parsed.description.notes ? String(parsed.description.notes) : undefined,
              },
              chapters: (Array.isArray(parsed.chapters) ? parsed.chapters : []).map((c) => ({
                timestamp: String(c.timestamp ?? ''),
                title: String(c.title ?? ''),
              })),
              tags: (Array.isArray(parsed.tags) ? parsed.tags : []).map(String),
            },
          })
        }}
      />

      {metadata.description && (
        <div className="rounded-row border border-border bg-surface p-4">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Description
          </div>
          <p className="mt-2 text-sm font-medium text-text-primary">{metadata.description.firstLine}</p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {metadata.description.body}
          </p>
        </div>
      )}
      {metadata.chapters.length > 0 && (
        <div className="rounded-row border border-border bg-surface p-4">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Chapters
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {metadata.chapters.map((chapter, i) => (
              <li key={i} className="text-sm text-text-secondary">
                <span className="font-mono text-xs text-text-muted">{chapter.timestamp}</span>{' '}
                {chapter.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      {metadata.tags.length > 0 && (
        <div className="rounded-row border border-border bg-surface p-4">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">Tags</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {metadata.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs text-text-secondary">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
