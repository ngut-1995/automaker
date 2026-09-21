/**
 * The OpenCode catalogue -- one table of OpenCode model rows.
 *
 * Every surface that lists OpenCode models derives from this table rather than
 * restating it: the UI's picker list, the server's model list and the
 * display-name lookup. The shape is the one the Codex catalogue established in
 * ngut-1995/harbor#82, so a reader who knows one provider's catalogue knows them
 * all, and the guard that keeps model rows inside catalogue modules has one
 * shape to recognise (ngut-1995/harbor#83).
 *
 * IMPORTANT: All OpenCode IDs use the 'opencode-' prefix. Settings written
 * before that rule used a slash (`opencode/big-pickle`); those spellings are
 * migrated by the legacy map below and are never catalogue keys.
 *
 * ## Declared, not exhaustive
 *
 * OpenCode discovers most of its models at runtime, by asking the CLI. This
 * table is only what Automaker declares statically -- the free tier it can
 * promise without asking -- so a picker has something to offer before the CLI
 * has answered. A discovered model reaches the picker the same way a declared
 * one does and wears no mark of its own: the picker does not know, and must not
 * need to know, which models were discovered.
 *
 * OpenCode declares no context window and no output ceiling here, and this table
 * does not invent them. `hasThinking` is false throughout: Automaker sends no
 * thinking level through OpenCode.
 */

import type { ModelDefinition } from './provider.js';
import type { ModelProvider } from './settings.js';

/**
 * OpenCode Model IDs
 *
 * Models Automaker declares statically; the CLI reports more at runtime.
 */
export type OpencodeModelId =
  // OpenCode Free Tier Models
  | 'opencode-big-pickle'
  | 'opencode-glm-5-free'
  | 'opencode-gpt-5-nano'
  | 'opencode-kimi-k2.5-free'
  | 'opencode-minimax-m2.5-free';

/**
 * Legacy OpenCode model IDs (with slash format) for migration support
 * Includes both current and previously-available models for backward compatibility.
 */
export type LegacyOpencodeModelId =
  | 'opencode/big-pickle'
  | 'opencode/glm-5-free'
  | 'opencode/gpt-5-nano'
  | 'opencode/kimi-k2.5-free'
  | 'opencode/minimax-m2.5-free'
  // Retired models (kept for migration from older settings)
  | 'opencode/glm-4.7-free'
  | 'opencode/grok-code'
  | 'opencode/minimax-m2.1-free';

/**
 * Provider type for OpenCode models
 */
export type OpencodeProvider = 'opencode';

/**
 * Friendly aliases mapped to full model IDs
 */
export const OPENCODE_MODEL_MAP: Record<string, OpencodeModelId> = {
  // OpenCode free tier aliases
  'big-pickle': 'opencode-big-pickle',
  pickle: 'opencode-big-pickle',
  'glm-free': 'opencode-glm-5-free',
  'glm-5': 'opencode-glm-5-free',
  'gpt-nano': 'opencode-gpt-5-nano',
  nano: 'opencode-gpt-5-nano',
  'kimi-free': 'opencode-kimi-k2.5-free',
  kimi: 'opencode-kimi-k2.5-free',
  minimax: 'opencode-minimax-m2.5-free',
} as const;

/**
 * Map from legacy slash-format model IDs to canonical prefixed IDs.
 * Retired models are mapped to their closest replacement.
 */
export const LEGACY_OPENCODE_MODEL_MAP: Record<LegacyOpencodeModelId, OpencodeModelId> = {
  // Current models
  'opencode/big-pickle': 'opencode-big-pickle',
  'opencode/glm-5-free': 'opencode-glm-5-free',
  'opencode/gpt-5-nano': 'opencode-gpt-5-nano',
  'opencode/kimi-k2.5-free': 'opencode-kimi-k2.5-free',
  'opencode/minimax-m2.5-free': 'opencode-minimax-m2.5-free',
  // Retired models → mapped to replacements
  'opencode/glm-4.7-free': 'opencode-glm-5-free',
  'opencode/grok-code': 'opencode-big-pickle', // grok-code retired, fallback to default
  'opencode/minimax-m2.1-free': 'opencode-minimax-m2.5-free',
};

