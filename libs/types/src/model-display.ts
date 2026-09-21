/**
 * Model Display Constants - UI metadata for AI models
 *
 * Provides display labels, descriptions, and metadata for AI models
 * and thinking levels used throughout the application UI.
 */

import type { ModelAlias, ThinkingLevel, ModelProvider } from './settings.js';
import type { ReasoningEffort } from './provider.js';
import type { CursorModelId } from './cursor-models.js';
import { CURSOR_MODEL_MAP, LEGACY_CURSOR_MODEL_MAP } from './cursor-models.js';
import type { AgentModel, CodexModelId } from './model.js';
import { CODEX_MODEL_MAP } from './model.js';
import {
  CLAUDE_TIERS,
  CLAUDE_TIER_DISPLAY_NAMES,
  CLAUDE_TIER_ROW_BY_TIER,
  type ClaudeTier,
} from './claude-tiers.js';
import { GEMINI_MODEL_MAP, type GeminiModelId } from './gemini-models.js';
import { COPILOT_MODEL_MAP } from './copilot-models.js';
import {
  OPENCODE_MODELS,
  LEGACY_OPENCODE_MODEL_MAP,
  RETIRED_OPENCODE_MODEL_MAP,
} from './opencode-models.js';

/**
 * ModelOption - Display metadata for a model option in the UI
 */
export interface ModelOption {
  /** Model identifier (supports Claude, Cursor, Gemini models) */
  id: ModelAlias | CursorModelId | GeminiModelId;
  /** Display name shown to user */
  label: string;
  /** Descriptive text explaining model capabilities */
  description: string;
  /** Optional badge text (e.g., "Speed", "Balanced", "Premium") */
  badge?: string;
  /** AI provider */
  provider: ModelProvider;
}

/**
 * ThinkingLevelOption - Display metadata for thinking level selection
 */
export interface ThinkingLevelOption {
  /** Thinking level identifier */
  id: ThinkingLevel;
  /** Display label */
  label: string;
}

/**
 * Claude model options with full metadata for UI display.
 *
 * Derived from the tier rows in `./claude-tiers.js`, fastest first: label, badge
 * and description all come from the one row that defines the tier, so a tier
 * added or renamed there appears here with no edit.
 *
 * The IDs are bare tier aliases for historical reasons -- this list predates the
 * canonical IDs -- and `getModelDisplayName` answers either spelling.
 */
export const CLAUDE_MODELS: ModelOption[] = CLAUDE_TIERS.map((tier) => {
  const row = CLAUDE_TIER_ROW_BY_TIER[tier];
  return {
    id: tier,
    label: row.displayName,
    description: row.description,
    badge: row.badge,
    provider: 'claude',
  };
});

/**
 * Codex model options with full metadata for UI display
 * Official models from https://developers.openai.com/codex/models/
 */
export const CODEX_MODELS: (ModelOption & { hasReasoning?: boolean })[] = [
  {
    id: CODEX_MODEL_MAP.gpt53Codex,
    label: 'GPT-5.3-Codex',
    description: 'Latest frontier agentic coding model.',
    badge: 'Premium',
    provider: 'codex',
    hasReasoning: true,
  },
  {
    id: CODEX_MODEL_MAP.gpt53CodexSpark,
    label: 'GPT-5.3-Codex-Spark',
    description: 'Near-instant real-time coding model, 1000+ tokens/sec.',
    badge: 'Speed',
    provider: 'codex',
    hasReasoning: true,
  },
  {
    id: CODEX_MODEL_MAP.gpt52Codex,
    label: 'GPT-5.2-Codex',
    description: 'Frontier agentic coding model.',
    badge: 'Premium',
    provider: 'codex',
    hasReasoning: true,
  },
  {
    id: CODEX_MODEL_MAP.gpt51CodexMax,
    label: 'GPT-5.1-Codex-Max',
    description: 'Codex-optimized flagship for deep and fast reasoning.',
    badge: 'Premium',
    provider: 'codex',
    hasReasoning: true,
  },
  {
    id: CODEX_MODEL_MAP.gpt51CodexMini,
    label: 'GPT-5.1-Codex-Mini',
    description: 'Optimized for codex. Cheaper, faster, but less capable.',
    badge: 'Speed',
    provider: 'codex',
    hasReasoning: false,
  },
  {
    id: CODEX_MODEL_MAP.gpt51Codex,
    label: 'GPT-5.1-Codex',
    description: 'Original GPT-5.1 Codex agentic coding model.',
    badge: 'Balanced',
    provider: 'codex',
    hasReasoning: true,
  },
  {
    id: CODEX_MODEL_MAP.gpt5Codex,
    label: 'GPT-5-Codex',
    description: 'Original GPT-5 Codex model.',
    badge: 'Balanced',
    provider: 'codex',
    hasReasoning: true,
  },
  {
    id: CODEX_MODEL_MAP.gpt5CodexMini,
    label: 'GPT-5-Codex-Mini',
    description: 'Smaller, cheaper GPT-5 Codex variant.',
    badge: 'Speed',
    provider: 'codex',
    hasReasoning: false,
  },
  {
    id: CODEX_MODEL_MAP.gpt52,
    label: 'GPT-5.2',
    description: 'Latest frontier model with improvements across knowledge, reasoning and coding.',
    badge: 'Balanced',
    provider: 'codex',
    hasReasoning: true,
  },
  {
    id: CODEX_MODEL_MAP.gpt51,
    label: 'GPT-5.1',
    description: 'Great for coding and agentic tasks across domains.',
    badge: 'Balanced',
    provider: 'codex',
    hasReasoning: true,
  },
  {
    id: CODEX_MODEL_MAP.gpt5,
    label: 'GPT-5',
    description: 'Base GPT-5 model.',
    badge: 'Balanced',
    provider: 'codex',
    hasReasoning: true,
  },
];

