import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { BUILTIN_TITLE_SHAPES } from '../../../convex/lib/builtinTitleShapes'
import { Badge, Button, Input, Spinner } from '@/components/ui'
import { useConfirm } from '@/components/shared/useConfirm'

// Title shapes & templates management (extracted from Scripts Pro's titles
// page; reuses the same Convex functions — Scripts Pro itself is untouched).
export function TitleShapesSettings({ channelId }: { channelId: Id<'channels'> }) {
  const shapes = useQuery(api.titles.listShapes, { channelId })
  const templates = useQuery(api.titles.listTemplates, { channelId })
  const createShape = useMutation(api.titles.createShape)
  const removeShape = useMutation(api.titles.removeShape)
  const createTemplate = useMutation(api.titles.createTemplate)
  const removeTemplate = useMutation(api.titles.removeTemplate)
  const { confirm, ConfirmUI } = useConfirm()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [newShapeName, setNewShapeName] = useState('')
  const [newShapeTagline, setNewShapeTagline] = useState('')
  const [newTemplate, setNewTemplate] = useState({ pattern: '', exampleTitle: '' })

  if (!shapes || !templates) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner size={14} /> Loading title shapes…
      </div>
    )
  }

  const templatesForShape = (shapeId: string) => templates.filter((t) => t.shapeId === shapeId)
  const unsorted = templates.filter((t) => !shapes.some((s) => s._id === t.shapeId))

  const addShape = async () => {
    if (!newShapeName.trim()) return
    await createShape({
      channelId,
      name: newShapeName.trim(),
      tagline: newShapeTagline.trim(),
      mechanism: '',
      whatMakesItWork: [],
      whatUnderminesIt: [],
    })
    setNewShapeName('')
    setNewShapeTagline('')
  }

  const confirmRemoveShape = async (shape: Doc<'titleShapes'>) => {
    const ok = await confirm({
      title: `Delete shape “${shape.name}”?`,
      message: 'Its templates are kept and become unsorted.',
      confirmLabel: 'Delete',
    })
    if (ok) await removeShape({ channelId, shapeId: shape._id })
  }

  const confirmRemoveTemplate = async (template: Doc<'titleTemplates'>) => {
    const ok = await confirm({
      title: 'Delete this template?',
      message: `“${template.pattern}” is permanently removed.`,
      confirmLabel: 'Delete',
    })
    if (ok) await removeTemplate({ channelId, templateId: template._id })
  }

  const addTemplate = async (shapeId: string) => {
    if (!newTemplate.pattern.trim()) return
    await createTemplate({
      channelId,
      shapeId,
      pattern: newTemplate.pattern,
      exampleTitle: newTemplate.exampleTitle.trim() || undefined,
    })
    setNewTemplate({ pattern: '', exampleTitle: '' })
  }

  const renderTemplateGroup = (shapeId: string) => (
    <div className="flex flex-col gap-2 border-t border-border-subtle px-4 py-3">
      {templatesForShape(shapeId).map((template) => (
        <div key={template._id} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-text-primary">{template.pattern}</div>
            {template.exampleTitle && (
              <div className="mt-0.5 text-xs text-text-muted">e.g. {template.exampleTitle}</div>
            )}
          </div>
          <button
            aria-label="Delete template"
            onClick={() => void confirmRemoveTemplate(template)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {templatesForShape(shapeId).length === 0 && (
        <div className="text-xs text-text-muted">No templates in this shape yet.</div>
      )}
      <div className="mt-1 flex flex-col gap-2">
        <Input
          placeholder="New template pattern, e.g. The {mistake} that’s killing your {outcome}"
          value={newTemplate.pattern}
          onChange={(e) => setNewTemplate((p) => ({ ...p, pattern: e.target.value }))}
        />
        <div className="flex gap-2">
          <Input
            placeholder="Example title (optional)"
            value={newTemplate.exampleTitle}
            onChange={(e) => setNewTemplate((p) => ({ ...p, exampleTitle: e.target.value }))}
            className="flex-1"
          />
          <Button
            variant="secondary"
            disabled={!newTemplate.pattern.trim()}
            onClick={() => void addTemplate(shapeId)}
          >
            <Plus size={14} />
            Add
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        The template library the Generate-titles step draws from: the built-in shape library
        (from Scripts Pro) plus this channel's custom shapes. Generation uses all of it.
      </p>

      <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
        Built-in shapes
      </div>
      {BUILTIN_TITLE_SHAPES.map((shape) => {
        const isOpen = expanded === shape.id
        return (
          <div key={shape.id} className="rounded-panel border border-border bg-surface">
            <button
              onClick={() => setExpanded(isOpen ? null : shape.id)}
              className="flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left"
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <ChevronDown size={15} className="shrink-0 text-text-muted" />
              ) : (
                <ChevronRight size={15} className="shrink-0 text-text-muted" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">{shape.name}</span>
                  <Badge variant="primary">built-in</Badge>
                  <Badge variant="muted">{shape.templates.length} templates</Badge>
                </div>
                <div className="mt-0.5 truncate text-xs text-text-secondary">{shape.tagline}</div>
              </div>
            </button>
            {isOpen && (
              <div className="flex flex-col gap-2.5 border-t border-border-subtle px-4 py-3">
                {shape.templates.map((template, index) => (
                  <div key={index} className="min-w-0">
                    <div className="text-sm text-text-primary">{template.text}</div>
                    <div className="mt-0.5 text-xs text-text-muted">e.g. {template.example}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div className="mt-2 text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
        Custom shapes
      </div>
      {shapes.length === 0 && (
        <p className="text-xs text-text-muted">No custom shapes yet — add one below.</p>
      )}
      {shapes.map((shape) => {
        const isOpen = expanded === shape._id
        const count = templatesForShape(shape._id).length
        return (
          <div key={shape._id} className="rounded-panel border border-border bg-surface">
            <div className="flex items-center">
              <button
                onClick={() => setExpanded(isOpen ? null : shape._id)}
                className="flex min-h-13 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                aria-expanded={isOpen}
              >
                {isOpen ? (
                  <ChevronDown size={15} className="shrink-0 text-text-muted" />
                ) : (
                  <ChevronRight size={15} className="shrink-0 text-text-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-text-primary">{shape.name}</span>
                    <Badge variant="muted">{count} template{count === 1 ? '' : 's'}</Badge>
                  </div>
                  {shape.tagline && (
                    <div className="mt-0.5 truncate text-xs text-text-secondary">{shape.tagline}</div>
                  )}
                </div>
              </button>
              <button
                aria-label={`Delete shape ${shape.name}`}
                onClick={() => void confirmRemoveShape(shape)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {isOpen && renderTemplateGroup(shape._id)}
          </div>
        )
      })}

      {unsorted.length > 0 && (
        <div className="rounded-panel border border-border bg-surface">
          <div className="px-4 py-3 text-sm font-medium text-text-secondary">
            Unsorted templates ({unsorted.length})
          </div>
          <div className="flex flex-col gap-2 border-t border-border-subtle px-4 py-3">
            {unsorted.map((template) => (
              <div key={template._id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1 text-sm text-text-primary">{template.pattern}</div>
                <button
                  aria-label="Delete template"
                  onClick={() => void confirmRemoveTemplate(template)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-4">
        <div className="text-sm font-medium text-text-secondary">New shape</div>
        <Input
          placeholder="Shape name, e.g. Costly Mistake"
          value={newShapeName}
          onChange={(e) => setNewShapeName(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            placeholder="Tagline (optional)"
            value={newShapeTagline}
            onChange={(e) => setNewShapeTagline(e.target.value)}
            className="flex-1"
          />
          <Button variant="secondary" disabled={!newShapeName.trim()} onClick={() => void addShape()}>
            <Plus size={14} />
            Add
          </Button>
        </div>
      </div>
      {ConfirmUI}
    </div>
  )
}