/**
 * Map from retired canonical (dash-format) model IDs to their replacements.
 * Used to migrate settings that reference models no longer available.
 */
export const RETIRED_OPENCODE_MODEL_MAP: Record<string, OpencodeModelId> = {
  'opencode-glm-4.7-free': 'opencode-glm-5-free',
  'opencode-grok-code': 'opencode-big-pickle',
  'opencode-minimax-m2.1-free': 'opencode-minimax-m2.5-free',
};

/**
 * One OpenCode model, as every surface that lists OpenCode models sees it.
 *
 * Identity (`id`, `provider`), presentation (`label`, `description`, `badge`)
 * and capabilities (everything else). A surface takes the fields it needs and
 * invents none.
 */
export interface OpencodeModelRow {
  /** Canonical ID, always `opencode-` prefixed. The form stored on a feature. */
  id: OpencodeModelId;
  /** Display name, identical in the picker, the card badge and the output header. */
  label: string;
  /** One sentence explaining what the model is for. */
  description: string;
  /** Always `'opencode'`: the provider that serves the model. */
  provider: Extract<ModelProvider, 'opencode'>;
  /** One-word hint shown beside the label in a picker. */
  badge?: string;
  /** Cost class. Every declared OpenCode model is free tier. */
  tier: 'free' | 'standard' | 'premium';
  /** Whether the model accepts image inputs. */
  supportsVision: boolean;
  /** Whether the model can call tools. */
  supportsTools: boolean;
  /** Whether the model takes Automaker's thinking level. */
  hasThinking: boolean;
  /** Whether this is the model Automaker offers when OpenCode is first chosen. */
  isDefault: boolean;
}

/**
 * The catalogue itself, keyed by canonical ID.
 *
 * Ordered as the picker offers them, because every derived list inherits this
 * order.
 */
