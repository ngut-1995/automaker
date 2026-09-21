/**
 * The Codex catalogue -- one table of Codex model rows.
 *
 * Every surface that lists Codex models derives from this table rather than
 * restating it: the UI's picker list, the server's model list and the
 * display-name lookup. Codex used to be the one provider written out by hand on
 * both sides, and it is the one that drifted -- the picker stopped at 5.2 while
 * the server, the display names and the shared types all knew about 5.3
 * (ngut-1995/harbor#78).
 *
 * Reference: https://developers.openai.com/codex/models/
 *
 * IMPORTANT: All Codex models use the 'codex-' prefix, which is what keeps them
 * distinct from Cursor's own `gpt-` rows (`cursor-gpt-5.2` vs `codex-gpt-5.2`).
 *
 * ## What a row settles
 *
 * The declarations this table replaces disagreed in two places, so the table
 * decides rather than leaving each side to guess:
 *
 * - **Reasoning, not thinking.** Two declarations carried the same fact under
 *   two names (`hasThinking` here, `hasReasoning` in the picker rows). A Codex
 *   model takes an *effort level*, never Automaker's thinking level, so the row
 *   carries `hasReasoning` and nothing else (see CONTEXT.md, "Reasoning depth").
 * - **One label per model.** The general-purpose rows were called both
 *   "GPT-5.2" and "GPT-5.2 (Codex)". The user-visible answer wins: the display
 *   lookup has always named them without the qualifier, and the picker the user
 *   chooses from must read the same as the card badge that results.
 *
 * `badge` and `tier` look alike but are not the same fact and both are kept:
 * `tier` is the cost/capability class the server reports, `badge` is the
 * one-word hint the picker shows. Spark is a `premium` model wearing a `Speed`
 * badge, and that is the point of it.
 */

import type { ModelProvider } from './settings.js';
import type { ModelDefinition } from './provider.js';
import { CODEX_MODEL_MAP, type CodexModelId } from './model.js';

const CONTEXT_WINDOW_256K = 256000;
const CONTEXT_WINDOW_128K = 128000;
const MAX_OUTPUT_32K = 32000;
const MAX_OUTPUT_16K = 16000;

/** The one-word hint a picker row shows next to the label. */
export type CodexBadge = 'Premium' | 'Balanced' | 'Speed';

/** The cost/capability class the server reports for a model. */
export type CodexTier = 'premium' | 'standard' | 'basic';

/**
 * One Codex model, as every surface that lists Codex models sees it.
 *
 * This is the row shape a provider catalogue is expected to carry: identity
 * (`id`, `provider`), presentation (`label`, `description`, `badge`) and
 * capabilities (everything else). A surface takes the fields it needs and
 * invents none.
 */
export interface CodexModelRow {
  /** Canonical ID, always `codex-` prefixed. The form stored on a feature. */
  id: CodexModelId;
  /** Display name, identical in the picker, the card badge and the output header. */
  label: string;
  /** One sentence explaining what the model is for. */
  description: string;
  /** Always `'codex'`: the provider that serves the model. */
  provider: Extract<ModelProvider, 'codex'>;
  /** One-word hint shown beside the label in a picker. */
  badge: CodexBadge;
  /** Cost/capability class. */
  tier: CodexTier;
  /** Whether the model accepts image inputs. */
  supportsVision: boolean;
  /** Whether the model can call tools. */
  supportsTools: boolean;
  /** Whether the model accepts a reasoning effort level. */
  hasReasoning: boolean;
  /** Input tokens the model accepts. */
  contextWindow: number;
  /** Output tokens the model can produce in one response. */
  maxOutputTokens: number;
  /** Whether this is the model Codex runs when none is chosen. */
  isDefault: boolean;
}

/**
 * The catalogue itself, keyed by canonical ID.
 *
 * Ordered best-first within each group -- Codex-specific models, then the
 * general-purpose GPT models also reachable through Codex -- because every
 * derived list inherits this order.
 */
