import * as React from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface CopyButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  code: string
}

export function CopyButton({ code, className, ...props }: CopyButtonProps) {
  const [isCopied, setIsCopied] = React.useState(false)

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', className)}
      onClick={() => {
        navigator.clipboard.writeText(code)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      }}
      {...props}
    >
      {isCopied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  )
}
