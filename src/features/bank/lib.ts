export const BANK_STATUSES = ['new', 'ready', 'done', 'do_again', 'wont_do'] as const
export type BankIdeaStatus = (typeof BANK_STATUSES)[number]

export const STATUS_OPTIONS: Array<{ value: BankIdeaStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'ready', label: 'Ready' },
  { value: 'done', label: 'Done' },
  { value: 'do_again', label: 'Do again' },
  { value: 'wont_do', label: "Won't do" },
]

// List badge per status; 'new' is the default state and shows no badge.
export const STATUS_BADGE: Record<
  BankIdeaStatus,
  { label: string; variant: 'muted' | 'info' | 'success' | 'warning' | 'danger' } | null
> = {
  new: null,
  ready: { label: 'ready', variant: 'info' },
  done: { label: 'done', variant: 'success' },
  do_again: { label: 'do again', variant: 'warning' },
  wont_do: { label: "won't do", variant: 'danger' },
}
