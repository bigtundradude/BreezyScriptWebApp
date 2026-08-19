import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Plus, Star, Trash2 } from 'lucide-react'
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
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import {
  composeCtaPrompt,
  composeVideoStructurePrompt,
  parseJsonLenient,
  toMegaprompt,
  type CtaResult,
  type VideoStructureResult,
} from '@/lib/megaprompt'
import { BUILTIN_STRUCTURES } from '@/features/scripts/lib/builtinStructures'

type LibKind = 'video_structure' | 'cta' | 'disclosure' | 'description'

const KIND_CONFIG: Record<
  string,
  { kinds: LibKind[]; title: string; description: string; allowLlm: boolean; what: string }
> = {
  structures: {
    kinds: ['video_structure'],
    title: 'Video structures',
    description: 'Beat-by-beat skeletons. The ★ default is injected into every draft prompt.',
    allowLlm: true,
    what: 'video structures',
  },
  ctas: {
    kinds: ['cta', 'disclosure'],
    title: 'CTAs & disclosures',
    description: 'Injected into draft prompts with exact-wording rules for disclosures.',
    allowLlm: true,
    what: 'CTAs and disclosures',
  },
  descriptions: {
    kinds: ['description'],
    title: 'Description templates',
    description: 'The ★ default guides the metadata prompt’s description voice and structure.',
    allowLlm: false,
    what: 'description templates',
  },
}

export const Route = createFileRoute('/c/$channelId/scripts/library/$kind')({
  component: LibraryPage,
})

