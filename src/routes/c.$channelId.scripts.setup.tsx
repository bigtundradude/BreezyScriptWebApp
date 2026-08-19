import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button, Card, Input } from '@/components/ui'

export const Route = createFileRoute('/c/$channelId/scripts/setup')({
  component: SetupPage,
})

function SetupPage() {
  const { channelId } = Route.useParams()
  const cid = channelId as Id<'channels'>
  const wpm = useQuery(api.scripts.getWordsPerMinute, { channelId: cid })
  const setWpm = useMutation(api.scripts.setWordsPerMinute)
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (wpm !== undefined && value === '') setValue(String(wpm))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpm])

  return (
    <div className="mx-auto flex max-w-170 flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
      <div>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-text-primary">Using your AI</h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          Scripts Pro never calls a model. It composes complete prompts from your foundations and
          material; you run them in your own AI and paste the reply back.
        </p>
      </div>

      <Card>
        <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-relaxed text-text-secondary">
          <li>
            <span className="font-medium text-text-primary">Copy.</span> Every AI-shaped card has a
            “Copy prompt” button. The prompt carries your persona, audience, framework, and title
            shapes — nothing generic.
          </li>
          <li>
            <span className="font-medium text-text-primary">Run.</span> Paste it into Claude, ChatGPT,
            or Gemini — whichever you already pay for. The prompt tells the model exactly what shape
            of answer to return.
          </li>
          <li>
            <span className="font-medium text-text-primary">Paste back.</span> Copy the model’s entire
            reply into the paste box and hit Apply. The app validates it and files everything in the
            right place.
          </li>
        </ol>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-semibold text-text-primary">Speaking pace</div>
            <p className="mt-0.5 text-xs text-text-secondary">
              Words per minute for this channel. Drives the target word counts in draft prompts and
              the pacing meter in the script editor.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Input
              label="Words per minute"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-40"
            />
            <Button
              variant="secondary"
              disabled={wpm === undefined || value === String(wpm)}
              onClick={() => {
                void setWpm({ channelId: cid, wordsPerMinute: Number(value) || 140 }).then(() => {
                  setSaved(true)
                  setTimeout(() => setSaved(false), 2000)
                })
              }}
            >
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </Card>

      <p className="text-xs leading-relaxed text-text-muted">
        Your foundations, notes, and scripts are stored in your private backend and are only readable
        by your signed-in owner account. Prompt content reaches a model only when you paste it into
        your own AI.
      </p>
    </div>
  )
}
