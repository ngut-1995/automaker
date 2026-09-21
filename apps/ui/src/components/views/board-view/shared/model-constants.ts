import type { ModelOption } from '@automaker/types';
import {
  CLAUDE_TIERS,
  CLAUDE_TIER_ROW_BY_TIER,
  CURSOR_MODELS,
  CODEX_MODELS,
  OPENCODE_MODELS,
  GEMINI_MODELS,
  COPILOT_MODELS,
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
 * The picker lists for every provider whose models live in a shared catalogue.
 *
 * None of them is written out here: each is the list the provider's own
 * catalogue in `@automaker/types` derives, so the picker cannot offer a model
 * the server does not accept, or miss one it does. Codex was the last list
 * written by hand, and it went stale at GPT-5.2 while the rest of Automaker
 * already knew about GPT-5.3 (ngut-1995/harbor#78); the remaining four followed
 * it into the catalogue shape in ngut-1995/harbor#83.
 *
 * OpenCode's list is only the models Automaker declares statically. The picker
 * appends the ones the OpenCode CLI discovers at runtime and renders both the
 * same way -- a discovered model wears no mark of its own.
 */
export { CURSOR_MODELS, CODEX_MODELS, OPENCODE_MODELS, GEMINI_MODELS, COPILOT_MODELS };

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
