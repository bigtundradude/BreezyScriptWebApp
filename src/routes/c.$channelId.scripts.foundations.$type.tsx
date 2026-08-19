import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Markdown,
  MegapromptPanel,
  Spinner,
  Textarea,
} from '@/components/ui'
import { usePromptContext } from '@/features/scripts/usePromptContext'
import {
  composeAudiencePrompt,
  composeFrameworkPrompt,
  composePersonaPrompt,
  parseJsonLenient,
  renderAudienceMarkdown,
  renderFrameworkMarkdown,
  renderPersonaMarkdown,
  toMegaprompt,
  type AudienceResult,
  type FrameworkResult,
  type PersonaResult,
} from '@/lib/megaprompt'

type AssetType = 'persona' | 'audience' | 'framework'

const TYPE_CONFIG: Record<
  string,
  { type: AssetType; title: string; description: string; sourcePlaceholder: string; what: string }
> = {
  personas: {
    type: 'persona',
    title: 'Personas',
    description: 'Voice profiles distilled from your real scripts and transcripts.',
    sourcePlaceholder: 'Paste 2–3 of your scripts or talking transcripts.',
    what: 'the persona',
  },
  audience: {
    type: 'audience',
    title: 'Audience',
    description: 'Who you make videos for — their problem, language, and objections.',
    sourcePlaceholder: 'Paste comments, community posts, or describe your viewer.',
    what: 'the audience profile',
  },
  framework: {
    type: 'framework',
    title: 'Framework',
    description: 'Your channel’s repeatable method — the thesis every script argues from.',
    sourcePlaceholder: 'Describe how you solve your audience’s problem, in your own words.',
    what: 'the framework',
  },
}

export const Route = createFileRoute('/c/$channelId/scripts/foundations/$type')({
  validateSearch: (search: Record<string, unknown>): { selected?: string } => ({
    selected: typeof search.selected === 'string' ? search.selected : undefined,
  }),
  component: FoundationAssetPage,
})

