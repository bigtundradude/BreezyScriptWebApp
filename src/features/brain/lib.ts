// Second Brain kind vocabulary — ported from the desktop app (10-value closed set).
export const NOTE_KINDS = [
  'note',
  'article',
  'thought',
  'book_review',
  'script',
  'quote',
  'idea',
  'transcript',
  'research',
  'story',
] as const

export type NoteKind = (typeof NOTE_KINDS)[number]

const LABELS: Record<NoteKind, string> = {
  note: 'Note',
  article: 'Article',
  thought: 'Thought',
  book_review: 'Book review',
  script: 'Script',
  quote: 'Quote',
  idea: 'Idea',
  transcript: 'Transcript',
  research: 'Research',
  story: 'Story',
}

export function kindLabel(kind: string): string {
  return LABELS[kind as NoteKind] ?? 'Note'
}

export const KIND_OPTIONS = NOTE_KINDS.map((k) => ({ value: k, label: LABELS[k] }))

