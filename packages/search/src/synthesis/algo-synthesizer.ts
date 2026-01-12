/**
 * Algorithmic Synthesizer - Advanced synthesis without LLM
 *
 * Generates rich observations from search results using:
 * - Symbol extraction (classes, functions, interfaces)
 * - Pattern detection (design patterns, anti-patterns)
 * - Structure analysis (imports, exports, complexity)
 * - Smart narrative templates
 */

import { SearchResult } from '../synthesis.js';

// ============================================
// TYPES
// ============================================

export interface CodeContext {
  languages: Set<string>;
  frameworks: Set<string>;
  symbols: {
    classes: Set<string>;
    functions: Set<string>;
    interfaces: Set<string>;
    variables: Set<string>;
  };
  patterns: Set<string>;
}

export interface StructureInfo {
  hasImports: boolean;
  hasExports: boolean;
  isAsyncFunction: boolean;
  complexity: number;
  lineCount: number;
}

export interface Metrics {
  resultCount: number;
  uniqueSymbols: number;
  patternMatches: number;
  fileDiversity: number;
}

export interface AlgorithmicSynthesisResult {
  observation: {
    type: string;
    title: string;
    subtitle?: string;
    narrative: string;
    concepts: string[];
    files_read: string[];
    tokenCount: number;
  };
  confidence: number;
  compressionRatio: number;
  processingTimeMs: number;
}

// ============================================
// TEMPLATES
// ============================================

const TEMPLATES = {
  discovery: {
    singleFile: (
      symbolCount: number,
      path: string,
      symbols: string[]
    ) => `Found ${symbolCount} symbols in ${path}: ${symbols.slice(0, 3).join(', ')}${symbolCount > 3 ? '...' : ''}.`,

    multiFile: (
      resultCount: number,
      fileCount: number,
      symbols: string[],
      patterns: string[]
    ) => {
      const symbolList = symbols.slice(0, 4).join(', ');
      const patternList = patterns.length > 0 ? `. Patterns: ${patterns.slice(0, 2).join(', ')}` : '';
      return `Discovered ${resultCount} code segments across ${fileCount} files. Key implementations: ${symbolList}${patternList}.`;
    },

    api: (
      endpoints: string[],
      callers: string[]
    ) => `API endpoint(s) detected: ${endpoints.join(', ')}. Used by: ${callers.slice(0, 3).join(', ')}.`,
  },

  refactor: {
    extraction: (
      target: string,
      sources: string[],
      complexity: number
    ) => `Refactoring opportunity: ${target} could be extracted from ${sources.join(', ')}. Complexity: ${complexity}.`,

    simplification: (
      symbol: string,
      cognitiveLoad: number,
      dependencies: number
    ) => `Simplify ${symbol}: ${cognitiveLoad} cognitive load, ${dependencies} dependencies.`,
  },

  feature: {
    implementation: (
      feature: string,
      files: string[],
      frameworks: string[]
    ) => `Feature implementation: ${feature} in ${files.join(', ')}. Uses ${frameworks.join(', ')}.`,

    integration: (
      module: string,
      components: string[]
    ) => `Integration point: ${module} connects ${components.slice(0, 3).join(', ')}.`,
  },
};

// ============================================
// EXTRACTION PATTERNS
// ============================================

