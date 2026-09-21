/**
 * The server's Codex model list.
 *
 * Derived from the Codex catalogue in `@automaker/types`, which is the one place
 * Codex models are enumerated. Writing the list out here a second time is how
 * the picker and the server drifted apart in the first place
 * (ngut-1995/harbor#78), so this module contributes the lookups and nothing else.
 *
 * Official Codex CLI models: https://developers.openai.com/codex/models/
 */

import { CODEX_MODEL_DEFINITIONS } from '@automaker/types';
import type { ModelDefinition } from './types.js';

/**
 * All available Codex models with their specifications, in catalogue order.
 */
export const CODEX_MODELS: ModelDefinition[] = CODEX_MODEL_DEFINITIONS;

/**
 * Get model definition by ID
 */
export function getCodexModelById(modelId: string): ModelDefinition | undefined {
  return CODEX_MODELS.find((m) => m.id === modelId || m.modelString === modelId);
}

/**
 * Get all models that support reasoning
 */
export function getReasoningModels(): ModelDefinition[] {
  return CODEX_MODELS.filter((m) => m.hasReasoning);
}

/**
 * Get models by tier
 */
export function getModelsByTier(tier: 'premium' | 'standard' | 'basic'): ModelDefinition[] {
  return CODEX_MODELS.filter((m) => m.tier === tier);
}