export const CODEX_MODEL_CATALOGUE: Record<CodexModelId, CodexModelRow> = {
  // ========== Codex-specific models ==========
  [CODEX_MODEL_MAP.gpt53Codex]: {
    id: CODEX_MODEL_MAP.gpt53Codex,
    label: 'GPT-5.3-Codex',
    description: 'Latest frontier agentic coding model.',
    provider: 'codex',
    badge: 'Premium',
    tier: 'premium',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: true,
    contextWindow: CONTEXT_WINDOW_256K,
    maxOutputTokens: MAX_OUTPUT_32K,
    isDefault: true,
  },
  [CODEX_MODEL_MAP.gpt53CodexSpark]: {
    id: CODEX_MODEL_MAP.gpt53CodexSpark,
    label: 'GPT-5.3-Codex-Spark',
    description: 'Near-instant real-time coding model, 1000+ tokens/sec.',
    provider: 'codex',
    badge: 'Speed',
    tier: 'premium',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: true,
    contextWindow: CONTEXT_WINDOW_256K,
    maxOutputTokens: MAX_OUTPUT_32K,
    isDefault: false,
  },
  [CODEX_MODEL_MAP.gpt52Codex]: {
    id: CODEX_MODEL_MAP.gpt52Codex,
    label: 'GPT-5.2-Codex',
    description: 'Frontier agentic coding model.',
    provider: 'codex',
    badge: 'Premium',
    tier: 'premium',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: true,
    contextWindow: CONTEXT_WINDOW_256K,
    maxOutputTokens: MAX_OUTPUT_32K,
    isDefault: false,
  },
  [CODEX_MODEL_MAP.gpt51CodexMax]: {
    id: CODEX_MODEL_MAP.gpt51CodexMax,
    label: 'GPT-5.1-Codex-Max',
    description: 'Codex-optimized flagship for deep and fast reasoning.',
    provider: 'codex',
    badge: 'Premium',
    tier: 'premium',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: true,
    contextWindow: CONTEXT_WINDOW_256K,
    maxOutputTokens: MAX_OUTPUT_32K,
    isDefault: false,
  },
  [CODEX_MODEL_MAP.gpt51CodexMini]: {
    id: CODEX_MODEL_MAP.gpt51CodexMini,
    label: 'GPT-5.1-Codex-Mini',
    description: 'Optimized for codex. Cheaper, faster, but less capable.',
    provider: 'codex',
    badge: 'Speed',
    tier: 'basic',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: false,
    contextWindow: CONTEXT_WINDOW_128K,
    maxOutputTokens: MAX_OUTPUT_16K,
    isDefault: false,
  },
  [CODEX_MODEL_MAP.gpt51Codex]: {
    id: CODEX_MODEL_MAP.gpt51Codex,
    label: 'GPT-5.1-Codex',
    description: 'Original GPT-5.1 Codex agentic coding model.',
    provider: 'codex',
    badge: 'Balanced',
    tier: 'standard',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: true,
    contextWindow: CONTEXT_WINDOW_256K,
    maxOutputTokens: MAX_OUTPUT_32K,
    isDefault: false,
  },
  [CODEX_MODEL_MAP.gpt5Codex]: {
    id: CODEX_MODEL_MAP.gpt5Codex,
    label: 'GPT-5-Codex',
    description: 'Original GPT-5 Codex model.',
    provider: 'codex',
    badge: 'Balanced',
    tier: 'standard',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: true,
    contextWindow: CONTEXT_WINDOW_128K,
    maxOutputTokens: MAX_OUTPUT_16K,
    isDefault: false,
  },
  [CODEX_MODEL_MAP.gpt5CodexMini]: {
    id: CODEX_MODEL_MAP.gpt5CodexMini,
    label: 'GPT-5-Codex-Mini',
    description: 'Smaller, cheaper GPT-5 Codex variant.',
    provider: 'codex',
    badge: 'Speed',
    tier: 'basic',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: false,
    contextWindow: CONTEXT_WINDOW_128K,
    maxOutputTokens: MAX_OUTPUT_16K,
    isDefault: false,
  },

  // ========== General-purpose GPT models, also reachable through Codex ==========
  [CODEX_MODEL_MAP.gpt52]: {
    id: CODEX_MODEL_MAP.gpt52,
    label: 'GPT-5.2',
    description: 'Latest frontier model with improvements across knowledge, reasoning and coding.',
    provider: 'codex',
    badge: 'Balanced',
    tier: 'standard',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: true,
    contextWindow: CONTEXT_WINDOW_256K,
    maxOutputTokens: MAX_OUTPUT_32K,
    isDefault: false,
  },
  [CODEX_MODEL_MAP.gpt51]: {
    id: CODEX_MODEL_MAP.gpt51,
    label: 'GPT-5.1',
    description: 'Great for coding and agentic tasks across domains.',
    provider: 'codex',
    badge: 'Balanced',
    tier: 'standard',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: true,
    contextWindow: CONTEXT_WINDOW_256K,
    maxOutputTokens: MAX_OUTPUT_32K,
    isDefault: false,
  },
  [CODEX_MODEL_MAP.gpt5]: {
    id: CODEX_MODEL_MAP.gpt5,
    label: 'GPT-5',
    description: 'Base GPT-5 model.',
    provider: 'codex',
    badge: 'Balanced',
    tier: 'standard',
    supportsVision: true,
    supportsTools: true,
    hasReasoning: true,
    contextWindow: CONTEXT_WINDOW_128K,
    maxOutputTokens: MAX_OUTPUT_16K,
    isDefault: false,
  },
};

