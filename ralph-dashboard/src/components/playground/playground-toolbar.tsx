import { PresetSelector } from './preset-selector'
import { ModelSelector } from './model-selector'
import type { Preset } from './playground-presets'

interface PlaygroundToolbarProps {
  onLoadPreset: (preset: Preset) => void
  currentValues: Record<string, unknown>
  currentModel: string
  onModelChange: (model: string) => void
}

export function PlaygroundToolbar({
  onLoadPreset,
  currentValues,
  currentModel,
  onModelChange,
}: PlaygroundToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <PresetSelector onLoad={onLoadPreset} currentValues={currentValues} />
      <ModelSelector current={currentModel} onChange={onModelChange} />
    </div>
  )
}
