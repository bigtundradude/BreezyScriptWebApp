export const BANK_STATUSES = ['new', 'ready', 'done', 'do_again', 'wont_do'] as const
export type BankIdeaStatus = (typeof BANK_STATUSES)[number]

// Display labels only — stored values are unchanged (no migration). Relabeled
// 2026-08-18 (owner): ready→In progress, done→Published, do_again→Evergreen,
// wont_do→Shelved. "In progress" avoids colliding with the workflow's Ready
// vocabulary; pipeline progress itself is shown separately (step count chip).
export const STATUS_OPTIONS: Array<{ value: BankIdeaStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'ready', label: 'In progress' },
  { value: 'done', label: 'Published' },
  { value: 'do_again', label: 'Evergreen' },
  { value: 'wont_do', label: 'Shelved' },
]

// List badge per status; 'new' is the default state and shows no badge.
export const STATUS_BADGE: Record<
  BankIdeaStatus,
  { label: string; variant: 'muted' | 'info' | 'success' | 'warning' | 'danger' } | null
> = {
  new: null,
  ready: { label: 'in progress', variant: 'info' },
  done: { label: 'published', variant: 'success' },
  do_again: { label: 'evergreen', variant: 'warning' },
  wont_do: { label: 'shelved', variant: 'muted' },
}
