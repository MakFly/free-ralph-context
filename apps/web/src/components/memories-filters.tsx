import { memo } from 'react'
import { SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MemoryType, MemoryScope } from '@/stores/nexusStore'

const MEMORY_TYPES: { value: MemoryType; label: string }[] = [
  { value: 'decision', label: 'Decision' },
  { value: 'preference', label: 'Preference' },
  { value: 'fact', label: 'Fact' },
  { value: 'note', label: 'Note' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'bugfix', label: 'Bugfix' },
  { value: 'feature', label: 'Feature' },
  { value: 'refactor', label: 'Refactor' },
  { value: 'change', label: 'Change' },
]

const MEMORY_SCOPES: { value: MemoryScope; label: string }[] = [
  { value: 'repo', label: 'Repository' },
  { value: 'branch', label: 'Branch' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'feature', label: 'Feature' },
  { value: 'global', label: 'Global' },
]

interface MemoriesFiltersProps {
  searchQuery: string
  filterType: string
  filterScope: string
  onSearchChange: (value: string) => void
  onFilterTypeChange: (value: string) => void
  onFilterScopeChange: (value: string) => void
  onClearFilters: () => void
}

export const MemoriesFilters = memo(function MemoriesFilters({
  searchQuery,
  filterType,
  filterScope,
  onSearchChange,
  onFilterTypeChange,
  onFilterScopeChange,
  onClearFilters,
}: MemoriesFiltersProps) {
  const hasFilters = filterType !== 'all' || filterScope !== 'all' || searchQuery

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterType} onValueChange={onFilterTypeChange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {MEMORY_TYPES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterScope} onValueChange={onFilterScopeChange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              {MEMORY_SCOPES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" onClick={onClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
