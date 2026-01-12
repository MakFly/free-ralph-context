-- Migration 008: Synthesis Settings
--
-- Adds default settings for the synthesis system
-- The synthesis system generates compact observations from search results
-- using either algorithmic synthesis or LLM providers

-- Synthesis mode: auto, algorithmic, or llm
INSERT INTO settings (key, value, encrypted, category, updated_at) VALUES
  ('synthesis_mode', 'auto', 0, 'synthesis', datetime('now'));

-- LLM provider: anthropic, mistral, or openai
INSERT INTO settings (key, value, encrypted, category, updated_at) VALUES
  ('synthesis_provider', 'anthropic', 0, 'synthesis', datetime('now'));

-- Confidence threshold for auto mode (0.1 - 1.0)
INSERT INTO settings (key, value, encrypted, category, updated_at) VALUES
  ('synthesis_confidence', '0.7', 0, 'synthesis', datetime('now'));

-- Default model for synthesis (provider-specific)
INSERT INTO settings (key, value, encrypted, category, updated_at) VALUES
  ('synthesis_model', 'claude-3-5-haiku-20241022', 0, 'synthesis', datetime('now'));