/**
 * The catalogue as a list, in catalogue order.
 *
 * This is what a surface maps over. Reach for it rather than
 * `Object.values(CODEX_MODEL_CATALOGUE)` so the order is stated once.
 */
export const CODEX_CATALOGUE_ROWS: CodexModelRow[] = Object.values(CODEX_MODEL_CATALOGUE);

/**
 * The server's Codex model list, derived from the catalogue.
 *
 * `provider` here is the *wire* provider -- who serves the model over the API --
 * which is OpenAI, while the row's own `provider` is the Automaker provider the
 * user picked, which is Codex. Two different questions, deliberately not merged.
 */
export const CODEX_MODEL_DEFINITIONS: ModelDefinition[] = CODEX_CATALOGUE_ROWS.map((row) => ({
  id: row.id,
  name: row.label,
  modelString: row.id,
  provider: 'openai',
  description: row.description,
  contextWindow: row.contextWindow,
  maxOutputTokens: row.maxOutputTokens,
  supportsVision: row.supportsVision,
  supportsTools: row.supportsTools,
  tier: row.tier,
  default: row.isDefault,
  hasReasoning: row.hasReasoning,
}));

/**
 * Whether a Codex model accepts a reasoning effort level.
 *
 * A model that does not gets no effort control in the picker, because offering
 * one would promise a setting the model ignores.
 */
export function codexModelHasReasoning(modelId: CodexModelId): boolean {
  return CODEX_MODEL_CATALOGUE[modelId]?.hasReasoning ?? false;
}

/**
 * Display name for a Codex model.
 *
 * Reads the provider's own catalogue, which is the same input
 * `MODEL_DISPLAY_NAMES` is assembled from -- not a second table.
 */
export function getCodexModelLabel(modelId: CodexModelId): string {
  return CODEX_MODEL_CATALOGUE[modelId]?.label ?? modelId;
}

/**
 * Whether a Codex model accepts image inputs.
 *
 * Unknown IDs answer `true`: every Codex model Automaker has ever listed takes
 * images, so refusing an attachment for a model shipped after this build would
 * be the wrong guess.
 */
export function codexModelSupportsVision(modelId: CodexModelId): boolean {
  return CODEX_MODEL_CATALOGUE[modelId]?.supportsVision ?? true;
}