export const OPENCODE_MODEL_CATALOGUE: Record<OpencodeModelId, OpencodeModelRow> = {
  'opencode-big-pickle': {
    id: 'opencode-big-pickle',
    label: 'Big Pickle',
    description: 'OpenCode free tier model - great for general coding',
    provider: 'opencode',
    badge: 'Free',
    tier: 'free',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: true,
  },
  'opencode-glm-5-free': {
    id: 'opencode-glm-5-free',
    label: 'GLM 5 Free',
    description: 'OpenCode free tier GLM model',
    provider: 'opencode',
    badge: 'Free',
    tier: 'free',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'opencode-gpt-5-nano': {
    id: 'opencode-gpt-5-nano',
    label: 'GPT-5 Nano',
    description: 'OpenCode free tier nano model - fast and lightweight',
    provider: 'opencode',
    badge: 'Free',
    tier: 'free',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'opencode-kimi-k2.5-free': {
    id: 'opencode-kimi-k2.5-free',
    label: 'Kimi K2.5 Free',
    description: 'OpenCode free tier Kimi model for coding',
    provider: 'opencode',
    badge: 'Free',
    tier: 'free',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'opencode-minimax-m2.5-free': {
    id: 'opencode-minimax-m2.5-free',
    label: 'MiniMax M2.5 Free',
    description: 'OpenCode free tier MiniMax model',
    provider: 'opencode',
    badge: 'Free',
    tier: 'free',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
};

/**
 * The catalogue as a list, in catalogue order.
 *
 * This is what a surface maps over. Reach for it rather than
 * `Object.values(OPENCODE_MODEL_CATALOGUE)` so the order is stated once.
 */
export const OPENCODE_CATALOGUE_ROWS: OpencodeModelRow[] = Object.values(OPENCODE_MODEL_CATALOGUE);

/**
 * The server's statically declared OpenCode model list, derived from the
 * catalogue.
 *
 * This is the list the server falls back to until the CLI reports its own. A
 * model the CLI reports is converted separately, to the same `ModelDefinition`
 * shape, so that by the time a list reaches the picker a discovered model is
 * indistinguishable from a declared one.
 *
 * `tier` here is the server's three-value cost class, which has no `free`: the
 * free tier is its cheapest class, `basic`.
 */
export const OPENCODE_MODEL_DEFINITIONS: ModelDefinition[] = OPENCODE_CATALOGUE_ROWS.map((row) => ({
  id: row.id,
  name: row.label,
  modelString: row.id,
  provider: 'opencode',
  description: row.description,
  supportsTools: row.supportsTools,
  supportsVision: row.supportsVision,
  tier: row.tier === 'free' ? ('basic' as const) : row.tier,
  default: row.isDefault,
}));

/**
 * The model Automaker offers when OpenCode is first chosen, read off the row
 * that declares it rather than written a second time.
 */
export const DEFAULT_OPENCODE_MODEL: OpencodeModelId = (
  OPENCODE_CATALOGUE_ROWS.find((row) => row.isDefault) ?? OPENCODE_CATALOGUE_ROWS[0]
).id;

/**
 * Helper: Get display name for model
 *
 * Reads the provider's own catalogue, which is the same input `MODEL_DISPLAY_NAMES`
 * is assembled from -- not a second table.
 */
export function getOpencodeModelLabel(modelId: OpencodeModelId): string {
  return OPENCODE_MODEL_CATALOGUE[modelId]?.label ?? modelId;
}
/**
 * Helper: Get all OpenCode model IDs
 */
export function getAllOpencodeModelIds(): OpencodeModelId[] {
  return OPENCODE_CATALOGUE_ROWS.map((row) => row.id);
}

/**
 * Helper: Check if OpenCode model supports vision
 */
export function opencodeModelSupportsVision(modelId: OpencodeModelId): boolean {
  return OPENCODE_MODEL_CATALOGUE[modelId]?.supportsVision ?? false;
}

/**
 * Helper: Get the provider for a model
 */
export function getOpencodeModelProvider(modelId: OpencodeModelId): OpencodeProvider {
  return OPENCODE_MODEL_CATALOGUE[modelId]?.provider ?? 'opencode';
}

/**
 * Helper: Resolve an alias or partial model ID to a full model ID.
 * Also handles retired model IDs by mapping them to their replacements.
 */
export function resolveOpencodeModelId(input: string): OpencodeModelId | undefined {
  // Check if it's already a valid model ID
  if (OPENCODE_MODEL_CATALOGUE[input as OpencodeModelId]) {
    return input as OpencodeModelId;
  }

  // Check retired model map (handles old canonical IDs like 'opencode-grok-code')
  if (input in RETIRED_OPENCODE_MODEL_MAP) {
    return RETIRED_OPENCODE_MODEL_MAP[input];
  }

  // Check alias map
  const normalized = input.toLowerCase();
  return OPENCODE_MODEL_MAP[normalized];
}

/**
 * Helper: Check if a string is a valid OpenCode model ID
 */
export function isOpencodeModelId(value: string): value is OpencodeModelId {
  return value in OPENCODE_MODEL_CATALOGUE;
}

/**
 * Helper: Get models filtered by provider
 */
export function getOpencodeModelsByProvider(provider: OpencodeProvider): OpencodeModelRow[] {
  return OPENCODE_CATALOGUE_ROWS.filter((row) => row.provider === provider);
}

/**
 * Helper: Get models filtered by tier
 */
export function getOpencodeModelsByTier(tier: 'free' | 'standard' | 'premium'): OpencodeModelRow[] {
  return OPENCODE_CATALOGUE_ROWS.filter((row) => row.tier === tier);
}

/**
 * Helper: Get free tier models
 */
export function getOpencodeFreeModels(): OpencodeModelRow[] {
  return getOpencodeModelsByTier('free');
}
