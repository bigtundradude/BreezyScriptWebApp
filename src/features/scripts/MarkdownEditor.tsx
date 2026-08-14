import { useRef, useState } from 'react'
import { Bold, Eye, Heading2, Italic, List, Pencil } from 'lucide-react'
import { Markdown } from '@/components/ui'
import { cn } from '@/lib/utils'

// Auto-growing markdown textarea with a minimal toolbar and inline preview,
// ported. Grows via CSS field-sizing with a scrollHeight fallback.
export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  minRows = 4,
  className,
}: {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  minRows?: number
  className?: string
}) {
  const [preview, setPreview] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  const wrap = (before: string, after = before) => {
    const el = ref.current
    if (!el) return
    const { selectionStart, selectionEnd } = el
    const selected = value.slice(selectionStart, selectionEnd)
    const next =
      value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(selectionStart + before.length, selectionEnd + before.length)
    })
  }

  const linePrefix = (prefix: string) => {
    const el = ref.current
    if (!el) return
    const start = value.lastIndexOf('\n', el.selectionStart - 1) + 1
    const next = value.slice(0, start) + prefix + value.slice(start)
    onChange(next)
    requestAnimationFrame(() => el.focus())
  }

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1">
        <ToolbarButton title="Bold" onClick={() => wrap('**')}>
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => wrap('*')}>
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton title="Heading" onClick={() => linePrefix('## ')}>
          <Heading2 size={13} />
        </ToolbarButton>
        <ToolbarButton title="List item" onClick={() => linePrefix('- ')}>
          <List size={13} />
        </ToolbarButton>
        <div className="flex-1" />
        <ToolbarButton title={preview ? 'Edit' : 'Preview'} onClick={() => setPreview((p) => !p)}>
          {preview ? <Pencil size={13} /> : <Eye size={13} />}
        </ToolbarButton>
      </div>
      {preview ? (
        <div className="rounded-field border border-border bg-surface px-3.5 py-3">
          <Markdown>{value || '*Nothing yet.*'}</Markdown>
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          rows={minRows}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value)
            autoGrow(e.target)
          }}
          onBlur={onBlur}
          className="w-full resize-none overflow-hidden rounded-field border border-border bg-surface-raised px-3.5 py-2.5 text-sm leading-relaxed text-text-primary [field-sizing:content] placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      )}
    </div>
  )
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-6.5 w-6.5 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
    >
      {children}
    </button>
  )
}
