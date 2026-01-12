/**
 * LLM Provider Factory
 *
 * Supports multiple LLM providers for synthesis:
 * - Anthropic (Claude)
 * - Mistral AI
 * - OpenAI
 *
 * Each provider implements the same interface for unified usage.
 */

import { SearchResult, SynthesizedObservation } from '../synthesis.js';

// ============================================
// TYPES
// ============================================

export type SynthesisProvider = 'anthropic' | 'mistral' | 'openai';

export interface LLMProvider {
  name: SynthesisProvider;
  displayName: string;
  defaultModel: string;

  /**
   * Synthesize search results into a compact observation
   */
  synthesize(
    query: string,
    results: SearchResult[],
    apiKey: string,
    model?: string
  ): Promise<SynthesizedObservation>;

  /**
   * Test if API key is valid
   */
  testApiKey(apiKey: string): Promise<boolean>;

  /**
   * Get the default model for this provider
   */
  getDefaultModel(): string;
}

// ============================================
// ANTHROPIC PROVIDER
// ============================================

export class AnthropicProvider implements LLMProvider {
  name: SynthesisProvider = 'anthropic';
  displayName = 'Anthropic (Claude)';
  defaultModel = 'claude-3-5-haiku-20241022';
  private apiUrl = 'https://api.anthropic.com/v1/messages';

  async synthesize(
    query: string,
    results: SearchResult[],
    apiKey: string,
    model = this.defaultModel
  ): Promise<SynthesizedObservation> {
    const prompt = this.buildPrompt(query, results);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content[0].text;
    return this.parseResponse(text);
  }

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  private buildPrompt(query: string, results: SearchResult[]): string {
    const resultsSummary = results.slice(0, 5).map((r, i) =>
      `Result ${i + 1}: ${r.path}:${r.startLine}-${r.endLine}\n${r.content.slice(0, 200)}...`
    ).join('\n\n');

    return `Search Query: "${query}"

Found ${results.length} results. Top results:
${resultsSummary}

Generate a concise observation in this format:
<observation>
  <type>discovery</type>
  <title>Brief title (what was found)</title>
  <subtitle>Technical details (file, class, function)</subtitle>
  <narrative>2-3 sentence summary of what was discovered, focusing on the key insight</narrative>
  <concepts>
    <concept>key concept 1</concept>
    <concept>key concept 2</concept>
  </concepts>
</observation>`;
  }

  private parseResponse(text: string): SynthesizedObservation {
    return this.parseXMLResponse(text);
  }

  private parseXMLResponse(text: string): SynthesizedObservation {
    const extractField = (content: string, fieldName: string): string | null => {
      const regex = new RegExp(`<${fieldName}>([\\s\\S]*?)<\\/${fieldName}>`, 'is');
      const match = regex.exec(content);
      return match ? match[1].trim() : null;
    };

    const extractArray = (content: string, fieldName: string, itemName: string): string[] => {
      const regex = new RegExp(`<${fieldName}>([\\s\\S]*?)<\\/${fieldName}>`, 'is');
      const match = regex.exec(content);
      if (!match) return [];

      const itemRegex = new RegExp(`<${itemName}>([\\s\\S]*?)<\\/${itemName}>`, 'gis');
      const items: string[] = [];
      let itemMatch;
      while ((itemMatch = itemRegex.exec(match[1])) !== null) {
        items.push(itemMatch[1].trim());
      }
      return items;
    };

    return {
      type: extractField(text, 'type') || 'discovery',
      title: extractField(text, 'title') || 'Code Discovery',
      subtitle: extractField(text, 'subtitle') || undefined,
      narrative: extractField(text, 'narrative') || 'Found relevant code during search.',
      concepts: extractArray(text, 'concepts', 'concept'),
      files_read: [],
      tokenCount: Math.ceil(text.length / 4),
    };
  }
}

// ============================================
// MISTRAL PROVIDER
// ============================================

export class MistralProvider implements LLMProvider {
  name: SynthesisProvider = 'mistral';
  displayName = 'Mistral AI';
  defaultModel = 'mistral-small-latest';
  private apiUrl = 'https://api.mistral.ai/v1/chat/completions';

  async synthesize(
    query: string,
    results: SearchResult[],
    apiKey: string,
    model = this.defaultModel
  ): Promise<SynthesizedObservation> {
    const prompt = this.buildPrompt(query, results);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a code memory assistant. Generate concise, structured observations from search results. Focus on what was discovered, not implementation details.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const text = data.choices[0].message.content;

    return this.parseResponse(text);
  }

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  private buildPrompt(query: string, results: SearchResult[]): string {
    const resultsSummary = results.slice(0, 5).map((r, i) =>
      `Result ${i + 1}: ${r.path}:${r.startLine}-${r.endLine}\n${r.content.slice(0, 200)}...`
    ).join('\n\n');

    return `Search Query: "${query}"

Found ${results.length} results. Top results:
${resultsSummary}

Generate a concise observation in this format:
<observation>
  <type>discovery</type>
  <title>Brief title (what was found)</title>
  <subtitle>Technical details (file, class, function)</subtitle>
  <narrative>2-3 sentence summary of what was discovered, focusing on the key insight</narrative>
  <concepts>
    <concept>key concept 1</concept>
    <concept>key concept 2</concept>
  </concepts>
</observation>`;
  }

