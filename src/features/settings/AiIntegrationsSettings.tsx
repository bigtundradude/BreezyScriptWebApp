import { useEffect, useRef, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Badge, Button, Select, Spinner } from '@/components/ui'

type Provider = 'claude' | 'openai' | 'grok'

const PROVIDERS: Array<{ id: Provider; label: string; envKey: string }> = [
  { id: 'claude', label: 'Claude', envKey: 'ANTHROPIC_API_KEY' },
  { id: 'openai', label: 'OpenAI', envKey: 'OPENAI_API_KEY' },
  { id: 'grok', label: 'Grok', envKey: 'XAI_API_KEY' },
]

const PROVIDER_OPTIONS = PROVIDERS.map((p) => ({ value: p.id, label: p.label }))

// AI integrations settings (docs/idea-workflow-plan.md §6b). Model choices are
// picked from each provider's fetched-and-cached model list, never typed.
export function AiIntegrationsSettings() {
  const settings = useQuery(api.aiSettings.getAll)
  const setModels = useMutation(api.aiSettings.setProviderModels)
  const setActive = useMutation(api.aiSettings.setActive)
  const testConnection = useAction(api.ai.testConnection)
  const fetchModels = useAction(api.ai.fetchModels)

  const [models, setModelsState] = useState<Record<Provider, { simpleModel: string; scriptModel: string }>>({
    claude: { simpleModel: '', scriptModel: '' },
    openai: { simpleModel: '', scriptModel: '' },
    grok: { simpleModel: '', scriptModel: '' },
  })
  const [loaded, setLoaded] = useState(false)
  const [dirtyProviders, setDirtyProviders] = useState<Set<Provider>>(new Set())
  const [saving, setSaving] = useState(false)
  const [testingProvider, setTestingProvider] = useState<Provider | null>(null)
  const [refreshingProvider, setRefreshingProvider] = useState<Provider | null>(null)
  const [notes, setNotes] = useState<Partial<Record<Provider, { ok: boolean; message: string }>>>({})
  const autoFetched = useRef<Set<Provider>>(new Set())

  useEffect(() => {
    if (loaded || !settings) return
    setModelsState(settings.providers)
    setLoaded(true)
  }, [settings, loaded])

  const refreshModels = async (provider: Provider) => {
    setRefreshingProvider(provider)
    setNotes((prev) => ({ ...prev, [provider]: undefined }))
    try {
      const result = await fetchModels({ provider })
      setNotes((prev) => ({ ...prev, [provider]: { ok: result.ok, message: result.message } }))
    } catch (e) {
      setNotes((prev) => ({
        ...prev,
        [provider]: { ok: false, message: e instanceof Error ? e.message : 'Could not load models.' },
      }))
    } finally {
      setRefreshingProvider(null)
    }
  }

  // First visit with a key present and no cached list → fetch automatically.
  useEffect(() => {
    if (!settings) return
    for (const provider of PROVIDERS) {
      if (
        settings.keys[provider.id] &&
        settings.models[provider.id].list.length === 0 &&
        !autoFetched.current.has(provider.id)
      ) {
        autoFetched.current.add(provider.id)
        void refreshModels(provider.id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  if (!settings) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner size={14} /> Loading AI integrations…
      </div>
    )
  }

  const editModel = (provider: Provider, field: 'simpleModel' | 'scriptModel', value: string) => {
    setModelsState((prev) => ({ ...prev, [provider]: { ...prev[provider], [field]: value } }))
    setDirtyProviders((prev) => new Set(prev).add(provider))
  }

  // One page-level save (owner, 2026-08-21): writes every provider with
  // unsaved model picks in one go.
  const saveAll = async () => {
    setSaving(true)
    try {
      for (const provider of dirtyProviders) {
        await setModels({ provider, ...models[provider] })
      }
      setDirtyProviders(new Set())
    } finally {
      setSaving(false)
    }
  }

  const revertAll = () => {
    if (settings) setModelsState(settings.providers)
    setDirtyProviders(new Set())
  }

  const runTest = async (provider: Provider) => {
    setTestingProvider(provider)
    setNotes((prev) => ({ ...prev, [provider]: undefined }))
    try {
      const result = await testConnection({ provider, model: models[provider].simpleModel })
      setNotes((prev) => ({ ...prev, [provider]: result }))
    } catch (e) {
      setNotes((prev) => ({
        ...prev,
        [provider]: { ok: false, message: e instanceof Error ? e.message : 'Test failed.' },
      }))
    } finally {
      setTestingProvider(null)
    }
  }

  const modelOptions = (provider: Provider, current: string) => {
    const list = settings.models[provider].list
    const options = [{ value: '', label: 'Choose model…' }, ...list.map((id) => ({ value: id, label: id }))]
    // Keep a previously saved model visible even if it left the fetched list.
    if (current && !list.includes(current)) options.push({ value: current, label: `${current} (saved)` })
    return options
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        Keys live only in Convex env vars (<code className="text-xs">npx convex env set …</code>) —
        this page shows presence, never values. Model lists are fetched from each provider and cached.
      </p>

      <div className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-4">
        <div className="text-sm font-medium text-text-secondary">Active provider</div>
        <div className="flex gap-3 max-md:flex-col">
          <Select<Provider | ''>
            label="Simple tasks (titles, questions, descriptions)"
            options={[{ value: '', label: 'Not set' }, ...PROVIDER_OPTIONS]}
            value={settings.active.simple ?? ''}
            onChange={(value) => value && void setActive({ task: 'simple', provider: value })}
            className="flex-1"
          />
          <Select<Provider | ''>
            label="Script writing"
            options={[{ value: '', label: 'Not set' }, ...PROVIDER_OPTIONS]}
            value={settings.active.scripts ?? ''}
            onChange={(value) => value && void setActive({ task: 'scripts', provider: value })}
            className="flex-1"
          />
        </div>
      </div>

      {PROVIDERS.map((provider) => {
        const hasKey = settings.keys[provider.id]
        const list = settings.models[provider.id].list
        const note = notes[provider.id]
        return (
          <div key={provider.id} className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">{provider.label}</span>
              {hasKey ? (
                <Badge variant="success">key detected</Badge>
              ) : (
                <Badge variant="muted">no key — set {provider.envKey}</Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                loading={refreshingProvider === provider.id}
                onClick={() => void refreshModels(provider.id)}
                className="ml-auto"
              >
                <RefreshCw size={13} />
                {list.length > 0 ? 'Refresh models' : 'Load models'}
              </Button>
            </div>

            {list.length > 0 ? (
              <div className="flex gap-3 max-md:flex-col">
                <Select<string>
                  label="Simple-tasks model"
                  options={modelOptions(provider.id, models[provider.id].simpleModel)}
                  value={models[provider.id].simpleModel}
                  onChange={(value) => editModel(provider.id, 'simpleModel', value)}
                  className="flex-1"
                />
                <Select<string>
                  label="Script-writing model"
                  options={modelOptions(provider.id, models[provider.id].scriptModel)}
                  value={models[provider.id].scriptModel}
                  onChange={(value) => editModel(provider.id, 'scriptModel', value)}
                  className="flex-1"
                />
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                {hasKey
                  ? 'No models loaded yet — tap Load models.'
                  : `Set ${provider.envKey} on the Convex deployment, then load models to pick from a list.`}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                loading={testingProvider === provider.id}
                onClick={() => void runTest(provider.id)}
              >
                Test connection
              </Button>
              {note && (
                <span className={`flex items-center gap-1 text-xs ${note.ok ? 'text-success' : 'text-danger'}`}>
                  {note.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {note.message}
                </span>
              )}
            </div>
          </div>
        )
      })}

      {dirtyProviders.size > 0 && (
        <div className="sticky bottom-0 z-10 mt-1 flex items-center justify-end gap-2 border-t border-border bg-bg py-3">
          <Button variant="secondary" onClick={revertAll}>
            Cancel
          </Button>
          <Button loading={saving} onClick={() => void saveAll()}>
            Save
          </Button>
        </div>
      )}
    </div>
  )
}
