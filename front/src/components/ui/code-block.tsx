import * as React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus'
import vs from 'react-syntax-highlighter/dist/esm/styles/prism/vs'
import { CopyButton } from './copy-button'
import { cn } from '@/lib/utils'

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
