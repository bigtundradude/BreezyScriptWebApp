import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const sizeMap = { sm: 'w-100', md: 'w-135', lg: 'w-180', xl: 'w-240' } as const

// Radix Dialog styled with tokens; sizes ported from the desktop Modal (400/540/720/960).
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: keyof typeof sizeMap
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-200 bg-black/70" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-200 flex max-h-[calc(100vh-64px)] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-panel border border-border bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.6)]',
            sizeMap[size],
          )}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <Dialog.Title className="text-md font-semibold text-text-primary">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
              >
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 px-5 pb-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
