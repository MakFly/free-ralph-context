import { Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LLMParameters {
  temperature: number
  maxTokens: number
  topP: number
}

interface ParametersPanelProps {
  parameters: LLMParameters
  onChange: (params: LLMParameters) => void
}

export function ParametersPanel({
  parameters,
  onChange,
}: ParametersPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="w-4 h-4" />
          LLM Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Temperature (0-2)</Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            max={2}
            value={parameters.temperature}
            onChange={(e) =>
              onChange({ ...parameters, temperature: Number(e.target.value) })
            }
            className="h-8"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Max Tokens</Label>
          <Input
            type="number"
            value={parameters.maxTokens}
            onChange={(e) =>
              onChange({ ...parameters, maxTokens: Number(e.target.value) })
            }
            className="h-8"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Top P (0-1)</Label>
          <Input
            type="number"
            step="0.05"
            min={0}
            max={1}
            value={parameters.topP}
            onChange={(e) =>
              onChange({ ...parameters, topP: Number(e.target.value) })
            }
            className="h-8"
          />
        </div>
      </CardContent>
    </Card>
  )
}