/**
 * Gemini model options with full metadata for UI display
 * Based on https://github.com/google-gemini/gemini-cli
 * Model IDs match the keys in GEMINI_MODEL_MAP (e.g., 'gemini-2.5-flash')
 */
export const GEMINI_MODELS: (ModelOption & { hasThinking?: boolean })[] = Object.entries(
  GEMINI_MODEL_MAP
).map(([id, config]) => ({
  id: id as GeminiModelId,
  label: config.label,
  description: config.description,
  badge: config.supportsThinking ? 'Thinking' : 'Speed',
  provider: 'gemini' as const,
  hasThinking: config.supportsThinking,
}));

/**
 * Thinking level options with display labels
 *
 * Ordered from least to most intensive reasoning.
 */
export const THINKING_LEVELS: ThinkingLevelOption[] = [
  { id: 'none', label: 'None' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'ultrathink', label: 'Ultrathink' },
  { id: 'adaptive', label: 'Adaptive' },
];

/**
 * Map of thinking levels to short display labels
 *
 * Used for compact UI elements like badges or dropdowns.
 */
export const THINKING_LEVEL_LABELS: Record<ThinkingLevel, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Med',
  high: 'High',
  ultrathink: 'Ultra',
  adaptive: 'Adaptive',
};

/**
 * ReasoningEffortOption - Display metadata for reasoning effort selection (Codex/OpenAI)
 */
export interface ReasoningEffortOption {
  /** Reasoning effort identifier */
  id: ReasoningEffort;
  /** Display label */
  label: string;
  /** Description of what this level does */
  description: string;
}

/**
 * Reasoning effort options for Codex/OpenAI models
 * All models support reasoning effort levels
 */
export const REASONING_EFFORT_LEVELS: ReasoningEffortOption[] = [
  { id: 'none', label: 'None', description: 'No reasoning tokens (GPT-5.1 models only)' },
  { id: 'minimal', label: 'Minimal', description: 'Very quick reasoning' },
  { id: 'low', label: 'Low', description: 'Quick responses for simpler queries' },
  { id: 'medium', label: 'Medium', description: 'Balance between depth and speed (default)' },
  { id: 'high', label: 'High', description: 'Maximizes reasoning depth for critical tasks' },
  { id: 'xhigh', label: 'XHigh', description: 'Highest level for gpt-5.1-codex-max and newer' },
];

/**
 * Map of reasoning effort levels to short display labels
 */
export const REASONING_EFFORT_LABELS: Record<ReasoningEffort, string> = {
  none: 'None',
  minimal: 'Min',
  low: 'Low',
  medium: 'Med',
  high: 'High',
  xhigh: 'XHigh',
};

/**
 * Claude tier names and the tier type are defined once, in `./claude-tiers.js`.
 * Re-exported here because this is where every naming caller looks for them.
 */
export { CLAUDE_TIER_DISPLAY_NAMES };
export type { ClaudeTier };

