/**
 * The Copilot catalogue -- one table of GitHub Copilot model rows.
 *
 * Every surface that lists Copilot models derives from this table rather than
 * restating it: the UI's picker list, the server's model list and the
 * display-name lookup. The shape is the one the Codex catalogue established in
 * ngut-1995/harbor#82, so a reader who knows one provider's catalogue knows them
 * all, and the guard that keeps model rows inside catalogue modules has one
 * shape to recognise (ngut-1995/harbor#83).
 *
 * Reference: https://github.com/github/copilot
 *
 * IMPORTANT: All Copilot IDs use the 'copilot-' prefix, which is what keeps them
 * distinct from another provider's row for the same underlying model
 * (`copilot-claude-opus-4.5` is not a Claude tier alias, and must never be read
 * as one). The prefix is stripped at the wire boundary, not here.
 *
 * ## Declared, not exhaustive
 *
 * Which models a user can actually reach depends on their Copilot subscription,
 * and the CLI reports that at runtime. This table is what Automaker declares
 * statically, so a picker has something to offer before the CLI has answered;
 * runtime-discovered models are added alongside these rows by the server and are
 * not distinguished in the picker.
 *
 * Copilot declares no cost class and no output ceiling here, and this table does
 * not invent them. `badge` says whether the model takes images, which is the
 * hint the picker has always shown for this provider. `hasThinking` is false
 * throughout: Automaker sends no thinking level through Copilot.
 */

import type { ModelDefinition } from './provider.js';
import type { ModelProvider } from './settings.js';

/**
 * Copilot model ID. Keys already carry the `copilot-` prefix.
 */
export type CopilotModelId =
  | 'copilot-claude-sonnet-4.6'
  | 'copilot-claude-sonnet-4.5'
  | 'copilot-claude-haiku-4.5'
  | 'copilot-claude-opus-4.5'
  | 'copilot-claude-sonnet-4'
  | 'copilot-gpt-5.2-codex'
  | 'copilot-gpt-5.1-codex-max'
  | 'copilot-gpt-5.1-codex'
  | 'copilot-gpt-5.2'
  | 'copilot-gpt-5.1'
  | 'copilot-gpt-5'
  | 'copilot-gpt-5.1-codex-mini'
  | 'copilot-gpt-5-mini'
  | 'copilot-gpt-4.1'
  | 'copilot-gemini-3-pro-preview';

/**
 * One Copilot model, as every surface that lists Copilot models sees it.
 *
 * Identity (`id`, `provider`), presentation (`label`, `description`, `badge`)
 * and capabilities (everything else). A surface takes the fields it needs and
 * invents none.
 */
export interface CopilotModelRow {
  /** Canonical ID, always `copilot-` prefixed. The form stored on a feature. */
  id: CopilotModelId;
  /** Display name, identical in the picker, the card badge and the output header. */
  label: string;
  /** One sentence explaining what the model is for. */
  description: string;
  /** Always `'copilot'`: the provider that serves the model. */
  provider: Extract<ModelProvider, 'copilot'>;
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
  /** Whether this is the model Automaker offers when Copilot is first chosen. */
  isDefault: boolean;
}

/**
 * The catalogue itself, keyed by canonical ID.
 *
 * Ordered by vendor -- the Claude models, then the GPT models, then Gemini --
 * because every derived list inherits this order.
 */
