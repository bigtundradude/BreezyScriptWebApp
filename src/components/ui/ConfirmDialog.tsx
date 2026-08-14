import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Button } from './Button'

// Radix supplies the behavior (focus trap, Escape, aria wiring); tokens supply the look.
// API mirrors the desktop ConfirmModal.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-200 bg-black/70" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-200 w-100 max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-border bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          <div className="px-5 py-4">
            <AlertDialog.Title className="text-md font-semibold text-text-primary">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-base leading-relaxed text-text-secondary">
              {message}
            </AlertDialog.Description>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-4">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" size="sm" disabled={loading}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild onClick={(e) => e.preventDefault()}>
              <Button
                variant={variant === 'danger' ? 'danger' : 'primary'}
                size="sm"
                loading={loading}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
