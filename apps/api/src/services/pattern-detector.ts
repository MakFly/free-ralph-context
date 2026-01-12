/**
 * Pattern Detector - Automatic pattern detection from indexed code
 * Supports multi-language pattern detection
 */

// Compatible Database type (matches projects.ts)
export type Database = {
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
};

import type { Candidate, IndexStats, PatternSource } from '@nexus/core';

/**
 * Pattern heuristic definition
 */
interface PatternHeuristic {
  name: string;
  intent: string;
  multiLang?: boolean;
  constraints?: Record<string, unknown>;
  keywords?: string[] | Record<string, string[]>;
  extensions?: string[];
  minChunks: number;
}

/**
 * Multi-language pattern heuristics
 */
const PATTERN_HEURISTICS: Record<string, PatternHeuristic> = {
  // API Endpoint pattern (multi-lang)
  apiEndpoint: {
    name: 'REST API Endpoint',
    intent: 'Créer un endpoint API REST',
    multiLang: true,
    keywords: {
      typescript: ['router.', 'app.post', 'app.get', 'Hono', 'Express', '@Post', '@Get'],
      python: ['@app.route', 'def ', 'Flask', 'FastAPI', 'router.get', 'router.post'],
      php: ['Route::', 'public function', 'Controller', '->get(', '->post('],
      go: ['func Handler', 'http.HandleFunc', 'gin.', 'echo.'],
      rust: ['#\[route\(', 'pub async fn', 'Router::new()', 'get(', 'post('],
      java: ['@GetMapping', '@PostMapping', '@RequestMapping', 'public ']
    },
    minChunks: 2
  },

  // React Component pattern
  reactComponent: {
    name: 'React Component',
    intent: 'Composant React avec props',
    constraints: { framework: 'react' },
    keywords: ['export function', 'export const', 'React.FC', 'useState', 'useEffect'] as string[],
    minChunks: 2
  },

  // Database Service pattern (multi-lang)
  databaseService: {
    name: 'Database Service',
    intent: "Service d'accès aux données",
    multiLang: true,
    keywords: {
      typescript: ['SELECT', 'INSERT', 'UPDATE', 'db.query', 'db.run', 'queryBuilder'],
      python: ['SELECT', 'INSERT', 'UPDATE', 'cursor.execute', 'session.query', 'db.execute'],
      php: ['SELECT', 'INSERT', 'UPDATE', 'DB::', 'Query::Builder', '->select('],
      go: ['db.Query(', 'db.Exec(', 'SELECT', 'INSERT', 'UPDATE'],
      java: ['@Query', 'SELECT', 'INSERT', 'UPDATE', 'JdbcTemplate', 'repository']
    },
    minChunks: 3
  },

  // Test Suite pattern (multi-lang)
  testSuite: {
    name: 'Test Suite',
    intent: 'Suite de tests unitaires',
    multiLang: true,
    keywords: {
      typescript: ['describe(', 'it(', 'test(', 'expect(', 'jest.', 'vitest.'],
      python: ['def test_', 'class Test', 'unittest.', 'pytest.', 'assert '],
      php: ['test', 'assertEquals', 'assert', 'PHPUnit'],
      go: ['func Test', 't.Run(', 'assert.', 'require.'],
      rust: ['#\[test\]', 'assert_', 'mod tests'],
      java: ['@Test', 'assertEquals', 'assert', 'JUnit']
    },
    minChunks: 2
  },

  // Class/Struct pattern (multi-lang)
  classDefinition: {
    name: 'Class/Struct Definition',
    intent: 'Définition de classe ou structure',
    multiLang: true,
    keywords: {
      typescript: ['class ', 'interface ', 'type '],
      python: ['class ', 'def __init__'],
      php: ['class ', 'interface '],
      go: ['type ', 'struct '],
      rust: ['struct ', 'impl ', 'enum '],
      java: ['public class', 'interface ', 'enum ']
    },
    minChunks: 2
  },

  // Configuration pattern (multi-lang)
  configuration: {
    name: 'Configuration File',
    intent: 'Fichier de configuration',
    extensions: ['.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.config.js', '.config.ts'],
    minChunks: 1
  }
};

/**
 * Detect reusable patterns automatically from indexed code
 */
