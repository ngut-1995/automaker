/**
 * The Cursor catalogue -- one table of Cursor model rows.
 *
 * Every surface that lists Cursor models derives from this table rather than
 * restating it: the UI's picker list, the server's model list and the
 * display-name lookup. The shape is the one the Codex catalogue established in
 * ngut-1995/harbor#82, so a reader who knows one provider's catalogue knows them
 * all, and the guard that keeps model rows inside catalogue modules has one
 * shape to recognise (ngut-1995/harbor#83).
 *
 * Reference: https://cursor.com/docs
 *
 * IMPORTANT: All Cursor model IDs use the 'cursor-' prefix, which is what keeps
 * them distinct from another provider's rows for the same underlying model
 * (`cursor-gpt-5.2-codex` vs `codex-gpt-5.2-codex`).
 *
 * ## What a Cursor row does not carry
 *
 * Cursor declares no cost class, no context window and no picker badge for its
 * models, and this table does not invent them: a field Cursor has never stated
 * is absent rather than guessed. `supportsVision` is `false` throughout because
 * the Cursor CLI does not pass images, whatever the underlying model can do.
 *
 * Reasoning depth is spelled `hasThinking` here: a Cursor model is chosen with a
 * thinking variant of its own (`cursor-opus-4.5-thinking`), not with an effort
 * level, so it speaks Automaker's thinking vocabulary (see CONTEXT.md,
 * "Reasoning depth").
 */

import type { ModelDefinition } from './provider.js';
import type { ModelProvider } from './settings.js';

/**
 * Cursor CLI Model IDs
 *
 * All Cursor model IDs use 'cursor-' prefix for consistent provider routing.
 */
export type CursorModelId =
  | 'cursor-auto' // Auto-select best model
  | 'cursor-composer-1' // Cursor Composer agent model
  | 'cursor-sonnet-4.6' // Claude Sonnet 4.6
  | 'cursor-sonnet-4.6-thinking' // Claude Sonnet 4.6 with extended thinking
  | 'cursor-sonnet-4.5' // Claude Sonnet 4.5
  | 'cursor-sonnet-4.5-thinking' // Claude Sonnet 4.5 with extended thinking
  | 'cursor-opus-4.5' // Claude Opus 4.5
  | 'cursor-opus-4.5-thinking' // Claude Opus 4.5 with extended thinking
  | 'cursor-opus-4.1' // Claude Opus 4.1
  | 'cursor-gemini-3-pro' // Gemini 3 Pro
  | 'cursor-gemini-3-flash' // Gemini 3 Flash
  | 'cursor-gpt-5.2' // GPT-5.2 via Cursor
  | 'cursor-gpt-5.1' // GPT-5.1 via Cursor
  | 'cursor-gpt-5.2-high' // GPT-5.2 High via Cursor
  | 'cursor-gpt-5.1-high' // GPT-5.1 High via Cursor
  | 'cursor-gpt-5.1-codex' // GPT-5.1 Codex via Cursor
  | 'cursor-gpt-5.1-codex-high' // GPT-5.1 Codex High via Cursor
  | 'cursor-gpt-5.1-codex-max' // GPT-5.1 Codex Max via Cursor
  | 'cursor-gpt-5.1-codex-max-high' // GPT-5.1 Codex Max High via Cursor
  | 'cursor-gpt-5.2-codex' // GPT-5.2 Codex via Cursor
  | 'cursor-gpt-5.2-codex-high' // GPT-5.2 Codex High via Cursor
  | 'cursor-gpt-5.2-codex-max' // GPT-5.2 Codex Max via Cursor
  | 'cursor-gpt-5.2-codex-max-high' // GPT-5.2 Codex Max High via Cursor
  | 'cursor-grok'; // Grok

/**
 * Legacy Cursor model IDs (without prefix) for migration support
 */
export type LegacyCursorModelId =
  | 'auto'
  | 'composer-1'
  | 'sonnet-4.6'
  | 'sonnet-4.6-thinking'
  | 'sonnet-4.5'
  | 'sonnet-4.5-thinking'
  | 'opus-4.5'
  | 'opus-4.5-thinking'
  | 'opus-4.1'
  | 'gemini-3-pro'
  | 'gemini-3-flash'
  | 'grok';

