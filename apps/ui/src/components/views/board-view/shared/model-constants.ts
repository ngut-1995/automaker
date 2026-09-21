import type { ModelOption, ModelProvider } from '@automaker/types';
import {
  CLAUDE_TIERS,
  CLAUDE_TIER_ROW_BY_TIER,
  CURSOR_MODEL_MAP,
  CODEX_MODELS,
  OPENCODE_MODELS as OPENCODE_MODEL_CONFIGS,
  GEMINI_MODEL_MAP,
  COPILOT_MODEL_MAP,
} from '@automaker/types';
import { Brain, Zap, Scale, Cpu, Rocket, Sparkles } from 'lucide-react';
import {
  AnthropicIcon,
  CursorIcon,
  OpenAIIcon,
  OpenCodeIcon,
  GeminiIcon,
  CopilotIcon,
} from '@/components/ui/provider-icon';

/**
 * `ModelOption` is declared once, in `@automaker/types`. Re-exported here so the
 * pickers that already import it alongside the lists below keep working.
 */
export type { ModelOption };

/**
 * Claude models with canonical prefixed IDs.
 *
 * Derived from the tier rows in `@automaker/types`, which is the one place the
 * tiers are enumerated: the UI stores canonical IDs and shows the tier's display
 * name, so both spellings come from the same row.
 */
export const CLAUDE_MODELS: ModelOption[] = CLAUDE_TIERS.map((tier) => {
  const row = CLAUDE_TIER_ROW_BY_TIER[tier];
  return {
    id: `claude-${tier}`,
    label: row.displayName,
    description: row.description,
    badge: row.badge,
    provider: 'claude',
  };
});

/**
 * Cursor models derived from CURSOR_MODEL_MAP
 * IDs already have 'cursor-' prefix in the canonical format
 */
export const CURSOR_MODELS: ModelOption[] = Object.entries(CURSOR_MODEL_MAP).map(
  ([id, config]) => ({
    id, // Already prefixed in canonical format
    label: config.label,
    description: config.description,
    provider: 'cursor' as ModelProvider,
    hasThinking: config.hasThinking,
  })
);

/**
 * Codex models.
 *
 * Not written out here: the list is the one the shared Codex catalogue derives,
 * so the picker cannot drift from the models the server accepts. It used to be
 * a hand-written copy, and it went stale at GPT-5.2 while the rest of Automaker
 * already knew about GPT-5.3 (ngut-1995/harbor#78).
 */
export { CODEX_MODELS };

/**
 * OpenCode models derived from OPENCODE_MODEL_CONFIGS
 */
export const OPENCODE_MODELS: ModelOption[] = OPENCODE_MODEL_CONFIGS.map((config) => ({
  id: config.id,
  label: config.label,
  description: config.description,
  badge: config.tier === 'free' ? 'Free' : config.tier === 'premium' ? 'Premium' : undefined,
  provider: config.provider as ModelProvider,
}));

/**
 * Gemini models derived from GEMINI_MODEL_MAP
 * Model IDs already have 'gemini-' prefix (like Cursor models)
 */
export const GEMINI_MODELS: ModelOption[] = Object.entries(GEMINI_MODEL_MAP).map(
  ([id, config]) => ({
    id, // IDs already have gemini- prefix (e.g., 'gemini-2.5-flash')
    label: config.label,
    description: config.description,
    badge: config.supportsThinking ? 'Thinking' : 'Speed',
    provider: 'gemini' as ModelProvider,
    hasThinking: config.supportsThinking,
  })
);

/**
 * Copilot models derived from COPILOT_MODEL_MAP
 * Model IDs already have 'copilot-' prefix
 */
export const COPILOT_MODELS: ModelOption[] = Object.entries(COPILOT_MODEL_MAP).map(
  ([id, config]) => ({
    id, // IDs already have copilot- prefix (e.g., 'copilot-gpt-4o')
    label: config.label,
    description: config.description,
    badge: config.supportsVision ? 'Vision' : 'Standard',
    provider: 'copilot' as ModelProvider,
    hasThinking: false,
  })
);

/**
 * All available models (Claude + Cursor + Codex + OpenCode + Gemini + Copilot)
 */
export const ALL_MODELS: ModelOption[] = [
  ...CLAUDE_MODELS,
  ...CURSOR_MODELS,
  ...CODEX_MODELS,
  ...OPENCODE_MODELS,
  ...GEMINI_MODELS,
  ...COPILOT_MODELS,
];

/**
 * Thinking levels and reasoning efforts, with their short labels, are declared
 * once in `@automaker/types` and re-exported here for the selectors that reach
 * for them alongside the model lists above.
 */
export {
  THINKING_LEVELS,
  THINKING_LEVEL_LABELS,
  REASONING_EFFORT_LEVELS,
  REASONING_EFFORT_LABELS,
} from '@automaker/types';

// Profile icon mapping
export const PROFILE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Zap,
  Scale,
  Cpu,
  Rocket,
  Sparkles,
  Anthropic: AnthropicIcon,
  Cursor: CursorIcon,
  Codex: OpenAIIcon,
  OpenCode: OpenCodeIcon,
  Gemini: GeminiIcon,
  Copilot: CopilotIcon,
};