function FoundationAssetPage() {
  const { channelId, type: typeSlug } = Route.useParams()
  const { selected } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const cid = channelId as Id<'channels'>
  const config = TYPE_CONFIG[typeSlug]

  const assets = useQuery(
    api.foundationAssets.list,
    config ? { channelId: cid, type: config.type } : 'skip',
  )
  const createAsset = useMutation(api.foundationAssets.create)

  if (!config) {
    return <div className="px-4 py-5 md:px-8 md:py-7 text-sm text-danger">Unknown foundation type.</div>
  }

  const selectedAsset = (assets ?? []).find((a) => a._id === selected) ?? null

  return (
    <div className="flex h-full flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">{config.title}</h2>
          <p className="mt-0.5 text-sm text-text-secondary">{config.description}</p>
        </div>
        <Button
          onClick={() =>
            void createAsset({ channelId: cid, type: config.type, label: 'Untitled' }).then((id) =>
              navigate({ search: { selected: id } }),
            )
          }
        >
          <Plus size={14} />
          New
        </Button>
      </div>

      {assets === undefined ? (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner size={14} /> Loading…
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          title={`No ${config.title.toLowerCase()} yet`}
          description="Create one, paste your raw material, and let your AI distill it."
          action={{
            label: 'New',
            onClick: () =>
              void createAsset({ channelId: cid, type: config.type, label: 'Untitled' }).then((id) =>
                navigate({ search: { selected: id } }),
              ),
          }}
        />
      ) : (
        <div className="flex min-h-0 flex-1 gap-5 max-md:flex-col">
          <div className="flex w-56 shrink-0 flex-col gap-1.5 overflow-y-auto max-md:w-full max-md:flex-row max-md:overflow-x-auto max-md:overflow-y-visible">
            {assets.map((asset) => (
              <button
                key={asset._id}
                onClick={() => void navigate({ search: { selected: asset._id } })}
                className={`flex items-center gap-2 rounded-row border px-3 py-2.5 text-left text-sm transition-colors max-md:shrink-0 max-md:max-w-48 ${
                  asset._id === selectedAsset?._id
                    ? 'border-primary bg-surface text-text-primary'
                    : 'border-border bg-surface text-text-secondary hover:bg-surface-raised'
                }`}
              >
                <span className="flex-1 truncate">{asset.label}</span>
                {asset.isDefault && <Star size={12} className="shrink-0 fill-warning text-warning" />}
              </button>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto">
            {selectedAsset ? (
              <AssetEditor key={selectedAsset._id} asset={selectedAsset} config={config} channelId={cid} />
            ) : (
              <EmptyState
                title="Pick one to edit"
                description="Select an item from the list, or create a new one."
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AssetEditor({
  asset,
  config,
  channelId,
}: {
  asset: Doc<'foundationAssets'>
  config: (typeof TYPE_CONFIG)[string]
  channelId: Id<'channels'>
}) {
  const update = useMutation(api.foundationAssets.update)
  const applyResult = useMutation(api.foundationAssets.applyResult)
  const setDefault = useMutation(api.foundationAssets.setDefault)
  const remove = useMutation(api.foundationAssets.remove)
  const ctx = usePromptContext(channelId)
  const navigate = useNavigate()

  const [label, setLabel] = useState(asset.label)
  const [source, setSource] = useState(asset.sourceInput)
  const [snippet, setSnippet] = useState(asset.promptSnippet)
  const [savingSnippet, setSavingSnippet] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // A different asset id remounts via key; still sync snippet when apply lands.
  useEffect(() => setSnippet(asset.promptSnippet), [asset.promptSnippet])

  const persist = (fields: { label?: string; sourceInput?: string }) =>
    void update({ channelId, assetId: asset._id, ...fields })

  const compose = () => {
    if (!ctx) throw new Error('Still loading channel context — try again in a second.')
    if (config.type === 'persona') return composePersonaPrompt(label, source)
    if (config.type === 'audience') return composeAudiencePrompt(label, source)
    return composeFrameworkPrompt(ctx, label, source)
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-end gap-2.5">
        <Input
          label="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => persist({ label })}
          className="max-w-72 flex-1"
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={asset.isDefault}
          onClick={() => void setDefault({ channelId, assetId: asset._id })}
        >
          <Star size={13} className={asset.isDefault ? 'fill-warning text-warning' : ''} />
          {asset.isDefault ? 'Default' : 'Make default'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
          <Trash2 size={13} className="text-danger" />
        </Button>
      </div>

      <Textarea
        label="Source material"
        rows={8}
        placeholder={config.sourcePlaceholder}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        onBlur={() => persist({ sourceInput: source })}
      />

      <MegapromptPanel
        what={config.what}
        disabled={!source.trim() || !ctx}
        getPrompt={async () => {
          // Persist label+source before composing (desktop parity).
          await update({ channelId, assetId: asset._id, label, sourceInput: source })
          return toMegaprompt(compose())
        }}
        onApply={async (raw) => {
          const parsed = parseJsonLenient(raw)
          if (!parsed || typeof parsed !== 'object') {
            throw new Error(
              "Couldn't read that reply. Paste the model's entire ```json block and try Apply again.",
            )
          }
          const result = parsed as PersonaResult & AudienceResult & FrameworkResult & { prompt_snippet?: string }
          const promptSnippet = String(result.prompt_snippet ?? '')
          const markdown =
            config.type === 'persona'
              ? renderPersonaMarkdown(label, result)
              : config.type === 'audience'
                ? renderAudienceMarkdown(label, result)
                : renderFrameworkMarkdown(label, result)
          await applyResult({
            channelId,
            assetId: asset._id,
            result: parsed,
            resultMarkdown: markdown,
            promptSnippet,
          })
        }}
      />

      {asset.resultMarkdown && (
        <div className="rounded-row border border-border bg-surface p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted">
              Result
            </span>
            <Badge variant="success">generated</Badge>
          </div>
          <Markdown>{asset.resultMarkdown}</Markdown>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Textarea
          label="Prompt snippet"
          hint="This exact text is injected into downstream prompts — edit it freely."
          rows={6}
          value={snippet}
          onChange={(e) => setSnippet(e.target.value)}
        />
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          loading={savingSnippet}
          disabled={snippet === asset.promptSnippet}
          onClick={() => {
            setSavingSnippet(true)
            void update({ channelId, assetId: asset._id, promptSnippet: snippet }).finally(() =>
              setSavingSnippet(false),
            )
          }}
        >
          Save snippet
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          void remove({ channelId, assetId: asset._id }).then(() =>
            navigate({ to: '.', search: { selected: undefined } }),
          )
        }}
        title={`Delete “${asset.label}”?`}
        message="The asset and its prompt snippet are permanently removed."
        confirmLabel="Delete"
      />
    </div>
  )
}
