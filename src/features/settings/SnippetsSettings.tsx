import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button, Spinner, Textarea } from '@/components/ui'

// Script snippets (docs/idea-workflow-plan.md §5d): reusable text the Script
// Drafter weaves in. Currently just the legal disclaimer.
export function SnippetsSettings({ channelId }: { channelId: Id<'channels'> }) {
  const disclaimer = useQuery(api.bankSnippets.get, { channelId, key: 'disclaimer' })
  const setSnippet = useMutation(api.bankSnippets.set)

  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedNote, setSavedNote] = useState('')

  useEffect(() => {
    if (loaded || disclaimer === undefined) return
    setText(disclaimer)
    setLoaded(true)
  }, [disclaimer, loaded])

  if (disclaimer === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner size={14} /> Loading snippets…
      </div>
    )
  }

  const save = async () => {
    setSaving(true)
    setSavedNote('')
    try {
      await setSnippet({ channelId, key: 'disclaimer', text })
      setDirty(false)
      setSavedNote('Saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        Reusable text for the Script Drafter. The legal disclaimer is included in a script only
        when an idea's research step has the disclaimer toggle on.
      </p>
      <Textarea
        label="Legal disclaimer"
        rows={5}
        placeholder="e.g. I am not a financial advisor, just some dude on the internet sharing what worked for me. Nothing here is financial advice."
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setDirty(true)
          setSavedNote('')
        }}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={!dirty} loading={saving} onClick={() => void save()}>
          Save snippet
        </Button>
        {savedNote && <span className="text-xs text-success">{savedNote}</span>}
      </div>
    </div>
  )
}