function LibraryPage() {
  const { channelId, kind: kindSlug } = Route.useParams()
  const cid = channelId as Id<'channels'>
  const config = KIND_CONFIG[kindSlug]

  const items = useQuery(api.library.list, config ? { channelId: cid, kinds: config.kinds } : 'skip')
  const create = useMutation(api.library.create)
  const setDefault = useMutation(api.library.setDefault)
  const remove = useMutation(api.library.remove)
  const applyResult = useMutation(api.library.applyResult)

  const [source, setSource] = useState('')
  const [presetId, setPresetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Doc<'libraryItems'> | null>(null)
  // description-template form
  const [descName, setDescName] = useState('')
  const [descBody, setDescBody] = useState('')

  if (!config) return <div className="px-4 py-5 md:px-8 md:py-7 text-sm text-danger">Unknown library kind.</div>
  const loading = items === undefined

  const installPreset = async () => {
    const preset = BUILTIN_STRUCTURES.find((s) => s.id === presetId)
    if (!preset) return
    await create({
      channelId: cid,
      kind: 'video_structure',
      title: preset.name,
      summary: preset.bestFor,
      result: {
        name: preset.name,
        formatType: preset.formatType,
        sections: preset.sections,
        pacingNotes: preset.pacingNotes ?? '',
        bestFor: preset.bestFor,
      },
    })
    setPresetId(null)
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
      <div>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">{config.title}</h2>
        <p className="mt-0.5 text-sm text-text-secondary">{config.description}</p>
      </div>

      {kindSlug === 'structures' && (
        <div className="flex items-end gap-2.5">
          <Select
            label="Install a built-in structure"
            options={BUILTIN_STRUCTURES.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.formatType})`,
            }))}
            value={presetId}
            onChange={setPresetId}
            placeholder="Pick a preset…"
            className="w-96"
          />
          <Button variant="secondary" disabled={!presetId} onClick={() => void installPreset()}>
            <Plus size={14} />
            Install
          </Button>
        </div>
      )}

      {kindSlug === 'descriptions' && (
        <Card>
          <div className="flex flex-col gap-3">
            <Input
              label="Template name"
              value={descName}
              onChange={(e) => setDescName(e.target.value)}
            />
            <Textarea
              label="Description body"
              rows={6}
              placeholder="The description text whose structure and voice the AI should mirror."
              value={descBody}
              onChange={(e) => setDescBody(e.target.value)}
            />
            <Button
              className="self-start"
              disabled={!descName.trim() || !descBody.trim()}
              onClick={() =>
                void create({
                  channelId: cid,
                  kind: 'description',
                  title: descName,
                  summary: descBody.split('\n')[0].slice(0, 120),
                  result: { name: descName, body: descBody, notes: '' },
                }).then(() => {
                  setDescName('')
                  setDescBody('')
                })
              }
            >
              <Plus size={14} />
              Add template
            </Button>
          </div>
        </Card>
      )}

      {config.allowLlm && (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={4}
            label="Raw material"
            placeholder={
              kindSlug === 'structures'
                ? 'Paste outlines or describe how your best videos are structured.'
                : 'Paste examples of your CTAs, sponsorship reads, and required disclosures.'
            }
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <MegapromptPanel
            what={config.what}
            disabled={!source.trim()}
            getPrompt={async () =>
              toMegaprompt(
                kindSlug === 'structures'
                  ? composeVideoStructurePrompt(source)
                  : composeCtaPrompt(source),
              )
            }
            onApply={async (raw) => {
              const parsed = parseJsonLenient(raw)
              if (!parsed || typeof parsed !== 'object') {
                throw new Error(
                  "Couldn't read that reply. Paste the model's entire ```json block and try Apply again.",
                )
              }
              if (kindSlug === 'structures') {
                const result = parsed as VideoStructureResult
                const structures = Array.isArray(result.video_structures) ? result.video_structures : []
                if (structures.length === 0) throw new Error('The reply contains no structures.')
                await applyResult({
                  channelId: cid,
                  items: structures.map((s) => ({
                    kind: 'video_structure' as const,
                    title: String(s.name ?? 'Untitled'),
                    summary: String(s.best_for ?? ''),
                    result: s,
                  })),
                })
              } else {
                const result = parsed as CtaResult
                const ctas = Array.isArray(result.ctas) ? result.ctas : []
                const disclosures = Array.isArray(result.disclosures) ? result.disclosures : []
                if (ctas.length + disclosures.length === 0) {
                  throw new Error('The reply contains no CTAs or disclosures.')
                }
                await applyResult({
                  channelId: cid,
                  items: [
                    ...ctas.map((c) => ({
                      kind: 'cta' as const,
                      title: String(c.goal ?? 'CTA'),
                      summary: String(c.text_variants?.[0] ?? ''),
                      result: c,
                    })),
                    ...disclosures.map((d) => ({
                      kind: 'disclosure' as const,
                      title: String(d.type ?? 'Disclosure'),
                      summary: String(d.text ?? ''),
                      result: d,
                    })),
                  ],
                })
              }
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner size={14} /> Loading…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${config.title.toLowerCase()} yet`}
          description="Add items above — the ★ default feeds the prompts."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Card key={item._id} padding={14}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{item.title}</span>
                {config.kinds.length > 1 && <Badge variant="muted">{item.kind}</Badge>}
                {item.isDefault && <Badge variant="warning">★ default</Badge>}
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={item.isDefault}
                  onClick={() => void setDefault({ channelId: cid, itemId: item._id })}
                >
                  <Star size={13} className={item.isDefault ? 'fill-warning text-warning' : ''} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(item)}>
                  <Trash2 size={13} className="text-danger" />
                </Button>
              </div>
              {item.summary && (
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{item.summary}</p>
              )}
              <StructureBeats item={item} />
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          void remove({ channelId: cid, itemId: deleting._id }).then(() => setDeleting(null))
        }}
        title={`Delete “${deleting?.title}”?`}
        message="The library item is permanently removed."
        confirmLabel="Delete"
      />
    </div>
  )
}

function StructureBeats({ item }: { item: Doc<'libraryItems'> }) {
  if (item.kind !== 'video_structure') return null
  const result = item.result as { sections?: Array<{ beat: string; job: string }> } | null
  const sections = Array.isArray(result?.sections) ? result.sections : []
  if (sections.length === 0) return null
  return (
    <ul className="mt-2 flex flex-col gap-0.5">
      {sections.map((section, i) => (
        <li key={i} className="text-xs text-text-muted">
          <span className="text-text-secondary">{section.beat}:</span> {section.job}
        </li>
      ))}
    </ul>
  )
}
