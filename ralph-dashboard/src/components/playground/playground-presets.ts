export interface Preset {
  id: string
  name: string
  description: string
  values: Record<string, unknown>
}

export const BUILTIN_PRESETS: Array<Preset> = [
  {
    id: 'quick-search',
    name: 'Quick Search',
    description: 'WarpGrep optimized for fast code search',
    values: {
      searchPattern: 'function',
      searchPath:
        '/home/kev/Documents/lab/brainstorming/free-ralph-context/ralph-mcp/src',
    },
  },
  {
    id: 'code-transform',
    name: 'Code Transform',
    description: 'Fast Apply focused on code transformation',
    values: {
      originalCode: 'function greet(name) {\n  console.log("Hello " + name)\n}',
      editInstructions: 'Use template literals',
      filePath: 'src/utils.ts',
    },
  },
  {
    id: 'memory-analysis',
    name: 'Memory Analysis',
    description: 'Cross Search + memory curation',
    values: {
      memoryQuery: 'compression',
    },
  },
  {
    id: 'full-session',
    name: 'Full Session',
    description: 'Complete malloc → compress workflow',
    values: {
      taskDescription: 'Example task',
      maxTokens: 200000,
    },
  },
]

export function getPreset(id: string): Preset | undefined {
  return BUILTIN_PRESETS.find((p) => p.id === id)
}

export function getSavedPresets(): Array<Preset> {
  try {
    const stored = localStorage.getItem('ralph-presets')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function savePreset(preset: Preset): void {
  const saved = getSavedPresets()
  const updated = [...saved, preset]
  localStorage.setItem('ralph-presets', JSON.stringify(updated))
}

export function deletePreset(id: string): void {
  const saved = getSavedPresets()
  const updated = saved.filter((p) => p.id !== id)
  localStorage.setItem('ralph-presets', JSON.stringify(updated))
}

export function getAllPresets(): Array<Preset> {
  return [...BUILTIN_PRESETS, ...getSavedPresets()]
}
