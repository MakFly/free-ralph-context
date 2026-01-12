/**
 * Synthesis Service - Dual-mode synthesis (Algorithmic + LLM)
 *
 * Supports three modes:
 * - 'auto': Automatically choose between algorithmic and LLM based on confidence
 * - 'algorithmic': Use advanced algorithmic synthesis without LLM
 * - 'llm': Use configured LLM provider (Anthropic, Mistral, OpenAI)
 *
 * Similar to claude-mem's approach but with configurable providers.
 */

import { AlgorithmicSynthesizer } from './synthesis/algo-synthesizer.js';
import {
  createProvider,
  type SynthesisProvider,
  type LLMProvider,
} from './synthesis/llm-providers.js';

// ============================================
// TYPES
// ============================================

export interface SearchResult {
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  symbol?: string;
  score?: number;
}

export interface SynthesizedObservation {
  type: string;
  title: string;
  subtitle?: string;
  narrative: string;
  concepts: string[];
  files_read: string[];
  tokenCount: number;
}

export type SynthesisMode = 'auto' | 'algorithmic' | 'llm';

export interface SynthesisSettings {
  mode: SynthesisMode;
  provider?: SynthesisProvider;
  apiKey?: string;
  model?: string;
  confidence?: number; // Confidence threshold for auto mode (default: 0.7)
}

export interface SynthesisResult {
  observation: SynthesizedObservation;
  mode: 'algorithmic' | 'llm';
  provider?: SynthesisProvider;
  confidence: number;
  processingTimeMs: number;
  compressionRatio: number;
}

// ============================================
// SYNTHESIS SERVICE
// ============================================

export class SynthesisService {
  private settings: SynthesisSettings;
  private algoSynthesizer: AlgorithmicSynthesizer;
  private llmProvider: LLMProvider | null = null;

  constructor(settings: Partial<SynthesisSettings> = {}) {
    this.settings = {
      mode: 'auto',
      provider: 'mistral',
      confidence: 0.7,
      ...settings,
    };
    this.algoSynthesizer = new AlgorithmicSynthesizer();

    // Initialize LLM provider if specified
    if (this.settings.provider) {
      try {
        this.llmProvider = createProvider(this.settings.provider);
      } catch {
        console.warn(`Failed to create provider: ${this.settings.provider}`);
      }
    }
  }

  /**
   * Main synthesis method - routes to appropriate mode
   */
  async synthesize(
    query: string,
    results: SearchResult[]
  ): Promise<SynthesisResult> {
    const startTime = Date.now();

    // Route based on mode
    if (this.settings.mode === 'auto') {
      return await this.autoSynthesize(query, results, startTime);
    }

    if (this.settings.mode === 'algorithmic') {
      return await this.algorithmicSynthesize(query, results, startTime);
    }

    // Mode LLM
    return await this.llmSynthesize(query, results, startTime);
  }

  /**
   * Auto mode: Decide between algorithmic and LLM based on confidence
   */
  private async autoSynthesize(
    query: string,
    results: SearchResult[],
    startTime: number
  ): Promise<SynthesisResult> {
    // Step 1: Try algorithmic synthesis first
    const algoResult = await this.algoSynthesizer.synthesize(query, results);
    const confidence = algoResult.confidence;

    // Step 2: If confidence is high enough, return algorithmic result
    const confidenceThreshold = this.settings.confidence || 0.7;
    if (confidence >= confidenceThreshold) {
      return {
        observation: {
          ...algoResult.observation,
          files_read: results.map(r => r.path),
        },
        mode: 'algorithmic',
        confidence,
        processingTimeMs: Date.now() - startTime,
        compressionRatio: algoResult.compressionRatio,
      };
    }

    // Step 3: Confidence low, try LLM if API key available
    const apiKey = this.getApiKey();
    if (apiKey && this.llmProvider) {
      try {
        return await this.llmSynthesize(query, results, startTime);
      } catch (error) {
        console.error('LLM synthesis failed, falling back to algorithmic:', error);
        // Fallback to algorithmic on LLM failure
        return {
          observation: {
            ...algoResult.observation,
            files_read: results.map(r => r.path),
          },
          mode: 'algorithmic',
          confidence,
          processingTimeMs: Date.now() - startTime,
          compressionRatio: algoResult.compressionRatio,
        };
      }
    }

    // Step 4: No API key, return algorithmic result
    return {
      observation: {
        ...algoResult.observation,
        files_read: results.map(r => r.path),
      },
      mode: 'algorithmic',
      confidence,
      processingTimeMs: Date.now() - startTime,
      compressionRatio: algoResult.compressionRatio,
    };
  }

