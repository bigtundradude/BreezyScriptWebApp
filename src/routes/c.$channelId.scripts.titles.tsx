import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, Copy, Inbox, Plus, Trash2, Type } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  MegapromptPanel,
  Modal,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'
import {
  composeTitleMinePrompt,
  parseJsonLenient,
  toMegaprompt,
  type TitleMineResult,
} from '@/lib/megaprompt'
import {
  BUILTIN_TITLE_SHAPES,
  type BuiltinTitleShape,
} from '@/features/scripts/lib/titleShapes'

export const Route = createFileRoute('/c/$channelId/scripts/titles')({
  validateSearch: (search: Record<string, unknown>): { shape?: string } => ({
    shape: typeof search.shape === 'string' ? search.shape : undefined,
  }),
  component: TitlesPage,
})

function TitlesPage() {
  const { channelId } = Route.useParams()
  const { shape } = Route.useSearch()
  const cid = channelId as Id<'channels'>
  const shapes = useQuery(api.titles.listShapes, { channelId: cid })
  const templates = useQuery(api.titles.listTemplates, { channelId: cid })

  if (shapes === undefined || templates === undefined) {
    return (
      <div className="flex items-center gap-2 px-4 py-5 md:px-8 md:py-7 text-sm text-text-muted">
        <Spinner size={14} /> Loading…
      </div>
    )
  }

  return shape ? (
    <ShapeDetail channelId={cid} shapeId={shape} customShapes={shapes} templates={templates} />
  ) : (
    <ShapeGrid channelId={cid} customShapes={shapes} templates={templates} />
  )
}

