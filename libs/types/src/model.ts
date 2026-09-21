/**
 * Model alias mapping for Claude models
 */
import { CLAUDE_CANONICAL_ID_BY_TIER } from './claude-tiers.js';
import type { ClaudeCanonicalId as ClaudeCanonicalIdType } from './claude-tiers.js';
import type { CursorModelId } from './cursor-models.js';
import type { OpencodeModelId } from './opencode-models.js';
import type { GeminiModelId } from './gemini-models.js';

/**
 * The Claude tier vocabulary lives in `./claude-tiers.js`, which is the one place
 * the three tiers are written out. Re-exported here because this module is where
 * callers have always found them.
 */
export type { ClaudeTier, ClaudeCanonicalId } from './claude-tiers.js';
export {
  CLAUDE_TIER_ROWS,
  CLAUDE_TIERS,
  CLAUDE_CANONICAL_IDS,
  isClaudeCanonicalId,
  isClaudeTier,
  claudeTierOf,
  deriveClaudeTierTables,
} from './claude-tiers.js';

/**
 * The pinned Claude model IDs Automaker itself used to write onto users' data
 * on their behalf, each mapped back to the canonical ID naming its tier.
 *
 * Before Automaker addressed Claude by tier alias, choosing a tier stored the
 * version that happened to be current when the card was created. Those values
 * are pinned-by-accident: the user never chose them, but nothing in the stored
 * value says so.
 *
 * Membership is decided by **exact equality** against this list, never by a
 * pattern such as `claude-opus-*`. A pattern would also unpin versions a user
 * chose deliberately, and Automaker cannot tell the two apart by inspecting the
 * value. The cost is that this list gains an entry whenever the defaults
 * change; that is accepted as visible debt rather than logic that guesses wrong
 * (see docs/adr/0001-claude-tier-aliases.md).
 *
 * Note `claude-haiku-4-5` (undated) is deliberately absent: it appears in the
 * UI's display tables but was never a value Automaker wrote.
 */
export const PINNED_BY_ACCIDENT_CLAUDE_MODEL_MAP: Record<string, ClaudeCanonicalIdType> = {
  'claude-opus-4-6': 'claude-opus',
  'claude-sonnet-4-6': 'claude-sonnet',
  'claude-haiku-4-5-20251001': 'claude-haiku',
} as const;

/**
 * Check whether a model string is one of the pinned model IDs Automaker wrote
 * on the user's behalf. Exact equality only.
 */
export function isPinnedByAccidentClaudeModelId(model: string): boolean {
  return Object.prototype.hasOwnProperty.call(PINNED_BY_ACCIDENT_CLAUDE_MODEL_MAP, model);
}

/**
 * Legacy Claude model aliases (short names) for backward compatibility.
 * These map to the canonical ID for the same tier.
 *
 * Derived from the tier rows, so a new tier is aliasable without an edit here.
 * The `Record<string, ...>` type is deliberate: callers pass arbitrary strings
 * in (`model in CLAUDE_MODEL_MAP`), and `ModelAlias` is its `keyof`.
 *
 * @deprecated Use canonical IDs (`claude-opus`, …) for new code
 */
export const CLAUDE_MODEL_MAP: Record<string, ClaudeCanonicalIdType> = CLAUDE_CANONICAL_ID_BY_TIER;

/**
 * Map from legacy aliases to canonical IDs.
 *
 * The same table as `CLAUDE_MODEL_MAP` -- they were two hand-written copies of
 * one map, and they are now two names for one derived object.
 */
export const LEGACY_CLAUDE_ALIAS_MAP: Record<string, ClaudeCanonicalIdType> =
  CLAUDE_CANONICAL_ID_BY_TIER;

/**
 * Codex/OpenAI model identifiers
 * Based on OpenAI Codex CLI official models
 * See: https://developers.openai.com/codex/models/
 *
 * IMPORTANT: All Codex models use 'codex-' prefix to distinguish from Cursor CLI models
 */