/**
 * One Cursor model, as every surface that lists Cursor models sees it.
 *
 * Identity (`id`, `provider`), presentation (`label`, `description`) and
 * capabilities (everything else). A surface takes the fields it needs and
 * invents none.
 */
export interface CursorModelRow {
  /** Canonical ID, always `cursor-` prefixed. The form stored on a feature. */
  id: CursorModelId;
  /** Display name, identical in the picker, the card badge and the output header. */
  label: string;
  /** One sentence explaining what the model is for. */
  description: string;
  /** Always `'cursor'`: the provider that serves the model. */
  provider: Extract<ModelProvider, 'cursor'>;
  /** Whether the model accepts image inputs. Always false: the CLI drops images. */
  supportsVision: boolean;
  /** Whether the model can call tools. */
  supportsTools: boolean;
  /** Whether the model takes Automaker's thinking level. */
  hasThinking: boolean;
  /** Whether this is the model Automaker offers when Cursor is first chosen. */
  isDefault: boolean;
}

/**
 * The catalogue itself, keyed by canonical ID.
 *
 * Ordered as the picker offers them -- Auto first, then Composer, the Claude
 * models, the Gemini models, the GPT models and Grok -- because every derived
 * list inherits this order.
 */
export const CURSOR_MODEL_CATALOGUE: Record<CursorModelId, CursorModelRow> = {
  'cursor-auto': {
    id: 'cursor-auto',
    label: 'Auto (Recommended)',
    description: 'Automatically selects the best model for each task',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: true,
  },
  'cursor-composer-1': {
    id: 'cursor-composer-1',
    label: 'Composer 1',
    description: 'Cursor Composer agent model optimized for multi-file edits',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-sonnet-4.6': {
    id: 'cursor-sonnet-4.6',
    label: 'Claude Sonnet 4.6',
    description: 'Anthropic Claude Sonnet 4.6 via Cursor',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-sonnet-4.6-thinking': {
    id: 'cursor-sonnet-4.6-thinking',
    label: 'Claude Sonnet 4.6 (Thinking)',
    description: 'Claude Sonnet 4.6 with extended thinking enabled',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: true,
    isDefault: false,
  },
  'cursor-sonnet-4.5': {
    id: 'cursor-sonnet-4.5',
    label: 'Claude Sonnet 4.5',
    description: 'Anthropic Claude Sonnet 4.5 via Cursor',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-sonnet-4.5-thinking': {
    id: 'cursor-sonnet-4.5-thinking',
    label: 'Claude Sonnet 4.5 (Thinking)',
    description: 'Claude Sonnet 4.5 with extended thinking enabled',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: true,
    isDefault: false,
  },
  'cursor-opus-4.5': {
    id: 'cursor-opus-4.5',
    label: 'Claude Opus 4.5',
    description: 'Anthropic Claude Opus 4.5 via Cursor',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-opus-4.5-thinking': {
    id: 'cursor-opus-4.5-thinking',
    label: 'Claude Opus 4.5 (Thinking)',
    description: 'Claude Opus 4.5 with extended thinking enabled',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: true,
    isDefault: false,
  },
  'cursor-opus-4.1': {
    id: 'cursor-opus-4.1',
    label: 'Claude Opus 4.1',
    description: 'Anthropic Claude Opus 4.1 via Cursor',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gemini-3-pro': {
    id: 'cursor-gemini-3-pro',
    label: 'Gemini 3 Pro',
    description: 'Google Gemini 3 Pro via Cursor',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gemini-3-flash': {
    id: 'cursor-gemini-3-flash',
    label: 'Gemini 3 Flash',
    description: 'Google Gemini 3 Flash (faster)',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.2': {
    id: 'cursor-gpt-5.2',
    label: 'GPT-5.2',
    description: 'OpenAI GPT-5.2 via Cursor',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.1': {
    id: 'cursor-gpt-5.1',
    label: 'GPT-5.1',
    description: 'OpenAI GPT-5.1 via Cursor',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.2-high': {
    id: 'cursor-gpt-5.2-high',
    label: 'GPT-5.2 High',
    description: 'OpenAI GPT-5.2 with high compute',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.1-high': {
    id: 'cursor-gpt-5.1-high',
    label: 'GPT-5.1 High',
    description: 'OpenAI GPT-5.1 with high compute',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.1-codex': {
    id: 'cursor-gpt-5.1-codex',
    label: 'GPT-5.1 Codex',
    description: 'OpenAI GPT-5.1 Codex for code generation',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.1-codex-high': {
    id: 'cursor-gpt-5.1-codex-high',
    label: 'GPT-5.1 Codex High',
    description: 'OpenAI GPT-5.1 Codex with high compute',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.1-codex-max': {
    id: 'cursor-gpt-5.1-codex-max',
    label: 'GPT-5.1 Codex Max',
    description: 'OpenAI GPT-5.1 Codex Max capacity',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.1-codex-max-high': {
    id: 'cursor-gpt-5.1-codex-max-high',
    label: 'GPT-5.1 Codex Max High',
    description: 'OpenAI GPT-5.1 Codex Max with high compute',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.2-codex': {
    id: 'cursor-gpt-5.2-codex',
    label: 'GPT-5.2 Codex',
    description: 'OpenAI GPT-5.2 Codex for code generation',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.2-codex-high': {
    id: 'cursor-gpt-5.2-codex-high',
    label: 'GPT-5.2 Codex High',
    description: 'OpenAI GPT-5.2 Codex with high compute',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.2-codex-max': {
    id: 'cursor-gpt-5.2-codex-max',
    label: 'GPT-5.2 Codex Max',
    description: 'OpenAI GPT-5.2 Codex Max capacity',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-gpt-5.2-codex-max-high': {
    id: 'cursor-gpt-5.2-codex-max-high',
    label: 'GPT-5.2 Codex Max High',
    description: 'OpenAI GPT-5.2 Codex Max with high compute',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
  'cursor-grok': {
    id: 'cursor-grok',
    label: 'Grok',
    description: 'xAI Grok via Cursor',
    provider: 'cursor',
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
 * `Object.values(CURSOR_MODEL_CATALOGUE)` so the order is stated once.
 */
export const CURSOR_CATALOGUE_ROWS: CursorModelRow[] = Object.values(CURSOR_MODEL_CATALOGUE);

/**
 * The server's Cursor model list, derived from the catalogue.
 *
 * `provider` here is the *wire* provider -- who serves the model over the API --
 * which for the Cursor CLI is Cursor itself, while the row's own `provider` is
 * the Automaker provider the user picked. Two different questions that happen to
 * share an answer for this provider, deliberately not merged.
 *
 * `modelString` is the canonical ID: the Cursor CLI is handed the model the user
 * picked, prefix and all, and nothing here strips it.
 */
export const CURSOR_MODEL_DEFINITIONS: ModelDefinition[] = CURSOR_CATALOGUE_ROWS.map((row) => ({
  id: row.id,
  name: row.label,
  modelString: row.id,
  provider: 'cursor',
  description: row.description,
  supportsTools: row.supportsTools,
  supportsVision: row.supportsVision,
  default: row.isDefault,
}));

/**
 * The model Automaker offers when Cursor is first chosen, read off the row that
 * declares it rather than written a second time.
 */
export const DEFAULT_CURSOR_MODEL: CursorModelId = (
  CURSOR_CATALOGUE_ROWS.find((row) => row.isDefault) ?? CURSOR_CATALOGUE_ROWS[0]
).id;

/**
 * Map from legacy model IDs to canonical prefixed IDs
 */
export const LEGACY_CURSOR_MODEL_MAP: Record<LegacyCursorModelId, CursorModelId> = {
  auto: 'cursor-auto',
  'composer-1': 'cursor-composer-1',
  'sonnet-4.6': 'cursor-sonnet-4.6',
  'sonnet-4.6-thinking': 'cursor-sonnet-4.6-thinking',
  'sonnet-4.5': 'cursor-sonnet-4.5',
  'sonnet-4.5-thinking': 'cursor-sonnet-4.5-thinking',
  'opus-4.5': 'cursor-opus-4.5',
  'opus-4.5-thinking': 'cursor-opus-4.5-thinking',
  'opus-4.1': 'cursor-opus-4.1',
  'gemini-3-pro': 'cursor-gemini-3-pro',
  'gemini-3-flash': 'cursor-gemini-3-flash',
  grok: 'cursor-grok',
};

/**
 * Helper: Check if model has thinking capability
 */
export function cursorModelHasThinking(modelId: CursorModelId): boolean {
  return CURSOR_MODEL_CATALOGUE[modelId]?.hasThinking ?? false;
}

/**
 * Helper: Get display name for model
 *
 * Reads the provider's own catalogue, which is the same input `MODEL_DISPLAY_NAMES`
 * is assembled from -- not a second table.
 */
export function getCursorModelLabel(modelId: CursorModelId): string {
  return CURSOR_MODEL_CATALOGUE[modelId]?.label ?? modelId;
}

/**
 * Helper: Get all cursor model IDs
 */
export function getAllCursorModelIds(): CursorModelId[] {
  return Object.keys(CURSOR_MODEL_CATALOGUE) as CursorModelId[];
}

// ============================================================================
// Model Grouping System
// Groups related model variants (e.g., gpt-5.2 + gpt-5.2-high) for UI display
// ============================================================================

/**
 * Type of variant options available for grouped models
 */
export type VariantType = 'compute' | 'thinking' | 'capacity';

/**
 * A single variant option within a grouped model
 */
export interface ModelVariant {
  id: CursorModelId;
  label: string;
  description?: string;
  badge?: string;
}

/**
 * A grouped model that contains multiple variant options
 */
export interface GroupedModel {
  baseId: string;
  label: string;
  description: string;
  variantType: VariantType;
  variants: ModelVariant[];
}

/**
 * Configuration for grouping Cursor models with variants
 * All variant IDs use 'cursor-' prefix for consistent provider routing.
 */
export const CURSOR_MODEL_GROUPS: GroupedModel[] = [
  // GPT-5.2 group (compute levels)
  {
    baseId: 'cursor-gpt-5.2-group',
    label: 'GPT-5.2',
    description: 'OpenAI GPT-5.2 via Cursor',
    variantType: 'compute',
    variants: [
      { id: 'cursor-gpt-5.2', label: 'Standard', description: 'Default compute level' },
      {
        id: 'cursor-gpt-5.2-high',
        label: 'High',
        description: 'High compute level',
        badge: 'More tokens',
      },
    ],
  },
  // GPT-5.1 group (compute levels)
  {
    baseId: 'cursor-gpt-5.1-group',
    label: 'GPT-5.1',
    description: 'OpenAI GPT-5.1 via Cursor',
    variantType: 'compute',
    variants: [
      { id: 'cursor-gpt-5.1', label: 'Standard', description: 'Default compute level' },
      {
        id: 'cursor-gpt-5.1-high',
        label: 'High',
        description: 'High compute level',
        badge: 'More tokens',
      },
    ],
  },
  // GPT-5.1 Codex group (capacity + compute matrix)
  {
    baseId: 'cursor-gpt-5.1-codex-group',
    label: 'GPT-5.1 Codex',
    description: 'OpenAI GPT-5.1 Codex for code generation',
    variantType: 'capacity',
    variants: [
      { id: 'cursor-gpt-5.1-codex', label: 'Standard', description: 'Default capacity' },
      {
        id: 'cursor-gpt-5.1-codex-high',
        label: 'High',
        description: 'High compute',
        badge: 'Compute',
      },
      {
        id: 'cursor-gpt-5.1-codex-max',
        label: 'Max',
        description: 'Maximum capacity',
        badge: 'Capacity',
      },
      {
        id: 'cursor-gpt-5.1-codex-max-high',
        label: 'Max High',
        description: 'Max capacity + high compute',
        badge: 'Premium',
      },
    ],
  },
  // GPT-5.2 Codex group (capacity + compute matrix)
  {
    baseId: 'cursor-gpt-5.2-codex-group',
    label: 'GPT-5.2 Codex',
    description: 'OpenAI GPT-5.2 Codex for code generation',
    variantType: 'capacity',
    variants: [
      { id: 'cursor-gpt-5.2-codex', label: 'Standard', description: 'Default capacity' },
      {
        id: 'cursor-gpt-5.2-codex-high',
        label: 'High',
        description: 'High compute',
        badge: 'Compute',
      },
      {
        id: 'cursor-gpt-5.2-codex-max',
        label: 'Max',
        description: 'Maximum capacity',
        badge: 'Capacity',
      },
      {
        id: 'cursor-gpt-5.2-codex-max-high',
        label: 'Max High',
        description: 'Max capacity + high compute',
        badge: 'Premium',
      },
    ],
  },
  // Sonnet 4.6 group (thinking mode)
  {
    baseId: 'cursor-sonnet-4.6-group',
    label: 'Claude Sonnet 4.6',
    description: 'Anthropic Claude Sonnet 4.6 via Cursor',
    variantType: 'thinking',
    variants: [
      { id: 'cursor-sonnet-4.6', label: 'Standard', description: 'Fast responses' },
      {
        id: 'cursor-sonnet-4.6-thinking',
        label: 'Thinking',
        description: 'Extended reasoning',
        badge: 'Reasoning',
      },
    ],
  },
  // Sonnet 4.5 group (thinking mode)
  {
    baseId: 'cursor-sonnet-4.5-group',
    label: 'Claude Sonnet 4.5',
    description: 'Anthropic Claude Sonnet 4.5 via Cursor',
    variantType: 'thinking',
    variants: [
      { id: 'cursor-sonnet-4.5', label: 'Standard', description: 'Fast responses' },
      {
        id: 'cursor-sonnet-4.5-thinking',
        label: 'Thinking',
        description: 'Extended reasoning',
        badge: 'Reasoning',
      },
    ],
  },
  // Opus 4.5 group (thinking mode)
  {
    baseId: 'cursor-opus-4.5-group',
    label: 'Claude Opus 4.5',
    description: 'Anthropic Claude Opus 4.5 via Cursor',
    variantType: 'thinking',
    variants: [
      { id: 'cursor-opus-4.5', label: 'Standard', description: 'Fast responses' },
      {
        id: 'cursor-opus-4.5-thinking',
        label: 'Thinking',
        description: 'Extended reasoning',
        badge: 'Reasoning',
      },
    ],
  },
];

/**
 * Cursor models that are not part of any group (standalone)
 * All IDs use 'cursor-' prefix for consistent provider routing.
 */
export const STANDALONE_CURSOR_MODELS: CursorModelId[] = [
  'cursor-auto',
  'cursor-composer-1',
  'cursor-opus-4.1',
  'cursor-gemini-3-pro',
  'cursor-gemini-3-flash',
  'cursor-grok',
];

/**
 * Get the group that a model belongs to (if any)
 */
export function getModelGroup(modelId: CursorModelId): GroupedModel | undefined {
  return CURSOR_MODEL_GROUPS.find((group) => group.variants.some((v) => v.id === modelId));
}

/**
 * Check if any variant in a group is the currently selected model
 */
export function isGroupSelected(
  group: GroupedModel,
  currentModelId: CursorModelId | undefined
): boolean {
  if (!currentModelId) return false;
  return group.variants.some((v) => v.id === currentModelId);
}

/**
 * Get the currently selected variant within a group
 */
export function getSelectedVariant(
  group: GroupedModel,
  currentModelId: CursorModelId | undefined
): ModelVariant | undefined {
  if (!currentModelId) return undefined;
  return group.variants.find((v) => v.id === currentModelId);
}

/**
 * Check if a model ID belongs to a group
 */
export function isGroupedCursorModel(modelId: CursorModelId): boolean {
  return CURSOR_MODEL_GROUPS.some((group) => group.variants.some((v) => v.id === modelId));
}