function ShapeGrid({
  channelId,
  customShapes,
  templates,
}: {
  channelId: Id<'channels'>
  customShapes: Doc<'titleShapes'>[]
  templates: Doc<'titleTemplates'>[]
}) {
  const navigate = useNavigate()
  const applyMine = useMutation(api.titles.applyMine)
  const createShape = useMutation(api.titles.createShape)
  const [mineInput, setMineInput] = useState('')
  const [mineMessage, setMineMessage] = useState('')
  const [creatingShape, setCreatingShape] = useState(false)
  const [shapeName, setShapeName] = useState('')
  const [shapeTagline, setShapeTagline] = useState('')
  const [shapeMechanism, setShapeMechanism] = useState('')

  const unsortedCount = templates.filter((t) => t.shapeId === '').length
  const countFor = (id: string) => templates.filter((t) => t.shapeId === id).length
  const openShape = (id: string) =>
    void navigate({ to: '.', search: { shape: id } })

  return (
    <div className="flex flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Title shapes</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Proven title mechanics. Mined templates feed every packaging prompt, ranked by what
            performs.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setCreatingShape(true)}>
          <Plus size={14} />
          Custom shape
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
        {BUILTIN_TITLE_SHAPES.map((s) => (
          <Card key={s.id} onClick={() => openShape(s.id)} padding={14}>
            <div className="flex items-center gap-2">
              <Type size={14} className="text-tool-script" />
              <span className="text-sm font-semibold text-text-primary">{s.name}</span>
              {countFor(s.id) > 0 && <Badge variant="muted">{countFor(s.id)} mined</Badge>}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
              {s.tagline}
            </p>
          </Card>
        ))}
        {customShapes.map((s) => (
          <Card key={s._id} onClick={() => openShape(s._id)} padding={14}>
            <div className="flex items-center gap-2">
              <Type size={14} className="text-accent-purple" />
              <span className="text-sm font-semibold text-text-primary">{s.name}</span>
              <Badge variant="muted">custom</Badge>
              {countFor(s._id) > 0 && <Badge variant="muted">{countFor(s._id)}</Badge>}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
              {s.tagline}
            </p>
          </Card>
        ))}
        <Card onClick={() => openShape('unsorted')} padding={14}>
          <div className="flex items-center gap-2">
            <Inbox size={14} className="text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">Unsorted</span>
            <Badge variant={unsortedCount > 0 ? 'warning' : 'muted'}>{unsortedCount}</Badge>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
            Freshly mined templates waiting to be assigned a shape.
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Mine templates from outlier titles
        </div>
        <Textarea
          rows={5}
          placeholder={'One title per line, optionally with outlier strength:\nI Tested 5 Budget Stoves  8x\nThe 10-Item Winter Kit  5x'}
          value={mineInput}
          onChange={(e) => setMineInput(e.target.value)}
        />
        <MegapromptPanel
          what="title templates"
          disabled={!mineInput.trim()}
          hint={mineMessage || 'Mined templates land in Unsorted for you to file into shapes.'}
          getPrompt={async () => toMegaprompt(composeTitleMinePrompt(mineInput))}
          onApply={async (raw) => {
            const parsed = parseJsonLenient(raw) as TitleMineResult | null
            const mined = Array.isArray(parsed?.title_templates) ? parsed.title_templates : null
            if (!mined || mined.length === 0) {
              throw new Error(
                "Couldn't find title templates in the reply. Paste the model's entire ```json block and try Apply again.",
              )
            }
            const result = await applyMine({
              channelId,
              templates: mined.map((t) => ({
                pattern: String(t.pattern ?? ''),
                exampleSource: String(t.example_source ?? ''),
                triggers: Array.isArray(t.triggers) ? t.triggers.map(String) : [],
                structureNotes: String(t.structure_notes ?? ''),
                transferability: String(t.transferability ?? ''),
                whyItWorks: String(t.why_it_works ?? ''),
                outlierStrength: String(t.outlier_strength ?? ''),
              })),
            })
            const rejectedCount = Array.isArray(parsed?.rejected) ? parsed.rejected.length : 0
            setMineMessage(
              `Mined ${result.inserted} template${result.inserted === 1 ? '' : 's'} into Unsorted${rejectedCount ? ` (${rejectedCount} rejected by the model)` : ''}.`,
            )
          }}
        />
      </div>

      <Modal
        open={creatingShape}
        onClose={() => setCreatingShape(false)}
        title="New custom shape"
        footer={
          <Button
            disabled={!shapeName.trim()}
            onClick={() =>
              void createShape({
                channelId,
                name: shapeName,
                tagline: shapeTagline,
                mechanism: shapeMechanism,
                whatMakesItWork: [],
                whatUnderminesIt: [],
              }).then(() => {
                setCreatingShape(false)
                setShapeName('')
                setShapeTagline('')
                setShapeMechanism('')
              })
            }
          >
            Create shape
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Name" value={shapeName} onChange={(e) => setShapeName(e.target.value)} />
          <Input label="Tagline" value={shapeTagline} onChange={(e) => setShapeTagline(e.target.value)} />
          <Textarea
            label="Mechanism"
            rows={3}
            placeholder="Why this shape earns clicks."
            value={shapeMechanism}
            onChange={(e) => setShapeMechanism(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}

function ShapeDetail({
  channelId,
  shapeId,
  customShapes,
  templates,
}: {
  channelId: Id<'channels'>
  shapeId: string
  customShapes: Doc<'titleShapes'>[]
  templates: Doc<'titleTemplates'>[]
}) {
  const navigate = useNavigate()
  const createTemplate = useMutation(api.titles.createTemplate)
  const updateTemplate = useMutation(api.titles.updateTemplate)
  const removeTemplate = useMutation(api.titles.removeTemplate)
  const removeShape = useMutation(api.titles.removeShape)
  const [newPattern, setNewPattern] = useState('')
  const [deletingShape, setDeletingShape] = useState(false)
  const { confirm, ConfirmUI } = useConfirm()

  const confirmDeleteTemplate = async (template: Doc<'titleTemplates'>) => {
    const ok = await confirm({
      title: 'Delete this template?',
      message: `“${template.pattern}” is permanently removed${template.sortBoost !== 0 ? ', including its performance boost' : ''}.`,
      confirmLabel: 'Delete',
    })
    if (ok) await removeTemplate({ channelId, templateId: template._id })
  }

  const builtin: BuiltinTitleShape | undefined = BUILTIN_TITLE_SHAPES.find((s) => s.id === shapeId)
  const custom = customShapes.find((s) => s._id === shapeId)
  const isUnsorted = shapeId === 'unsorted'
  const shapeTemplates = templates.filter((t) => (isUnsorted ? t.shapeId === '' : t.shapeId === shapeId))

  const name = isUnsorted ? 'Unsorted' : (builtin?.name ?? custom?.name ?? 'Unknown shape')
  const tagline = builtin?.tagline ?? custom?.tagline ?? ''
  const mechanism = builtin?.mechanism ?? custom?.mechanism ?? ''

  const shapeOptions = [
    ...BUILTIN_TITLE_SHAPES.map((s) => ({ value: s.id, label: s.name })),
    ...customShapes.map((s) => ({ value: s._id as string, label: `${s.name} (custom)` })),
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-5 md:px-8 md:py-7">
      <div className="flex items-center gap-3">
        <button
          onClick={() => void navigate({ to: '.', search: { shape: undefined } })}
          className="flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={15} />
          Shapes
        </button>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">{name}</h2>
        {custom && (
          <Button variant="ghost" size="sm" onClick={() => setDeletingShape(true)}>
            <Trash2 size={13} className="text-danger" />
          </Button>
        )}
      </div>
      {tagline && <p className="text-sm text-text-secondary">{tagline}</p>}
      {mechanism && (
        <details className="rounded-row border border-border bg-surface p-3.5 text-sm text-text-secondary">
          <summary className="cursor-pointer text-sm font-medium text-text-primary">
            Why it works
          </summary>
          <p className="mt-2 leading-relaxed">{mechanism}</p>
          {builtin && builtin.whatWorks.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {builtin.whatWorks.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          {builtin && builtin.whatUndermines.length > 0 && (
            <>
              <div className="mt-2 text-xs font-semibold uppercase tracking-[0.05em] text-text-muted">
                What undermines it
              </div>
              <ul className="mt-1 list-disc pl-5">
                {builtin.whatUndermines.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </details>
      )}

      {builtin && (
        <div className="flex flex-col gap-2">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Built-in templates
          </div>
          {builtin.templates.map((template, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-row border border-border-subtle bg-surface px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-text-primary">{template.text}</div>
                {template.example && (
                  <div className="mt-0.5 truncate text-xs text-text-muted">e.g. {template.example}</div>
                )}
              </div>
              <button
                title="Add an editable copy"
                onClick={() =>
                  void createTemplate({
                    channelId,
                    pattern: template.text,
                    shapeId,
                    exampleTitle: template.example,
                    whyItWorks: template.why,
                    manual: true,
                  })
                }
                className="text-text-muted transition-colors hover:text-text-primary"
              >
                <Copy size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          {isUnsorted ? 'Waiting to be filed' : 'Your templates'}
        </div>
        {shapeTemplates.length === 0 ? (
          <EmptyState
            title={isUnsorted ? 'Nothing unsorted' : 'No templates here yet'}
            description={
              isUnsorted
                ? 'Mine outlier titles from the shapes screen to fill this bucket.'
                : 'Add one below, copy a built-in, or file mined templates from Unsorted.'
            }
          />
        ) : (
          shapeTemplates.map((template) => (
            <div
              key={template._id}
              className="flex flex-wrap items-center gap-3 rounded-row border border-border bg-surface px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-text-primary">{template.pattern}</span>
                  {!template.manual && <Badge variant="muted">mined</Badge>}
                  {template.sortBoost !== 0 && (
                    <Badge variant={template.sortBoost > 0 ? 'success' : 'danger'}>
                      {template.sortBoost > 0 ? `+${template.sortBoost}` : template.sortBoost}
                    </Badge>
                  )}
                </div>
                {template.whyItWorks && (
                  <div className="mt-0.5 line-clamp-1 text-xs text-text-muted">{template.whyItWorks}</div>
                )}
              </div>
              {isUnsorted && (
                <Select
                  options={shapeOptions}
                  value={null}
                  onChange={(target) =>
                    void updateTemplate({ channelId, templateId: template._id, shapeId: target })
                  }
                  placeholder="File into…"
                  className="w-44"
                />
              )}
              <button
                onClick={() => void confirmDeleteTemplate(template)}
                className="text-text-muted transition-colors hover:text-danger"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
        {!isUnsorted && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add a template pattern, e.g. “I Tested [N] [Products] So You Don’t Have To”"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPattern.trim()) {
                  void createTemplate({ channelId, pattern: newPattern, shapeId }).then(() =>
                    setNewPattern(''),
                  )
                }
              }}
              className="flex-1"
            />
            <Button
              variant="secondary"
              disabled={!newPattern.trim()}
              onClick={() =>
                void createTemplate({ channelId, pattern: newPattern, shapeId }).then(() =>
                  setNewPattern(''),
                )
              }
            >
              <Plus size={14} />
              Add
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deletingShape}
        onClose={() => setDeletingShape(false)}
        onConfirm={() => {
          if (!custom) return
          void removeShape({ channelId, shapeId: custom._id }).then(() =>
            navigate({ to: '.', search: { shape: undefined } }),
          )
        }}
        title={`Delete “${custom?.name}”?`}
        message="Its templates are kept and move to Unsorted."
        confirmLabel="Delete shape"
      />
      {ConfirmUI}
    </div>
  )
}
