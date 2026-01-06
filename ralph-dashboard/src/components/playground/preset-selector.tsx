import { useEffect, useState } from 'react'
import { Bookmark, Save } from 'lucide-react'
import {
  BUILTIN_PRESETS,
  getSavedPresets,
  savePreset,
} from './playground-presets'
import type { Preset } from './playground-presets'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PresetSelectorProps {
  onLoad: (preset: Preset) => void
  currentValues: Record<string, unknown>
}

export function PresetSelector({ onLoad, currentValues }: PresetSelectorProps) {
  const [savedPresets, setSavedPresets] = useState<Array<Preset>>([])

  useEffect(() => {
    setSavedPresets(getSavedPresets())
  }, [])

  const handleSave = () => {
    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name: `Custom ${savedPresets.length + 1}`,
      description: 'Custom preset',
      values: currentValues,
    }
    savePreset(newPreset)
    setSavedPresets(getSavedPresets())
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bookmark className="w-4 h-4" />
          Preset
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Load Preset</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {BUILTIN_PRESETS.map((preset) => (
          <DropdownMenuItem key={preset.id} onClick={() => onLoad(preset)}>
            {preset.name}
          </DropdownMenuItem>
        ))}
        {savedPresets.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {savedPresets.map((preset) => (
              <DropdownMenuItem key={preset.id} onClick={() => onLoad(preset)}>
                {preset.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save as Preset
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
