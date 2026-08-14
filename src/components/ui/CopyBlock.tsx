import { CopyButton } from './CopyButton'

export function CopyBlock({
  text,
  maxHeight = 300,
  label = 'Copy',
}: {
  text: string
  maxHeight?: number
  label?: string
}) {
  return (
    <div className="relative rounded-field border border-border bg-bg">
      <div className="absolute right-2 top-2 z-1 rounded-control bg-bg/80">
        <CopyButton text={text} label={label} />
      </div>
      <pre
        className="overflow-y-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-text-secondary"
        style={{ maxHeight }}
      >
        {text}
      </pre>
    </div>
  )
}