export const CODEX_MODEL_MAP = {
  // Recommended Codex-specific models
  /** Latest frontier agentic coding model */
  gpt53Codex: 'codex-gpt-5.3-codex',
  /** Smaller, near-instant version of GPT-5.3-Codex for real-time coding */
  gpt53CodexSpark: 'codex-gpt-5.3-codex-spark',
  /** Frontier agentic coding model */
  gpt52Codex: 'codex-gpt-5.2-codex',
  /** Codex-optimized flagship for deep and fast reasoning */
  gpt51CodexMax: 'codex-gpt-5.1-codex-max',
  /** Optimized for codex. Cheaper, faster, but less capable */
  gpt51CodexMini: 'codex-gpt-5.1-codex-mini',
  /** Original GPT-5.1 Codex model */
  gpt51Codex: 'codex-gpt-5.1-codex',
  /** Original GPT-5 Codex model */
  gpt5Codex: 'codex-gpt-5-codex',
  /** Smaller, cheaper GPT-5 Codex variant */
  gpt5CodexMini: 'codex-gpt-5-codex-mini',

  // General-purpose GPT models (also available in Codex)
  /** Latest frontier model with improvements across knowledge, reasoning and coding */
  gpt52: 'codex-gpt-5.2',
  /** Great for coding and agentic tasks across domains */
  gpt51: 'codex-gpt-5.1',
  /** Base GPT-5 model */
  gpt5: 'codex-gpt-5',
} as const;

export const CODEX_MODEL_IDS = Object.values(CODEX_MODEL_MAP);

/**
 * Models that support reasoning effort configuration
 * These models can use reasoning.effort parameter
 */
export const REASONING_CAPABLE_MODELS = new Set([
  CODEX_MODEL_MAP.gpt53Codex,
  CODEX_MODEL_MAP.gpt53CodexSpark,
  CODEX_MODEL_MAP.gpt52Codex,
  CODEX_MODEL_MAP.gpt51CodexMax,
  CODEX_MODEL_MAP.gpt51Codex,
  CODEX_MODEL_MAP.gpt5Codex,
  CODEX_MODEL_MAP.gpt52,
  CODEX_MODEL_MAP.gpt51,
  CODEX_MODEL_MAP.gpt5,
]);

/**
 * Check if a model supports reasoning effort configuration
 */
export function supportsReasoningEffort(modelId: string): boolean {
  return REASONING_CAPABLE_MODELS.has(modelId as any);
}

/**
 * Normalize a selected reasoning effort level to a value supported by the target model.
 * Returns 'none' for models that do not support reasoning effort.
 */
export function normalizeReasoningEffortForModel(
  model: string,
  reasoningEffort: import('./provider.js').ReasoningEffort | undefined
): import('./provider.js').ReasoningEffort {
  if (!supportsReasoningEffort(model)) {
    return 'none';
  }
  return reasoningEffort || 'none';
}

/**
 * Get all Codex model IDs as an array
 */
export function getAllCodexModelIds(): CodexModelId[] {
  return CODEX_MODEL_IDS as CodexModelId[];
}

/**
 * Default models per provider
 * Uses canonical prefixed IDs for consistent routing.
 */
export const DEFAULT_MODELS = {
  claude: 'claude-opus', // Canonical ID: the provider decides which Opus-class model runs
  cursor: 'cursor-auto', // Cursor's recommended default (with prefix)
  codex: CODEX_MODEL_MAP.gpt53Codex, // GPT-5.3-Codex is the latest frontier agentic coding model
} as const;

export type ModelAlias = keyof typeof CLAUDE_MODEL_MAP;
export type CodexModelId = (typeof CODEX_MODEL_MAP)[keyof typeof CODEX_MODEL_MAP];

/**
 * AgentModel - Alias for ModelAlias for backward compatibility
 * Represents available models across providers
 */
export type AgentModel = ModelAlias | CodexModelId;

/**
 * Dynamic provider model IDs discovered at runtime (provider/model format)
 */
export type DynamicModelId = `${string}/${string}`;

/**
 * Provider-prefixed model IDs used for routing
 */
export type PrefixedCursorModelId = `cursor-${string}`;
export type PrefixedOpencodeModelId = `opencode-${string}`;
export type PrefixedGeminiModelId = `gemini-${string}`;

/**
 * ModelId - Unified model identifier across providers
 */
export type ModelId =
  | ModelAlias
  | CodexModelId
  | CursorModelId
  | GeminiModelId
  | OpencodeModelId
  | DynamicModelId
  | PrefixedCursorModelId
  | PrefixedOpencodeModelId
  | PrefixedGeminiModelId;
