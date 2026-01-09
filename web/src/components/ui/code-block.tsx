import * as React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus'
import vs from 'react-syntax-highlighter/dist/esm/styles/prism/vs'
import { CopyButton } from './copy-button'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Prose } from './prose'

/**
 * Markdown Props
 */
interface MarkdownProps {
  content: string
  className?: string
}

/**
 * Code Props for ReactMarkdown code component
 */
interface CodeProps {
  node?: unknown
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  className?: string
}

export function CodeBlock({
  code,
  language = 'typescript',
  filename,
  showLineNumbers = true,
  className,
}: CodeBlockProps) {
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className={cn('relative group', className)}>
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b border-border rounded-t-lg">
          <span className="text-xs font-mono text-muted-foreground">
            {filename}
          </span>
          <CopyButton code={code} />
        </div>
      )}
      <div className={cn(!filename && 'relative')}>
        {!filename && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton code={code} />
          </div>
        )}
        <SyntaxHighlighter
          language={language}
          style={isDark ? vscDarkPlus : vs}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            borderRadius: filename ? '0 0 0.5rem 0.5rem' : '0.5rem',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
          }}
          codeTagProps={{
            style: {
              fontFamily:
                "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

/**
 * Markdown Component
 * Renders markdown content with syntax highlighting for code blocks
 */
export function Markdown({ content, className }: MarkdownProps) {
  return (
    <Prose className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, inline, className, children, ...props }: CodeProps) {
            const codeContent = String(children).replace(/\n$/, '')
            const language = className?.replace(/language-/, '') || 'text'

            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-violet-500"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return <CodeBlock code={codeContent} language={language} />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Prose>
  )
}
