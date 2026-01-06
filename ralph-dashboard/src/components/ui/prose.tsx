import * as React from 'react'
import { cn } from '@/lib/utils'

const ProseClass = 'prose prose-slate dark:prose-invert max-w-none'
const ProseSize = {
  sm: 'prose-sm',
  base: '',
  lg: 'prose-lg',
  xl: 'prose-xl',
}

const Prose = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: keyof typeof ProseSize
  }
>(({ className, size = 'base', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        ProseClass,
        ProseSize[size],
        // Headings
        '[&_h1]:font-mono [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-foreground',
        '[&_h2]:font-mono [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-foreground',
        '[&_h3]:font-mono [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-foreground',
        '[&_h4]:font-mono [&_h4]:text-base [&_h4]:font-medium [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-foreground',
        // Paragraphs
        '[&_p]:leading-7 [&_p]:mb-4 [&_p]:text-muted-foreground',
        // Links
        '[&_a]:text-violet-500 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-violet-400 [&_a]:transition-colors',
        // Lists
        '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ul]:space-y-2 [&_ul]:text-muted-foreground',
        '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_ol]:space-y-2 [&_ol]:text-muted-foreground',
        '[&_li]:marker:text-violet-500',
        // Blockquotes
        '[&_blockquote]:border-l-4 [&_blockquote]:border-violet-500/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4',
        // Code inline
        "[&_code:not(:where([class~='prose-code']))]:bg-muted [&_code:not(:where([class~='prose-code']))]:px-1.5 [&_code:not(:where([class~='prose-code']))]:py-0.5 [&_code:not(:where([class~='prose-code']))]:rounded [&_code:not(:where([class~='prose-code']))]:text-sm [&_code:not(:where([class~='prose-code']))]:font-mono [&_code:not(:where([class~='prose-code']))]:text-violet-500",
        // Code blocks
        '[&_pre]:bg-muted/50 [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:my-4 [&_pre]:overflow-x-auto',
        '[&_pre_code]:text-sm [&_pre_code]:font-mono [&_pre_code]:text-foreground',
        // Tables
        '[&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm',
        '[&_table_th]:border [&_table_th]:border-border [&_table_th]:px-4 [&_table_th]:py-2 [&_table_th]:text-left [&_table_th]:font-mono [&_table_th]:font-medium [&_table_th]:bg-muted/50',
        '[&_table_td]:border [&_table_td]:border-border [&_table_td]:px-4 [&_table_td]:py-2 [&_table_td]:text-muted-foreground',
        '[&_table_tr]:hover:bg-muted/30 [&_table_tr]:transition-colors',
        // HR
        '[&_hr]:border-border [&_hr]:my-8',
        // Strong
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        // Images
        '[&_img]:rounded-lg [&_img]:my-4 [&_img]:border [&_img]:border-border',
        className,
      )}
      {...props}
    />
  )
})
Prose.displayName = 'Prose'

export { Prose }
