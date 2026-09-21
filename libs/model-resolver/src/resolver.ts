/**
 * Model resolution utilities for handling model string mapping
 *
 * Provides centralized model resolution logic:
 * - Normalises Claude model strings to canonical IDs (never to a pinned version)
 * - Passes through Cursor models unchanged (handled by CursorProvider)
 * - Passes through Copilot models unchanged (handled by CopilotProvider)
 * - Passes through Gemini models unchanged (handled by GeminiProvider)
 * - Provides default models per provider
 * - Handles multiple model sources with priority
 *
 * With canonical model IDs:
 * - Cursor: cursor-auto, cursor-composer-1, cursor-gpt-5.2
 * - OpenCode: opencode-big-pickle, opencode-kimi-k2.5-free
 * - Copilot: copilot-gpt-5.1, copilot-claude-sonnet-4.5, copilot-gemini-3-pro-preview
 * - Gemini: gemini-2.5-flash, gemini-2.5-pro
 * - Claude: claude-haiku, claude-sonnet, claude-opus (legacy bare aliases are
 *   migrated to these canonical IDs before anything else looks at the string)
 */

import {
  isClaudeCanonicalId,
  CURSOR_MODEL_MAP,
  CODEX_MODEL_MAP,
  DEFAULT_MODELS,
  PROVIDER_PREFIXES,
  isCursorModel,
  isOpencodeModel,
  isCopilotModel,
  isGeminiModel,
  stripProviderPrefix,
  migrateModelId,
  type ClaudeTier,
  type PhaseModelEntry,
  type ThinkingLevel,
  type ReasoningEffort,
} from '@automaker/types';

// Pattern definitions for Codex/OpenAI models
const CODEX_MODEL_PREFIXES = ['codex-', 'gpt-'];
const OPENAI_O_SERIES_PATTERN = /^o\d/;
const OPENAI_O_SERIES_ALLOWED_MODELS = new Set<string>();

/**
 * Resolve a model key/alias to a canonical model ID
 *
 * Any bare legacy alias is migrated to its canonical prefixed ID first, so the
 * branches below only ever see canonical IDs or provider model strings:
 * - Canonical: cursor-auto, cursor-gpt-5.2, opencode-big-pickle, claude-sonnet
 * - Legacy (migrated before matching): auto, composer-1, sonnet, opus
 *
 * A **bare tier alias** is a compile error when it is statically known. A tier
 * alias is what the Claude provider boundary produces on the way *out* to the
 * SDK, so accepting one here would let that value flow back into code that
 * reasons about canonical IDs (the containment property in
 * docs/adr/0001-claude-tier-aliases.md). A `string` that merely happens to hold
 * an alias at runtime still resolves -- legacy settings do -- but a value typed
 * `ClaudeTier` is refused by the type checker.
 *
 * @param modelKey - Model key (e.g., "claude-opus", "cursor-composer-1", "sonnet")
 * @param defaultModel - Fallback model if modelKey is undefined
 * @returns Full model string
 */
export function resolveModelString<T extends string>(
  modelKey?: T extends ClaudeTier ? never : T,
  defaultModel: string = DEFAULT_MODELS.claude
): string {
  console.log(
    `[ModelResolver] resolveModelString called with modelKey: "${modelKey}", defaultModel: "${defaultModel}"`
  );

  // No model specified - use default
  if (!modelKey) {
    console.log(`[ModelResolver] No model specified, using default: ${defaultModel}`);
    return defaultModel;
  }

  // First, migrate legacy IDs to canonical format
  const canonicalKey = migrateModelId(modelKey);
  if (canonicalKey !== modelKey) {
    console.log(`[ModelResolver] Migrated legacy ID: "${modelKey}" -> "${canonicalKey}"`);
  }

  // Cursor model with explicit prefix (e.g., "cursor-auto", "cursor-composer-1")
  // Pass through unchanged - provider will extract bare ID for CLI
  if (canonicalKey.startsWith(PROVIDER_PREFIXES.cursor)) {
    console.log(`[ModelResolver] Using Cursor model: ${canonicalKey}`);
    return canonicalKey;
  }

  // Codex model with explicit prefix (e.g., "codex-gpt-5.1-codex-max")
  if (canonicalKey.startsWith(PROVIDER_PREFIXES.codex)) {
    console.log(`[ModelResolver] Using Codex model: ${canonicalKey}`);
    return canonicalKey;
  }

  // OpenCode model (static with opencode- prefix or dynamic with provider/model format)
  if (isOpencodeModel(canonicalKey)) {
    console.log(`[ModelResolver] Using OpenCode model: ${canonicalKey}`);
    return canonicalKey;
  }

  // Copilot model with explicit prefix (e.g., "copilot-gpt-5.1", "copilot-claude-sonnet-4.5")
  if (isCopilotModel(canonicalKey)) {
    console.log(`[ModelResolver] Using Copilot model: ${canonicalKey}`);
    return canonicalKey;
  }

  // Gemini model with explicit prefix (e.g., "gemini-2.5-flash", "gemini-2.5-pro")
  if (isGeminiModel(canonicalKey)) {
    console.log(`[ModelResolver] Using Gemini model: ${canonicalKey}`);
    return canonicalKey;
  }

  // Claude canonical ID (claude-haiku, claude-sonnet, claude-opus)
  // Kept as-is: a canonical ID names a tier, and the version it runs is the
  // provider's decision. The Claude provider boundary translates it to the tier
  // alias the SDK expects; nothing upstream ever sees that alias.
  if (isClaudeCanonicalId(canonicalKey)) {
    console.log(`[ModelResolver] Resolved Claude canonical ID: "${canonicalKey}"`);
    return canonicalKey;
  }

  // Hand-written pinned Claude model ID (e.g., claude-sonnet-1-19991231) - pass through
  if (canonicalKey.includes('claude-')) {
    console.log(`[ModelResolver] Using full Claude model string: ${canonicalKey}`);
    return canonicalKey;
  }

  // OpenAI/Codex models - check for gpt- prefix
  if (
    CODEX_MODEL_PREFIXES.some((prefix) => canonicalKey.startsWith(prefix)) ||
    (OPENAI_O_SERIES_PATTERN.test(canonicalKey) && OPENAI_O_SERIES_ALLOWED_MODELS.has(canonicalKey))
  ) {
    console.log(`[ModelResolver] Using OpenAI/Codex model: ${canonicalKey}`);
    return canonicalKey;
  }

  // Unknown model key - pass through as-is (could be a provider model like GLM-4.7, MiniMax-M2.1)
  // This allows ClaudeCompatibleProvider models to work without being registered here
  console.log(
    `[ModelResolver] Unknown model key "${canonicalKey}", passing through unchanged (may be a provider model)`
  );
  return canonicalKey;
}

