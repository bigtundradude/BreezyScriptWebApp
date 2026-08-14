import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { PromptContext } from '@/lib/megaprompt'

// One reactive round trip supplying everything the pure composers need.
export function usePromptContext(channelId: Id<'channels'>): PromptContext | undefined {
  const raw = useQuery(api.scripts.promptContext, { channelId })
  return raw as PromptContext | undefined
}