const EXTRACTION_PATTERNS = {
  typescript: [
    { pattern: /(?:class|interface|type)\s+(\w+)/g, type: 'class' },
    { pattern: /(?:function|const)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g, type: 'function' },
    { pattern: /(?:export\s+)?(?:default\s+)?class\s+(\w+)/g, type: 'class' },
    { pattern: /interface\s+(\w+)/g, type: 'interface' },
  ],

  python: [
    { pattern: /class\s+(\w+)\s*:/g, type: 'class' },
    { pattern: /def\s+(\w+)\s*\(/g, type: 'function' },
  ],

  javascript: [
    { pattern: /class\s+(\w+)/g, type: 'class' },
    { pattern: /function\s+(\w+)\s*\(/g, type: 'function' },
    { pattern: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g, type: 'function' },
  ],

  go: [
    { pattern: /type\s+(\w+)\s+struct/g, type: 'class' },
    { pattern: /func\s+(\w+)\s*\(/g, type: 'function' },
  ],

  rust: [
    { pattern: /struct\s+(\w+)/g, type: 'class' },
    { pattern: /fn\s+(\w+)\s*\(/g, type: 'function' },
    { pattern: /trait\s+(\w+)/g, type: 'interface' },
  ],
};

const FRAMEWORK_PATTERNS = {
  react: /import.*from\s+['"]react['"]|React\./,
  vue: /import.*from\s+['"]vue['"]|defineComponent/,
  angular: /import.*from\s+['"]@angular['"]/,
  express: /import.*from\s+['"]express['"]|require\(['"]express['"]\)/,
  fastapi: /from\s+fastapi|FastAPI\(/,
  django: /from\s+django\.|django\./,
  flask: /from\s+flask|Flask\(/,
};

const DESIGN_PATTERNS = {
  factory: /factory|create\(|build\(/i,
  singleton: /getInstance|instance\s*=\s*new|private\s+static\s+instance/i,
  observer: /subscribe|on\(|emit\(|addEventListener/i,
  repository: /repository|dao/i,
  strategy: /strategy|execute\(|handle\(/i,
  decorator: /@|decorator|wrapper/i,
  middleware: /middleware|use\(|next\(/i,
};

// ============================================
// ALGORITHMIC SYNTHESIZER
// ============================================

export class AlgorithmicSynthesizer {
  /**
   * Main synthesis method - generates observation without LLM
   */
  async synthesize(
    query: string,
    results: SearchResult[]
  ): Promise<AlgorithmicSynthesisResult> {
    const startTime = Date.now();

    // Extract code context
    const context = this.extractCodeContext(results);

    // Detect patterns
    const patterns = this.detectPatterns(results);

    // Calculate metrics
    const metrics: Metrics = {
      resultCount: results.length,
      uniqueSymbols: this.countUniqueSymbols(context),
      patternMatches: patterns.length,
      fileDiversity: new Set(results.map(r => r.path)).size,
    };

    // Calculate confidence
    const confidence = this.calculateConfidence(metrics);

    // Determine observation type
    const type = this.determineType(query, context, patterns);

    // Generate narrative
    const narrative = this.generateNarrative(
      type,
      query,
      context,
      patterns,
      results
    );

    // Calculate compression
    const originalTokens = results.reduce((sum, r) => sum + r.content.length / 4, 0);
    const synthesizedTokens = narrative.length / 4 + this.countUniqueSymbols(context) * 2;
    const compressionRatio = originalTokens / Math.max(synthesizedTokens, 1);

    const processingTimeMs = Date.now() - startTime;

    // Build concepts list
    const concepts = this.buildConcepts(query, context, patterns);

    return {
      observation: {
        type,
        title: this.generateTitle(type, query, metrics),
        subtitle: this.generateSubtitle(results, context),
        narrative,
        concepts,
        files_read: Array.from(new Set(results.map(r => r.path))),
        tokenCount: Math.ceil(synthesizedTokens),
      },
      confidence,
      compressionRatio,
      processingTimeMs,
    };
  }

  /**
   * Extract code context from search results
   */
  private extractCodeContext(results: SearchResult[]): CodeContext {
    const context: CodeContext = {
      languages: new Set(),
      frameworks: new Set(),
      symbols: {
        classes: new Set(),
        functions: new Set(),
        interfaces: new Set(),
        variables: new Set(),
      },
      patterns: new Set(),
    };

    for (const result of results) {
      // Detect language from file extension
      const ext = result.path.split('.').pop();
      if (ext) {
        const langMap: Record<string, string> = {
          ts: 'typescript',
         tsx: 'typescript',
          js: 'javascript',
          jsx: 'javascript',
          py: 'python',
          go: 'go',
          rs: 'rust',
        };
        if (langMap[ext]) {
          context.languages.add(langMap[ext]);
        }
      }

      // Detect frameworks
      for (const [framework, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
        if (pattern.test(result.content)) {
          context.frameworks.add(framework);
        }
      }

      // Extract symbols based on language
      const lang = Array.from(context.languages)[0];
      const patterns = EXTRACTION_PATTERNS[lang as keyof typeof EXTRACTION_PATTERNS];
      if (patterns) {
        for (const { pattern, type } of patterns) {
          const matches = result.content.matchAll(pattern);
          for (const match of matches) {
            if (match[1]) {
              if (type === 'class') context.symbols.classes.add(match[1]);
              if (type === 'function') context.symbols.functions.add(match[1]);
              if (type === 'interface') context.symbols.interfaces.add(match[1]);
            }
          }
        }
      }
    }

    return context;
  }

  /**
   * Detect design and anti-patterns
   */
  private detectPatterns(results: SearchResult[]): string[] {
    const detected: string[] = [];

    for (const [patternName, pattern] of Object.entries(DESIGN_PATTERNS)) {
      for (const result of results) {
        if (pattern.test(result.content)) {
          detected.push(patternName);
          break;
        }
      }
    }

    return detected;
  }

  /**
   * Calculate confidence score (0.0 - 1.0)
   */
  calculateConfidence(metrics: Metrics): number {
    let score = 0.5; // Base score

    // Boost for many results
    score += Math.min(metrics.resultCount / 20, 0.15);

    // Boost for diverse symbols
    score += Math.min(metrics.uniqueSymbols / 10, 0.15);

    // Boost for pattern matches
    if (metrics.patternMatches > 0) {
      score += Math.min(metrics.patternMatches * 0.1, 0.15);
    }

    // Boost for file diversity
    score += Math.min(metrics.fileDiversity / 5, 0.15);

    return Math.min(score, 1.0);
  }

  /**
   * Determine observation type based on context
   */
  private determineType(
    query: string,
    _context: CodeContext,
    _patterns: string[]
  ): string {
    const queryLower = query.toLowerCase();

    // Check for refactor keywords
    if (/\b(refactor|improve|fix|optimize|clean)\b/i.test(queryLower)) {
      return 'refactor';
    }

    // Check for feature keywords
    if (/\b(add|implement|create|build|feature)\b/i.test(queryLower)) {
      return 'feature';
    }

    // Check for bug fix keywords
    if (/\b(bug|error|issue|problem|fix)\b/i.test(queryLower)) {
      return 'bugfix';
    }

    // Default to discovery
    return 'discovery';
  }

  /**
   * Generate narrative using templates
   */
  private generateNarrative(
    type: string,
    query: string,
    context: CodeContext,
    patterns: string[],
    results: SearchResult[]
  ): string {
    const symbols = [
      ...Array.from(context.symbols.classes),
      ...Array.from(context.symbols.functions),
      ...Array.from(context.symbols.interfaces),
    ];

    const files = Array.from(new Set(results.map(r => r.path)));

    if (type === 'discovery') {
      if (files.length === 1) {
        return TEMPLATES.discovery.singleFile(
          symbols.length,
          files[0],
          symbols
        );
      }
      return TEMPLATES.discovery.multiFile(
        results.length,
        files.length,
        symbols,
        Array.from(patterns)
      );
    }

    if (type === 'refactor') {
      if (symbols.length > 0) {
        return TEMPLATES.refactor.simplification(
          symbols[0],
          results.length,
          symbols.length
        );
      }
      return `Refactoring opportunity found in ${files.length} files with ${results.length} code segments.`;
    }

    if (type === 'feature') {
      const frameworks = Array.from(context.frameworks);
      return TEMPLATES.feature.implementation(
        query,
        files.slice(0, 3),
        frameworks
      );
    }

    // Default narrative
    return `Found ${results.length} code segments matching "${query}" across ${files.length} files. Key symbols: ${symbols.slice(0, 5).join(', ')}.`;
  }

  /**
   * Generate title
   */
  private generateTitle(type: string, query: string, metrics: Metrics): string {
    const titles: Record<string, string> = {
      discovery: `Found ${metrics.resultCount} results for "${query}"`,
      refactor: `Refactoring opportunity: ${query}`,
      feature: `Feature: ${query}`,
      bugfix: `Bug fix: ${query}`,
    };
    return titles[type] || `Search results for "${query}"`;
  }

  /**
   * Generate subtitle
   */
  private generateSubtitle(results: SearchResult[], context: CodeContext): string {
    const files = Array.from(new Set(results.map(r => r.path)));
    const frameworks = Array.from(context.frameworks);
    const symbols = [
      ...Array.from(context.symbols.classes).slice(0, 2),
      ...Array.from(context.symbols.functions).slice(0, 2),
    ];

    const parts: string[] = [];
    if (files.length === 1) {
      parts.push(files[0]);
    } else {
      parts.push(`${files.length} files`);
    }
    if (frameworks.length > 0) {
      parts.push(`using ${frameworks[0]}`);
    }
    if (symbols.length > 0) {
      parts.push(`symbols: ${symbols.slice(0, 2).join(', ')}`);
    }

    return parts.join(' • ');
  }

  /**
   * Build concepts list
   */
  private buildConcepts(
    query: string,
    context: CodeContext,
    patterns: string[]
  ): string[] {
    const concepts: string[] = [query];

    // Add symbols
    const symbols = [
      ...Array.from(context.symbols.classes).slice(0, 3),
      ...Array.from(context.symbols.functions).slice(0, 3),
    ];
    concepts.push(...symbols);

    // Add frameworks
    concepts.push(...Array.from(context.frameworks).slice(0, 2));

    // Add patterns
    concepts.push(...patterns.slice(0, 2));

    // Add languages
    concepts.push(...Array.from(context.languages).slice(0, 2));

    return concepts;
  }

  /**
   * Count unique symbols
   */
  private countUniqueSymbols(context: CodeContext): number {
    return (
      context.symbols.classes.size +
      context.symbols.functions.size +
      context.symbols.interfaces.size
    );
  }
}
