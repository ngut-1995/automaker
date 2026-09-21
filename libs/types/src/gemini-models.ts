/**
 * The Gemini catalogue -- one table of Gemini model rows.
 *
 * Every surface that lists Gemini models derives from this table rather than
 * restating it: the UI's picker list, the server's model list and the
 * display-name lookup. The shape is the one the Codex catalogue established in
 * ngut-1995/harbor#82, so a reader who knows one provider's catalogue knows them
 * all, and the guard that keeps model rows inside catalogue modules has one
 * shape to recognise (ngut-1995/harbor#83).
 *
 * Reference: https://github.com/google-gemini/gemini-cli
 *
 * IMPORTANT: Gemini IDs carry their own `gemini-` prefix already, so no prefix
 * is added anywhere: the ID the CLI takes is the ID a feature stores.
 *
 * ## What a Gemini row does not carry
 *
 * Gemini declares no cost class and no output ceiling here, and this table does
 * not invent them. Reasoning depth is spelled `hasThinking`: a Gemini model is
 * given Automaker's thinking level, never an effort level (see CONTEXT.md,
 * "Reasoning depth").
 */

import type { ModelDefinition } from './provider.js';
import type { ModelProvider } from './settings.js';

/**
 * Gemini model ID. Keys already carry the `gemini-` prefix.
 */
export type GeminiModelId =
  | 'gemini-3-pro-preview'
  | 'gemini-3-flash-preview'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite';

/**
 * One Gemini model, as every surface that lists Gemini models sees it.
 *
 * Identity (`id`, `provider`), presentation (`label`, `description`, `badge`)
 * and capabilities (everything else). A surface takes the fields it needs and
 * invents none.
 */
export interface GeminiModelRow {
  /** Canonical ID, always `gemini-` prefixed. The form stored on a feature. */
  id: GeminiModelId;
  /** Display name, identical in the picker, the card badge and the output header. */
  label: string;
  /** One sentence explaining what the model is for. */
  description: string;
  /** Always `'gemini'`: the provider that serves the model. */
  provider: Extract<ModelProvider, 'gemini'>;
  /** One-word hint shown beside the label in a picker. */
  badge: string;
  /** Whether the model accepts image inputs. */
  supportsVision: boolean;
  /** Whether the model can call tools. */
  supportsTools: boolean;
  /** Whether the model takes Automaker's thinking level. */
  hasThinking: boolean;
  /** Input tokens the model accepts. */
  contextWindow: number;
  /** Whether this is the model Automaker offers when Gemini is first chosen. */
  isDefault: boolean;
}

/**
 * The catalogue itself, keyed by canonical ID.
 *
 * Ordered newest series first, because every derived list inherits this order.
 */
export const GEMINI_MODEL_CATALOGUE: Record<GeminiModelId, GeminiModelRow> = {
  'gemini-3-pro-preview': {
    id: 'gemini-3-pro-preview',
    label: 'Gemini 3 Pro Preview',
    description: 'Most advanced Gemini model with deep reasoning capabilities.',
    provider: 'gemini',
    badge: 'Thinking',
    supportsVision: true,
    supportsTools: true,
    hasThinking: true,
    contextWindow: 1000000,
    isDefault: false,
  },
  'gemini-3-flash-preview': {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    description: 'Fast Gemini 3 model for quick tasks.',
    provider: 'gemini',
    badge: 'Thinking',
    supportsVision: true,
    supportsTools: true,
    hasThinking: true,
    contextWindow: 1000000,
    isDefault: false,
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Advanced model with strong reasoning and 1M context.',
    provider: 'gemini',
    badge: 'Thinking',
    supportsVision: true,
    supportsTools: true,
    hasThinking: true,
    contextWindow: 1000000,
    isDefault: false,
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Balanced speed and capability for most tasks.',
    provider: 'gemini',
    badge: 'Thinking',
    supportsVision: true,
    supportsTools: true,
    hasThinking: true,
    contextWindow: 1000000,
    isDefault: true,
  },
  'gemini-2.5-flash-lite': {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    description: 'Fastest Gemini model for simple tasks.',
    provider: 'gemini',
    badge: 'Speed',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 1000000,
    isDefault: false,
  },
};

/**
 * The catalogue as a list, in catalogue order.
 *
 * This is what a surface maps over. Reach for it rather than
 * `Object.values(GEMINI_MODEL_CATALOGUE)` so the order is stated once.
 */
export const GEMINI_CATALOGUE_ROWS: GeminiModelRow[] = Object.values(GEMINI_MODEL_CATALOGUE);

/**
 * The server's Gemini model list, derived from the catalogue.
 *
 * `provider` here is the *wire* provider -- who serves the model over the API --
 * which is Google, reached through the Gemini CLI. The row's own `provider` is
 * the Automaker provider the user picked. Two different questions, deliberately
 * not merged.
 */
export const GEMINI_MODEL_DEFINITIONS: ModelDefinition[] = GEMINI_CATALOGUE_ROWS.map((row) => ({
  id: row.id,
  name: row.label,
  modelString: row.id,
  provider: 'gemini',
  description: row.description,
  supportsTools: row.supportsTools,
  supportsVision: row.supportsVision,
  contextWindow: row.contextWindow,
}));

/**
 * Get all Gemini model IDs
 */
export function getAllGeminiModelIds(): GeminiModelId[] {
  return Object.keys(GEMINI_MODEL_CATALOGUE) as GeminiModelId[];
}

/**
 * The model Automaker offers when Gemini is first chosen, read off the row that
 * declares it rather than written a second time.
 */
export const DEFAULT_GEMINI_MODEL: GeminiModelId = (
  GEMINI_CATALOGUE_ROWS.find((row) => row.isDefault) ?? GEMINI_CATALOGUE_ROWS[0]
).id;

/**
 * Thinking level configuration for Gemini models
 * Note: The Gemini CLI does not currently expose a --thinking-level flag.
 * Thinking control (thinkingLevel/thinkingBudget) is available via the Gemini API.
 * This type is defined for potential future CLI support or API-level configuration.
 */
export type GeminiThinkingLevel = 'off' | 'low' | 'medium' | 'high';

/**
 * Gemini CLI authentication status
 */
export interface GeminiAuthStatus {
  authenticated: boolean;
  method: 'google_login' | 'api_key' | 'vertex_ai' | 'none';
  hasApiKey?: boolean;
  hasEnvApiKey?: boolean;
  hasCredentialsFile?: boolean;
  error?: string;
}