  /**
   * Algorithmic synthesis - no LLM required
   */
  private async algorithmicSynthesize(
    query: string,
    results: SearchResult[],
    startTime: number
  ): Promise<SynthesisResult> {
    const algoResult = await this.algoSynthesizer.synthesize(query, results);

    return {
      observation: {
        ...algoResult.observation,
        files_read: results.map(r => r.path),
      },
      mode: 'algorithmic',
      confidence: algoResult.confidence,
      processingTimeMs: Date.now() - startTime,
      compressionRatio: algoResult.compressionRatio,
    };
  }

  /**
   * LLM synthesis - use configured provider
   */
  private async llmSynthesize(
    query: string,
    results: SearchResult[],
    startTime: number
  ): Promise<SynthesisResult> {
    if (!this.llmProvider) {
      throw new Error('No LLM provider configured');
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('No API key available for LLM synthesis');
    }

    const model = this.settings.model || this.llmProvider.getDefaultModel();
    const observation = await this.llmProvider.synthesize(query, results, apiKey, model);

    // Calculate compression ratio
    const originalTokens = results.reduce((sum, r) => sum + r.content.length / 4, 0);
    const compressionRatio = originalTokens / Math.max(observation.tokenCount, 1);

    return {
      observation: {
        ...observation,
        files_read: results.map(r => r.path),
      },
      mode: 'llm',
      provider: this.settings.provider,
      confidence: 0.95, // LLM has high confidence by default
      processingTimeMs: Date.now() - startTime,
      compressionRatio,
    };
  }

  /**
   * Get API key from settings or environment
   */
  private getApiKey(): string | undefined {
    // Priority: settings > environment variable
    if (this.settings.apiKey) {
      return this.settings.apiKey;
    }

    // Try environment variables based on provider
    const envVarMap: Record<SynthesisProvider, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      mistral: 'MISTRAL_API_KEY',
      openai: 'OPENAI_API_KEY',
    };

    if (this.settings.provider) {
      return process.env[envVarMap[this.settings.provider]];
    }

    return undefined;
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<SynthesisSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // Reinitialize LLM provider if changed
    if (settings.provider) {
      try {
        this.llmProvider = createProvider(settings.provider);
      } catch {
        console.warn(`Failed to create provider: ${settings.provider}`);
        this.llmProvider = null;
      }
    }
  }

  /**
   * Get current settings
   */
  getSettings(): SynthesisSettings {
    return { ...this.settings };
  }

  /**
   * Test if API key is valid for current provider
   */
  async testApiKey(apiKey: string): Promise<boolean> {
    if (!this.llmProvider) {
      throw new Error('No LLM provider configured');
    }
    return await this.llmProvider.testApiKey(apiKey);
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Legacy function for backward compatibility
 * @deprecated Use SynthesisService class directly
 */
export async function synthesizeSearchResults(
  query: string,
  results: SearchResult[],
  apiKey?: string
): Promise<SynthesizedObservation> {
  const service = new SynthesisService({
    mode: apiKey ? 'llm' : 'auto',
    apiKey,
  });
  const synthesisResult = await service.synthesize(query, results);
  return synthesisResult.observation;
}

/**
 * Create synthesis service from settings object
 */
export function createSynthesisService(settings: Partial<SynthesisSettings> = {}): SynthesisService {
  return new SynthesisService(settings);
}