export const COPILOT_MODEL_CATALOGUE: Record<CopilotModelId, CopilotModelRow> = {
  'copilot-claude-sonnet-4.6': {
    id: 'copilot-claude-sonnet-4.6',
    label: 'Claude Sonnet 4.6',
    description: 'Anthropic Claude Sonnet 4.6 via GitHub Copilot.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 200000,
    isDefault: true,
  },
  'copilot-claude-sonnet-4.5': {
    id: 'copilot-claude-sonnet-4.5',
    label: 'Claude Sonnet 4.5',
    description: 'Anthropic Claude Sonnet 4.5 via GitHub Copilot.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 200000,
    isDefault: false,
  },
  'copilot-claude-haiku-4.5': {
    id: 'copilot-claude-haiku-4.5',
    label: 'Claude Haiku 4.5',
    description: 'Fast and efficient Claude Haiku 4.5 via GitHub Copilot.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 200000,
    isDefault: false,
  },
  'copilot-claude-opus-4.5': {
    id: 'copilot-claude-opus-4.5',
    label: 'Claude Opus 4.5',
    description: 'Most capable Claude Opus 4.5 via GitHub Copilot.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 200000,
    isDefault: false,
  },
  'copilot-claude-sonnet-4': {
    id: 'copilot-claude-sonnet-4',
    label: 'Claude Sonnet 4',
    description: 'Anthropic Claude Sonnet 4 via GitHub Copilot.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 200000,
    isDefault: false,
  },
  'copilot-gpt-5.2-codex': {
    id: 'copilot-gpt-5.2-codex',
    label: 'GPT-5.2 Codex',
    description: 'OpenAI GPT-5.2 Codex for advanced coding tasks.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 128000,
    isDefault: false,
  },
  'copilot-gpt-5.1-codex-max': {
    id: 'copilot-gpt-5.1-codex-max',
    label: 'GPT-5.1 Codex Max',
    description: 'Maximum capability GPT-5.1 Codex model.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 128000,
    isDefault: false,
  },
  'copilot-gpt-5.1-codex': {
    id: 'copilot-gpt-5.1-codex',
    label: 'GPT-5.1 Codex',
    description: 'OpenAI GPT-5.1 Codex for coding tasks.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 128000,
    isDefault: false,
  },
  'copilot-gpt-5.2': {
    id: 'copilot-gpt-5.2',
    label: 'GPT-5.2',
    description: 'Latest OpenAI GPT-5.2 model.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 128000,
    isDefault: false,
  },
  'copilot-gpt-5.1': {
    id: 'copilot-gpt-5.1',
    label: 'GPT-5.1',
    description: 'OpenAI GPT-5.1 model.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 128000,
    isDefault: false,
  },
  'copilot-gpt-5': {
    id: 'copilot-gpt-5',
    label: 'GPT-5',
    description: 'OpenAI GPT-5 base model.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 128000,
    isDefault: false,
  },
  'copilot-gpt-5.1-codex-mini': {
    id: 'copilot-gpt-5.1-codex-mini',
    label: 'GPT-5.1 Codex Mini',
    description: 'Fast and efficient GPT-5.1 Codex Mini.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 128000,
    isDefault: false,
  },
  'copilot-gpt-5-mini': {
    id: 'copilot-gpt-5-mini',
    label: 'GPT-5 Mini',
    description: 'Lightweight GPT-5 Mini model.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 128000,
    isDefault: false,
  },
  'copilot-gpt-4.1': {
    id: 'copilot-gpt-4.1',
    label: 'GPT-4.1',
    description: 'OpenAI GPT-4.1 model.',
    provider: 'copilot',
    badge: 'Vision',
    supportsVision: true,
    supportsTools: true,
    hasThinking: false,
    contextWindow: 128000,
    isDefault: false,
  },
  'copilot-gemini-3-pro-preview': {
    id: 'copilot-gemini-3-pro-preview',
    label: 'Gemini 3 Pro Preview',
    description: 'Google Gemini 3 Pro Preview via GitHub Copilot.',
    provider: 'copilot',
    badge: 'Vision',
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
 * `Object.values(COPILOT_MODEL_CATALOGUE)` so the order is stated once.
 */
export const COPILOT_CATALOGUE_ROWS: CopilotModelRow[] = Object.values(COPILOT_MODEL_CATALOGUE);

/**
 * The server's Copilot model list, derived from the catalogue.
 *
 * `provider` here is the *wire* provider -- who serves the model over the API --
 * which is GitHub Copilot, whoever built the underlying model. The row's own
 * `provider` is the Automaker provider the user picked. Two different questions
 * that happen to share an answer for this provider, deliberately not merged.
 *
 * `modelString` drops the `copilot-` prefix, because that is the name the CLI
 * takes. It is the one place the prefix is stripped.
 */
export const COPILOT_MODEL_DEFINITIONS: ModelDefinition[] = COPILOT_CATALOGUE_ROWS.map((row) => ({
  id: row.id,
  name: row.label,
  modelString: row.id.replace('copilot-', ''),
  provider: 'copilot',
  description: row.description,
  supportsTools: row.supportsTools,
  supportsVision: row.supportsVision,
  contextWindow: row.contextWindow,
}));

/**
 * Get all Copilot model IDs
 */
export function getAllCopilotModelIds(): CopilotModelId[] {
  return Object.keys(COPILOT_MODEL_CATALOGUE) as CopilotModelId[];
}

/**
 * The model Automaker offers when Copilot is first chosen, read off the row that
 * declares it rather than written a second time.
 */
export const DEFAULT_COPILOT_MODEL: CopilotModelId = (
  COPILOT_CATALOGUE_ROWS.find((row) => row.isDefault) ?? COPILOT_CATALOGUE_ROWS[0]
).id;

/**
 * GitHub Copilot authentication status
 */
export interface CopilotAuthStatus {
  authenticated: boolean;
  method: 'oauth' | 'cli' | 'none';
  authType?: string;
  login?: string;
  host?: string;
  statusMessage?: string;
  error?: string;
}

/**
 * Copilot CLI status (used for installation detection)
 */
export interface CopilotCliStatus {
  installed: boolean;
  version?: string;
  path?: string;
  auth?: CopilotAuthStatus;
  error?: string;
}

/**
 * Copilot model info from SDK runtime discovery
 */
export interface CopilotRuntimeModel {
  id: string;
  name: string;
  capabilities?: {
    supportsVision?: boolean;
    maxInputTokens?: number;
    maxOutputTokens?: number;
  };
  policy?: {
    state: 'enabled' | 'disabled' | 'unconfigured';
    terms?: string;
  };
  billing?: {
    multiplier: number;
  };
}