/**
 * Identify the Claude tier a model string belongs to.
 *
 * Only strings that address Claude directly are considered: a bare tier alias
 * (`opus`) or a `claude-` prefixed canonical or pinned ID. Models that merely
 * mention a Claude tier while being served by another provider
 * (`cursor-opus-4.5`, `copilot-claude-opus-4.5`, `anthropic/claude-sonnet-4-5`)
 * are deliberately not claimed here, so their own display rules keep applying.
 *
 * ## How the match is made
 *
 * Two different questions, matched two different ways:
 *
 * 1. **Is this a Claude string at all?** Exact prefix: `claude-`, or the whole
 *    value equal to a bare tier alias. That is what keeps another provider's
 *    model out, even when a tier name appears inside it.
 * 2. **Which tier is it?** *Substring* search for `-<tier>` anywhere in the
 *    value — not an exact match against a known list. So `claude-sonnet-4-6`,
 *    `claude-1-9-haiku-19991231` and a version that ships tomorrow all resolve,
 *    with no table to keep up to date.
 *
 * Elsewhere the spec says a pinned ID is recognised by "exact, known match";
 * that rule governs *versions* — which model Automaker wrote, and which one it
 * may collapse (see `PINNED_BY_ACCIDENT_CLAUDE_MODEL_MAP` in `./model.js`).
 * Inferring the *tier* is a different and safe judgement: the tier names are a
 * closed set Anthropic keeps in its identifiers, and a wrong guess would only
 * mislabel a display string, never change which model runs. Guessing a version
 * this way would not be safe, and this helper never does — it returns a tier and
 * the version in the string is discarded.
 *
 * A consequence worth knowing: the first tier found wins, so a contrived string
 * naming two tiers (`claude-opus-vs-sonnet`) resolves to whichever tier
 * `CLAUDE_TIERS` lists first. No real identifier does that.
 *
 * @returns the tier alias, or undefined when the string is not a Claude model
 */
export function getClaudeTier(model: string): ClaudeTier | undefined {
  const value = model.toLowerCase();
  const isClaudeModel = value.startsWith('claude-') || (CLAUDE_TIERS as string[]).includes(value);
  if (!isClaudeModel) return undefined;

  return CLAUDE_TIERS.find((tier) => value === tier || value.includes(`-${tier}`));
}

/**
 * Display name for the tier a Claude model string belongs to.
 *
 * This is the honest fallback for any Claude string a display table does not
 * recognise: Automaker sends a tier alias and the provider picks the version,
 * so naming no version is correct and guessing one is not.
 *
 * @example
 * ```typescript
 * getClaudeTierDisplayName("claude-haiku-4-5-20251001"); // "Claude Haiku"
 * getClaudeTierDisplayName("cursor-opus-4.5");           // undefined
 * ```
 */
export function getClaudeTierDisplayName(model: string): string | undefined {
  const tier = getClaudeTier(model);
  return tier ? CLAUDE_TIER_DISPLAY_NAMES[tier] : undefined;
}

/**
 * The one table that decides how a model is named on screen.
 *
 * ## Why it is assembled, not written
 *
 * Every non-Claude model Automaker offers already has a label in its provider's
 * own catalogue -- the same label the model picker offers it under
 * (`CURSOR_MODEL_MAP`, `COPILOT_MODEL_MAP`, `GEMINI_MODEL_MAP`,
 * `OPENCODE_MODELS`, and `CODEX_MODELS` above). Writing those names a second
 * time here is how the three display helpers drifted apart in the first place,
 * so this table is *derived* from those catalogues instead. A new model, or a
 * renamed one, is a one-line change in the single catalogue entry it already
 * needs -- and the name a card shows is by construction the name the user
 * picked the model by.
 *
 * Claude is deliberately absent: a Claude string is answered by
 * `getClaudeTierDisplayName`, which names a tier and never a version. See
 * docs/adr/0001-claude-tier-aliases.md.
 */
const PROVIDER_CATALOGUE_DISPLAY_NAMES: Record<string, string> = {
  ...Object.fromEntries(CODEX_MODELS.map((m) => [m.id, m.label])),
  ...Object.fromEntries(Object.entries(CURSOR_MODEL_MAP).map(([id, c]) => [id, c.label])),
  ...Object.fromEntries(Object.entries(GEMINI_MODEL_MAP).map(([id, c]) => [id, c.label])),
  ...Object.fromEntries(Object.entries(COPILOT_MODEL_MAP).map(([id, c]) => [id, c.label])),
  ...Object.fromEntries(OPENCODE_MODELS.map((m) => [m.id, m.label])),
};

/**
 * The only rows written by hand, and each one needs a reason.
 *
 * A catalogue label is written for a picker, where a row can afford a
 * recommendation or a qualifier. Where that makes it the wrong name for a
 * one-line badge *and* the surfaces that name the model already agreed on a
 * better one, the better one is kept here rather than silently changed.
 */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  // `CURSOR_MODEL_MAP` calls this "Auto (Recommended)", which is advice, not a
  // name. Both surfaces that named it already said "Cursor Auto".
  'cursor-auto': 'Cursor Auto',
};

/**
 * Every exact identifier this module can name, in one object.
 *
 * Overrides are applied last so a hand-written row always wins over the
 * catalogue row it replaces.
 */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  ...PROVIDER_CATALOGUE_DISPLAY_NAMES,
  ...DISPLAY_NAME_OVERRIDES,
};

/**
 * Identifiers that are no longer canonical but can still be sitting in a saved
 * feature card or settings file. Resolved to the canonical ID before the table
 * is consulted, so a migrated model keeps its name.
 */
