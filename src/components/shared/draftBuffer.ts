// localStorage draft insurance for long-form editors (plan §8, mechanism 3).
// A buffer is written on change, cleared on server ack, and only ever offered
// back to the user via a restore bar — never auto-applied.

export interface NoteDraft {
  title: string
  body: string
  kind: string
  tags: string[]
  savedAt: number
  /** the server doc's updatedAt this draft was based on (0 for new notes) */
  baseUpdatedAt: number
}

const PREFIX = 'bs.draft.'

export function draftKey(scope: string, id: string) {
  return `${PREFIX}${scope}.${id}`
}

export function readDraft(key: string): NoteDraft | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as NoteDraft
  } catch {
    return null
  }
}

export function writeDraft(key: string, draft: NoteDraft) {
  try {
    localStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // Quota/eviction: the buffer is insurance, not a store — degrade silently.
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
