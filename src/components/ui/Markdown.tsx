import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// GFM renderer wrapped in the ported .md-body prose theme (globals.css).
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
