import { Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const MODELS = [
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'mistral' },
]

interface ModelSelectorProps {
  current: string
  onChange: (model: string) => void
}

export function ModelSelector({ current, onChange }: ModelSelectorProps) {
  const selected = MODELS.find((m) => m.id === current) || MODELS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Cpu className="w-4 h-4" />
          <span className="max-w-[100px] truncate">{selected.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {MODELS.map((model) => (
          <DropdownMenuItem key={model.id} onClick={() => onChange(model.id)}>
            <div>
              <div className="font-medium">{model.name}</div>
              <div className="text-xs text-muted-foreground">
                {model.provider}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
