# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ralph Dashboard** is a real-time monitoring dashboard for Claude Code context management. Built with TanStack Start, React 19, and TypeScript, this application provides a comprehensive interface for tracking and managing AI coding session context usage, token consumption, and memory management across multiple projects.

## Tech Stack

- **TanStack Start** - Full-stack React framework with file-based routing
- **React 19** - Latest React with concurrent features
- **TypeScript** - ES2022 target with strict mode enabled
- **Vite** - Fast build tool and dev server
- **Nitro** - Serverless runtime for SSR and API routes
- **shadcn/ui** - Accessible component library built on Radix UI
- **Tailwind CSS v4** - Utility-first CSS with @tailwindcss/vite plugin
- **Recharts** - Data visualization

## Development Commands

> **IMPORTANT:** Always use `bun` instead of `npm` in this project.

```bash
# Development server (port 3000 by default)
bun dev

# Production build
bun run build

# Preview production build
bun run preview

# Run tests (Vitest)
bun test

# Lint code (ESLint with TanStack config)
bun lint

# Format code (Prettier)
bun format

# Format and lint fix in one command
bun check
```

## Architecture

### File-Based Routing

TanStack Start uses file-based routing with automatic code splitting. Routes are defined in `src/routes/`:

- `__root.tsx` - Root route layout (navigation, providers)
- `index.tsx` - Dashboard home page
- `projects.tsx` + `projects.index.tsx` - Projects list layout
- `projects.$name.tsx` - Dynamic project detail page
- `memories.tsx` - Memories management page
- `checkpoints.tsx` - Checkpoints page
- `metrics.tsx` - Metrics and analytics page
- `docs.tsx` + `docs.index.tsx` + `docs.$splat.tsx` - Documentation routes

### Component Organization

```
src/components/
├── ui/           # shadcn/ui base components (button, card, table, etc.)
├── layout/       # Layout components (app-layout.tsx)
├── pages/        # Page-level components (dashboard-page, projects-page, etc.)
└── skeletons/    # Loading states for each page
```

### Data Layer (SSE)

The dashboard connects to a Ralph MCP server via Server-Sent Events (SSE) at `http://localhost:3847`.

**Key hook:** `src/hooks/use-ralph-sse.ts`

This hook manages:

- SSE connection lifecycle with auto-reconnect
- Real-time project status updates
- Metrics history polling
- LLM usage/costs fetching
- Sync progress tracking

**Event types:**

- `init` - Initial status payload
- `update` - Project status updates
- `metrics:update` - Metrics history points
- `sync:progress` - File sync progress
- `sync:error` - Sync errors

### Configuration

- **Path aliases:** `@/*` maps to `src/*` (configured in vite.config.ts and tsconfig.json)
- **Tailwind:** CSS-based configuration via @tailwindcss/vite plugin
- **TypeScript:** Strict mode with noUnusedLocals and noUnusedParameters

## Key Data Models

Located in `src/hooks/use-ralph-sse.ts`:

```typescript
interface Project {
  name: string
  projectPath: string
  currentTokens: number
  maxTokens: number
  contextUsage: number // percentage
  pct: number // percentage
  lastUpdated: string
  isRealData?: boolean
  source: { name: string; color: string }
  transcriptPath: string
}

interface RalphStatus {
  connected: boolean
  projectCount: number
  projects: Project[]
  sources: Array<{ name: string; color: string }>
  totalTokens: number
  timestamp: string
  syncStatus?: SyncStatus
}
```

## Patterns & Conventions

1. **Use `@/` imports** for internal modules (e.g., `@/components/ui/button`)
2. **Page components** in `src/components/pages/` are split from route files for organization
3. **Skeleton components** in `src/components/skeletons/` provide loading states
4. **TypeScript interfaces** for all API data shapes (defined in use-ralph-sse.ts)
5. **shadcn/ui components** are base building blocks - compose them, don't duplicate
6. **⚠️ Lucide React icons:** Not all icon names exist! Commonly missing icons include:
   - ❌ `Feature`, `Architecture` → ✅ Use `Sparkles`, `Network` instead
   - Always verify icons exist at https://lucide.dev/icons/ before importing

## AI Suggestions Feature

The dashboard includes an AI-powered suggestion system that generates contextual improvement ideas in French.

### Components (`src/components/ai/`)

- **`suggestions-card.tsx`** - Main card displaying AI suggestions on dashboard
- **`llm-config-dialog.tsx`** - Dialog for configuring LLM API keys
- **`llm-config-button.tsx`** - Button to open config dialog

### Store (`src/stores/ai-store.ts`)

Zustand store managing:

- Suggestions state with 5-minute cache
- LLM configurations (multiple providers)
- Loading and error states

### API Client (`src/lib/ai-api.ts`)

Type-safe client for endpoints:

- `POST /api/ai/suggestions` - Generate AI suggestions
- `GET /api/ai/llm-config` - Get saved configs
- `POST /api/ai/config` - Save API key (encrypted)
- `DELETE /api/ai/config/{provider}` - Delete config
- `POST /api/ai/config/{provider}/toggle` - Toggle active status

### Supported LLM Providers

- **Anthropic Claude** - Default for high-quality suggestions
- **OpenAI GPT** - Alternative provider
- **Mistral AI** - European alternative
- **Google Gemini** - Fast, cost-effective option

### Security

API keys are encrypted server-side using Fernet (symmetric encryption) before storage in PostgreSQL. The encryption key is configured via `ENCRYPTION_KEY` environment variable.

### Backend Integration (ralph-api)

- **`app/api/ai.py`** - FastAPI endpoints
- **`app/services/suggestion_service.py`** - Suggestion generation with French prompts
- **`app/models/llm_config.py`** - SQLAlchemy model for encrypted keys
- **`app/core/security.py`** - Fernet encryption utilities