/**
 * Get the effective model from multiple sources
 * Priority: explicit model > session model > default
 *
 * @param explicitModel - Explicitly provided model (highest priority)
 * @param sessionModel - Model from session (medium priority)
 * @param defaultModel - Fallback default model (lowest priority)
 * @returns Resolved model string
 */
export function getEffectiveModel(
  explicitModel?: string,
  sessionModel?: string,
  defaultModel?: string
): string {
  return resolveModelString(explicitModel || sessionModel, defaultModel);
}

/**
 * Result of resolving a phase model entry
 */
export interface ResolvedPhaseModel {
  /** Resolved model string (full model ID) */
  model: string;
  /** Optional thinking level for extended thinking (Claude models) */
  thinkingLevel?: ThinkingLevel;
  /** Optional reasoning effort for timeout calculation (Codex models) */
  reasoningEffort?: ReasoningEffort;
  /** Provider ID if using a ClaudeCompatibleProvider */
  providerId?: string;
}

/**
 * Resolve a phase model entry to a model string and thinking level
 *
 * Handles both legacy format (string) and new format (PhaseModelEntry object).
 * This centralizes the pattern used across phase model routes.
 *
 * @param phaseModel - Phase model entry (string or PhaseModelEntry object)
 * @param defaultModel - Fallback model if resolution fails
 * @returns Resolved model string and optional thinking level
 *
 * @remarks
 * - For Cursor models, `thinkingLevel` is returned as `undefined` since Cursor
 *   handles thinking internally via model variants (e.g., 'claude-sonnet-4-thinking')
 * - Defensively handles null/undefined from corrupted settings JSON
 *
 * @example
 * ```ts
 * const phaseModel = settings?.phaseModels?.enhancementModel || DEFAULT_PHASE_MODELS.enhancementModel;
 * const { model, thinkingLevel } = resolvePhaseModel(phaseModel);
 * ```
 */
export function resolvePhaseModel(
  phaseModel: string | PhaseModelEntry | null | undefined,
  defaultModel: string = DEFAULT_MODELS.claude
): ResolvedPhaseModel {
  console.log(
    `[ModelResolver] resolvePhaseModel called with:`,
    JSON.stringify(phaseModel),
    `type: ${typeof phaseModel}`
  );

  // Handle null/undefined (defensive against corrupted JSON)
  if (!phaseModel) {
    console.log(`[ModelResolver] phaseModel is null/undefined, using default`);
    return {
      model: resolveModelString(undefined, defaultModel),
      thinkingLevel: undefined,
      reasoningEffort: undefined,
    };
  }

  // Handle legacy string format
  if (typeof phaseModel === 'string') {
    console.log(`[ModelResolver] phaseModel is string format (legacy): "${phaseModel}"`);
    return {
      model: resolveModelString(phaseModel, defaultModel),
      thinkingLevel: undefined,
      reasoningEffort: undefined,
    };
  }

  // Handle new PhaseModelEntry object format
  console.log(
    `[ModelResolver] phaseModel is object format: model="${phaseModel.model}", thinkingLevel="${phaseModel.thinkingLevel}", reasoningEffort="${phaseModel.reasoningEffort}", providerId="${phaseModel.providerId}"`
  );

  // If providerId is set, pass through the model string unchanged
  // (it's a provider-specific model ID like "GLM-4.5-Air", not a Claude alias)
  if (phaseModel.providerId) {
    console.log(
      `[ModelResolver] Using provider model: providerId="${phaseModel.providerId}", model="${phaseModel.model}"`
    );
    return {
      model: phaseModel.model, // Pass through unchanged
      thinkingLevel: phaseModel.thinkingLevel,
      reasoningEffort: phaseModel.reasoningEffort,
      providerId: phaseModel.providerId,
    };
  }

  // No providerId - resolve through normal Claude model mapping
  return {
    model: resolveModelString(phaseModel.model, defaultModel),
    thinkingLevel: phaseModel.thinkingLevel,
    reasoningEffort: phaseModel.reasoningEffort,
  };
}