export async function detectAutoPatterns(
  db: Database,
  projectId: number,
  _stats: IndexStats
): Promise<Candidate[]> {
  const candidates: Candidate[] = [];

  // Get recently indexed chunks with language info
  const chunks = db.query<{
    id: number;
    content: string;
    file_id: number;
    path: string;
    lang?: string;
  }>(`
    SELECT c.id, c.content, c.file_id, f.path, f.lang
    FROM chunks c
    JOIN files f ON f.id = c.file_id
    WHERE f.project_id = ?
    ORDER BY c.id DESC
    LIMIT 100
  `, projectId);

  // Group by file with language
  const byFile = new Map<number, { chunks: typeof chunks; lang: string; path: string }>();
  for (const chunk of chunks) {
    if (!byFile.has(chunk.file_id)) {
      const detectedLang = chunk.lang || detectLanguage(chunk.content);
      byFile.set(chunk.file_id, {
        chunks: [],
        lang: detectedLang,
        path: chunk.path
      });
    }
    byFile.get(chunk.file_id)!.chunks.push(chunk);
  }

  // Analyze each file for pattern detection
  for (const [_fileId, { chunks: fileChunks, lang, path }] of byFile) {
    const combined = fileChunks.map(c => c.content).join('\n');

    for (const [key, pattern] of Object.entries(PATTERN_HEURISTICS)) {
      let matchCount = 0;
      let totalKeywords = 0;

      // Multi-language patterns
      if (pattern.multiLang && typeof pattern.keywords === 'object' && !Array.isArray(pattern.keywords)) {
        // Normalize language
        const normalizedLang = normalizeLang(lang);

        // Get keywords for this language
        const langKeywords = (pattern.keywords as Record<string, string[]>)[normalizedLang] || [];
        totalKeywords = langKeywords.length;

        matchCount = langKeywords.reduce((count: number, keyword: string) => {
          return count + (combined.includes(keyword) ? 1 : 0);
        }, 0);
      }
      // Framework-specific patterns (e.g., React)
      else if (Array.isArray(pattern.keywords)) {
        const keywords = pattern.keywords as string[];
        totalKeywords = keywords.length;
        matchCount = keywords.reduce((count, keyword) => {
          return count + (combined.includes(keyword) ? 1 : 0);
        }, 0);
      }
      // Extension-based patterns
      else if (pattern.extensions) {
        const hasMatchingExtension = pattern.extensions.some((ext: string) =>
          path.endsWith(ext)
        );
        if (hasMatchingExtension) {
          matchCount = 1;
          totalKeywords = 1;
        }
      }

      // If at least 50% of keywords match
      const threshold = totalKeywords * 0.5;
      if (totalKeywords > 0 && matchCount >= threshold && fileChunks.length >= (pattern.minChunks || 2)) {
        // Create a candidate automatically
        const now = Date.now();
        const sources: PatternSource[] = fileChunks.map(c => ({ chunkId: c.id }));

        const result = db.run(`
          INSERT INTO candidates (kind, sources_json, label, tags_json, status, created_at)
          VALUES (?, ?, ?, ?, 'pending', ?)
        `,
          'chunks',
          JSON.stringify(sources),
          `${pattern.name} (${lang})`,
          JSON.stringify(['auto-detected', key, lang]),
          now
        );

        const lastId = result.lastInsertRowid as number;

        candidates.push({
          id: lastId,
          kind: 'chunks',
          sources,
          label: `${pattern.name} (${lang})`,
          tags: ['auto-detected', key, lang],
          status: 'pending',
          created_at: now
        });
      }
    }
  }

  return candidates;
}

/**
 * Normalize language names to match heuristic keys
 */
function normalizeLang(lang: string): string {
  const langMap: Record<string, string> = {
    typescript: 'typescript',
    javascript: 'typescript',
    ts: 'typescript',
    js: 'typescript',
    python: 'python',
    py: 'python',
    php: 'php',
    go: 'go',
    rust: 'rust',
    rs: 'rust',
    java: 'java'
  };

  return langMap[lang.toLowerCase()] || lang.toLowerCase();
}

/**
 * Detect language from content (fallback)
 */
function detectLanguage(content: string): string {
  if (content.includes('package main') || content.includes('func ')) return 'go';
  if (content.includes('def ') || content.includes('import ')) return 'python';
  if (content.includes('class ') && content.includes('function ')) return 'typescript';
  if (content.includes('public class')) return 'java';
  if (content.includes('struct ') && content.includes('impl ')) return 'rust';
  if (content.includes('namespace ') || content.includes('class ')) return 'php';
  return 'unknown';
}
