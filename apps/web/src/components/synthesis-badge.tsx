/**
 * Synthesis Provider Badge Component
 *
 * Displays the current synthesis provider/mode status
 * Shows:
 * - "Algo" for algorithmic mode (blue)
 * - "Anthropic" for Anthropic provider (green)
 * - "Mistral" for Mistral provider (green)
 * - "OpenAI" for OpenAI provider (green)
 * - "Not configured" for unconfigured (yellow)
 */

import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useNexusStore } from '@/stores/nexusStore';
import { Brain, Zap, Cpu, AlertCircle } from 'lucide-react';

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  anthropic: <Brain className="h-3 w-3" />,
  mistral: <Zap className="h-3 w-3" />,
  openai: <Cpu className="h-3 w-3" />,
  algorithmic: <Cpu className="h-3 w-3" />,
  auto: <Zap className="h-3 w-3" />,
};

export function SynthesisProviderBadge() {
  const { synthesisStatus, fetchSynthesisStatus } = useNexusStore();

  useEffect(() => {
    fetchSynthesisStatus();
  }, [fetchSynthesisStatus]);

  if (!synthesisStatus) {
    return null;
  }

  // Determine badge variant and text
  let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary';
  let text = '';
  let icon: React.ReactNode = null;

  if (synthesisStatus.mode === 'algorithmic') {
    variant = 'default';
    text = 'Algo';
    icon = PROVIDER_ICONS.algorithmic;
  } else if (synthesisStatus.mode === 'llm') {
    if (synthesisStatus.configured) {
      variant = 'default';
      text = synthesisStatus.provider || 'LLM';
      icon = PROVIDER_ICONS[synthesisStatus.provider || ''];
    } else {
      variant = 'outline';
      text = 'Not configured';
      icon = <AlertCircle className="h-3 w-3" />;
    }
  } else if (synthesisStatus.mode === 'auto') {
    if (synthesisStatus.configured) {
      variant = 'default';
      text = `Auto (${synthesisStatus.provider})`;
      icon = PROVIDER_ICONS[synthesisStatus.provider || ''];
    } else {
      variant = 'outline';
      text = 'Auto (Algo)';
      icon = <Zap className="h-3 w-3" />;
    }
  }

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      <span>{text}</span>
    </Badge>
  );
}