const ALIASED_MODEL_IDS: Record<string, string> = {
  ...LEGACY_CURSOR_MODEL_MAP,
  ...LEGACY_OPENCODE_MODEL_MAP,
  ...RETIRED_OPENCODE_MODEL_MAP,
};

/**
 * Names the shapes of identifier no catalogue enumerates: a model a provider
 * added after this build, or a loose `gpt-`/`o1` string. Graceful degradation
 * only -- anything a catalogue lists is answered above, before this runs.
 */
function getPatternedDisplayName(model: string): string | undefined {
  // Cursor models absent from CURSOR_MODEL_MAP: name the provider and the tier
  // rather than echo an identifier.
  if (model.startsWith('cursor-sonnet')) return 'Cursor Sonnet';
  if (model.startsWith('cursor-opus')) return 'Cursor Opus';
  if (model.startsWith('cursor-gpt')) return model.replace('cursor-', '').replace('gpt-', 'GPT-');
  if (model.startsWith('cursor-gemini'))
    return model.replace('cursor-', 'Cursor ').replace('gemini', 'Gemini');
  if (model.startsWith('cursor-grok')) return 'Cursor Grok';

  // Bare OpenAI identifiers.
  if (model.startsWith('gpt-')) return model.toUpperCase();
  if (/^o\d/.test(model)) return model.toUpperCase();

  // OpenCode dynamic models, which arrive as `provider/model` and are not
  // enumerable at build time (e.g. "google/gemini-2.5-pro").
  if (model.includes('/') && !model.includes('://')) {
    const modelName = model.substring(model.indexOf('/') + 1);
    let lastSegment = modelName.split('/').pop()!;
    // Tier suffixes like ":free" become a human-friendly parenthetical.
    const tierMatch = lastSegment.match(/:(free|extended|beta|preview)$/i);
    if (tierMatch) {
      lastSegment = lastSegment.slice(0, lastSegment.length - tierMatch[0].length);
    }
    const cleanedName = lastSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (tierMatch) {
      const tier = tierMatch[1].charAt(0).toUpperCase() + tierMatch[1].slice(1).toLowerCase();
      return `${cleanedName} (${tier})`;
    }
    return cleanedName;
  }

  return undefined;
}

/**
 * Get the display name for a model. **The only function that answers this.**
 *
 * Every surface that names a model on screen goes through here -- the UI's
 * `getModelDisplayName` is a re-export of this function and `formatModelName`
 * is a thin wrapper that adds one precedence rule in front of it. There is no
 * second table; `model-display.test.ts` pins the table itself, and
 * `model-name-source.test.ts` scans the source for a new source of names so
 * that a fourth cannot appear without a test failing.
 *
 * ## Resolution order
 *
 * 1. **A Claude string** is answered by its tier name, never a version.
 * 2. **An exact identifier** in `MODEL_DISPLAY_NAMES`, which is the providers'
 *    own catalogues.
 * 3. **A legacy or retired identifier** is resolved to its canonical ID, then
 *    looked up as in (2).
 * 4. **A recognised shape** -- an unenumerated `cursor-*`, a bare `gpt-*`, an
 *    OpenCode `provider/model` string.
 * 5. **Otherwise the identifier itself.** Echoing an unknown ID is honest;
 *    inventing a name from its dashes is not.
 *
 * @example
 * ```typescript
 * getModelDisplayName("haiku");                     // "Claude Haiku"
 * getModelDisplayName("claude-sonnet-4-6");         // "Claude Sonnet" (tier, not version)
 * getModelDisplayName("codex-gpt-5.1-codex-max");   // "GPT-5.1-Codex-Max"
 * getModelDisplayName("cursor-sonnet-4.6");         // "Claude Sonnet 4.6"
 * getModelDisplayName("gemini-2.5-flash");          // "Gemini 2.5 Flash"
 * ```
 *
 * @remarks
 * The pinned Claude IDs Automaker once wrote on the user's behalf
 * (`claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) get no
 * row of their own. They collapse to their tier on read, so the model they name
 * is not the model that runs; labelling them with a version would report a
 * model that never executes.
 */
export function getModelDisplayName(model: ModelAlias | string): string {
  // Claude first: a Claude string is named by tier and nothing else may claim
  // it. No catalogue ID is a Claude string, so nothing is shadowed.
  const claudeTierName = getClaudeTierDisplayName(model);
  if (claudeTierName) return claudeTierName;

  if (model in MODEL_DISPLAY_NAMES) return MODEL_DISPLAY_NAMES[model];

  const canonical = ALIASED_MODEL_IDS[model];
  if (canonical && canonical in MODEL_DISPLAY_NAMES) return MODEL_DISPLAY_NAMES[canonical];

  return getPatternedDisplayName(model) ?? model;
}