  private parseResponse(text: string): SynthesizedObservation {
    const extractField = (content: string, fieldName: string): string | null => {
      const regex = new RegExp(`<${fieldName}>([\\s\\S]*?)<\\/${fieldName}>`, 'is');
      const match = regex.exec(content);
      return match ? match[1].trim() : null;
    };

    const extractArray = (content: string, fieldName: string, itemName: string): string[] => {
      const regex = new RegExp(`<${fieldName}>([\\s\\S]*?)<\\/${fieldName}>`, 'is');
      const match = regex.exec(content);
      if (!match) return [];

      const itemRegex = new RegExp(`<${itemName}>([\\s\\S]*?)<\\/${itemName}>`, 'gis');
      const items: string[] = [];
      let itemMatch;
      while ((itemMatch = itemRegex.exec(match[1])) !== null) {
        items.push(itemMatch[1].trim());
      }
      return items;
    };

    return {
      type: extractField(text, 'type') || 'discovery',
      title: extractField(text, 'title') || 'Code Discovery',
      subtitle: extractField(text, 'subtitle') || undefined,
      narrative: extractField(text, 'narrative') || 'Found relevant code during search.',
      concepts: extractArray(text, 'concepts', 'concept'),
      files_read: [],
      tokenCount: Math.ceil(text.length / 4),
    };
  }
}

// ============================================
// OPENAI PROVIDER
// ============================================

export class OpenAIProvider implements LLMProvider {
  name: SynthesisProvider = 'openai';
  displayName = 'OpenAI';
  defaultModel = 'gpt-4o-mini';
  private apiUrl = 'https://api.openai.com/v1/chat/completions';

  async synthesize(
    query: string,
    results: SearchResult[],
    apiKey: string,
    model = this.defaultModel
  ): Promise<SynthesizedObservation> {
    const prompt = this.buildPrompt(query, results);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a code memory assistant. Generate concise, structured observations from search results. Focus on what was discovered, not implementation details.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const text = data.choices[0].message.content;

    return this.parseResponse(text);
  }

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  private buildPrompt(query: string, results: SearchResult[]): string {
    const resultsSummary = results.slice(0, 5).map((r, i) =>
      `Result ${i + 1}: ${r.path}:${r.startLine}-${r.endLine}\n${r.content.slice(0, 200)}...`
    ).join('\n\n');

    return `Search Query: "${query}"

Found ${results.length} results. Top results:
${resultsSummary}

Generate a concise observation in this format:
<observation>
  <type>discovery</type>
  <title>Brief title (what was found)</title>
  <subtitle>Technical details (file, class, function)</subtitle>
  <narrative>2-3 sentence summary of what was discovered, focusing on the key insight</narrative>
  <concepts>
    <concept>key concept 1</concept>
    <concept>key concept 2</concept>
  </concepts>
</observation>`;
  }

  private parseResponse(text: string): SynthesizedObservation {
    const extractField = (content: string, fieldName: string): string | null => {
      const regex = new RegExp(`<${fieldName}>([\\s\\S]*?)<\\/${fieldName}>`, 'is');
      const match = regex.exec(content);
      return match ? match[1].trim() : null;
    };

    const extractArray = (content: string, fieldName: string, itemName: string): string[] => {
      const regex = new RegExp(`<${fieldName}>([\\s\\S]*?)<\\/${fieldName}>`, 'is');
      const match = regex.exec(content);
      if (!match) return [];

      const itemRegex = new RegExp(`<${itemName}>([\\s\\S]*?)<\\/${itemName}>`, 'gis');
      const items: string[] = [];
      let itemMatch;
      while ((itemMatch = itemRegex.exec(match[1])) !== null) {
        items.push(itemMatch[1].trim());
      }
      return items;
    };

    return {
      type: extractField(text, 'type') || 'discovery',
      title: extractField(text, 'title') || 'Code Discovery',
      subtitle: extractField(text, 'subtitle') || undefined,
      narrative: extractField(text, 'narrative') || 'Found relevant code during search.',
      concepts: extractArray(text, 'concepts', 'concept'),
      files_read: [],
      tokenCount: Math.ceil(text.length / 4),
    };
  }
}

// ============================================
// PROVIDER FACTORY
// ============================================

export function createProvider(provider: SynthesisProvider): LLMProvider {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider();
    case 'mistral':
      return new MistralProvider();
    case 'openai':
      return new OpenAIProvider();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export const PROVIDERS: Record<SynthesisProvider, LLMProvider> = {
  anthropic: new AnthropicProvider(),
  mistral: new MistralProvider(),
  openai: new OpenAIProvider(),
};
