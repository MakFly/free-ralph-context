/**
 * Synthesis Provider Config Component
 *
 * Allows users to configure the synthesis provider:
 * - Mode selection (Auto, Algorithmic, LLM)
 * - Provider selection (Anthropic, Mistral, OpenAI)
 * - API key management with test button
 * - Confidence threshold for auto mode
 */

import { useState, useEffect } from 'react';
import { useNexusStore } from '@/stores/nexusStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Brain,
  Zap,
  Cpu,
  Check,
  X,
  Loader2,
} from 'lucide-react';

type SynthesisMode = 'auto' | 'algorithmic' | 'llm';
type SynthesisProvider = 'anthropic' | 'mistral' | 'openai';

interface SynthesisSettings {
  mode: SynthesisMode;
  provider: SynthesisProvider;
  confidence: number;
  model?: string;
  configured: boolean;
  apiKeyMasked?: string;
}

const PROVIDER_INFO: Record<SynthesisProvider, { name: string; icon: React.ReactNode; defaultModel: string }> = {
  anthropic: { name: 'Anthropic (Claude)', icon: <Brain className="h-4 w-4" />, defaultModel: 'claude-3-5-haiku-20241022' },
  mistral: { name: 'Mistral AI', icon: <Zap className="h-4 w-4" />, defaultModel: 'mistral-small-latest' },
  openai: { name: 'OpenAI', icon: <Cpu className="h-4 w-4" />, defaultModel: 'gpt-4o-mini' },
};

const MODE_DESCRIPTIONS: Record<SynthesisMode, string> = {
  auto: 'Automatically choose the best mode based on query complexity and API key availability',
  algorithmic: 'Use advanced algorithms without external API (free, ~30:1 compression)',
  llm: 'Use LLM for high-quality synthesis (requires API key, ~100:1 compression)',
};

export function SynthesisConfig() {
  const { apiBaseUrl, fetchSynthesisStatus } = useNexusStore();
  const [settings, setSettings] = useState<SynthesisSettings>({
    mode: 'auto',
    provider: 'anthropic',
    confidence: 0.7,
    configured: false,
  });
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'valid' | 'invalid' | 'testing' | null>(null);

  // Fetch synthesis settings on mount
  useEffect(() => {
    fetchSynthesisSettings();
  }, [apiBaseUrl]);

  const fetchSynthesisSettings = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/settings/synthesis`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch synthesis settings:', error);
    }
  };

  const testApiKey = async () => {
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    setIsTesting(true);
    setKeyStatus('testing');

    try {
      const response = await fetch(`${apiBaseUrl}/settings/test-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: settings.provider, api_key: apiKey }),
      });

      const result = await response.json();
      if (result.valid) {
        setKeyStatus('valid');
        toast.success('API key is valid');
      } else {
        setKeyStatus('invalid');
        toast.error('Invalid API key');
      }
    } catch (error) {
      setKeyStatus('invalid');
      toast.error('Failed to test API key');
    } finally {
      setIsTesting(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`${apiBaseUrl}/settings/synthesis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: settings.mode,
          provider: settings.provider,
          apiKey: settings.mode === 'llm' || settings.mode === 'auto' ? apiKey : undefined,
          confidence: settings.confidence,
        }),
      });

      if (response.ok) {
        toast.success('Synthesis settings saved');
        await fetchSynthesisSettings();
        // Refresh the synthesis status in the store to update the badge
        await fetchSynthesisStatus();
        setApiKey('');
        setKeyStatus(null);
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle>Synthesis Provider</CardTitle>
        </div>
        <CardDescription>
          Configure how Nexus generates observations from search results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-3">
          <Label>Synthesis Mode</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['auto', 'algorithmic', 'llm'] as SynthesisMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSettings({ ...settings, mode })}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  settings.mode === mode
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {mode === 'auto' && <Zap className="h-5 w-5" />}
                {mode === 'algorithmic' && <Cpu className="h-5 w-5" />}
                {mode === 'llm' && <Brain className="h-5 w-5" />}
                <span className="text-sm font-medium capitalize">{mode}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {MODE_DESCRIPTIONS[settings.mode]}
          </p>
        </div>

        {/* Provider Selection (for LLM or Auto mode) */}
        {(settings.mode === 'llm' || settings.mode === 'auto') && (
          <div className="space-y-3">
            <Label>LLM Provider</Label>
            <Select
              value={settings.provider}
              onValueChange={(value) => setSettings({ ...settings, provider: value as SynthesisProvider })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {info.icon}
                      {info.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Default model: {PROVIDER_INFO[settings.provider].defaultModel}
            </p>
          </div>
        )}

        {/* API Key Input */}
        {(settings.mode === 'llm' || settings.mode === 'auto') && (
          <div className="space-y-3">
            <Label>
              API Key ({PROVIDER_INFO[settings.provider].name})
            </Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${PROVIDER_INFO[settings.provider].name} API key`}
                className="flex-1"
              />
              <Button
                onClick={testApiKey}
                disabled={isTesting || !apiKey}
                variant="outline"
                size="sm"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>

            {/* Key Status */}
            {keyStatus === 'valid' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>API key is valid</span>
              </div>
            )}
            {keyStatus === 'invalid' && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <X className="h-4 w-4" />
                <span>Invalid API key</span>
              </div>
            )}

            {/* Current Key Status */}
            {settings.configured && settings.apiKeyMasked && !apiKey && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4" />
                <span>API key configured: {settings.apiKeyMasked}</span>
              </div>
            )}
          </div>
        )}

        {/* Confidence Threshold (Auto mode only) */}
        {settings.mode === 'auto' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Confidence Threshold</Label>
              <Badge variant="outline">{settings.confidence.toFixed(2)}</Badge>
            </div>
            <Slider
              value={[settings.confidence]}
              onValueChange={([value]) => setSettings({ ...settings, confidence: value })}
              min={0.1}
              max={1}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Minimum confidence for algorithmic mode. Lower values favor LLM synthesis.
            </p>
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                settings.mode === 'algorithmic'
                  ? 'bg-blue-500'
                  : settings.configured
                  ? 'bg-green-500'
                  : 'bg-yellow-500'
              }`}
            />
            <span className="text-sm">
              {settings.mode === 'algorithmic'
                ? 'Algorithmic mode active (no API required)'
                : settings.configured
                ? `${PROVIDER_INFO[settings.provider].name} configured`
                : 'No API key configured'}
            </span>
          </div>
          <Button onClick={saveSettings} disabled={isSaving} size="sm">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
