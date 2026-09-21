/**
 * Unit tests for agent-context-parser.ts
 * Tests the formatModelName function with provider-aware model name lookup
 */

import { describe, it, expect } from 'vitest';
import {
  formatModelName,
  DEFAULT_MODEL,
  type FormatModelNameOptions,
} from '../../../src/lib/agent-context-parser';
import type { ClaudeCompatibleProvider, ProviderModel } from '@automaker/types';
import {
  getModelDisplayName as getTypesModelDisplayName,
  CODEX_MODEL_IDS,
  CURSOR_MODEL_MAP,
  COPILOT_MODEL_MAP,
  GEMINI_MODEL_MAP,
  OPENCODE_MODELS,
} from '@automaker/types';
import { getModelDisplayName as getUiModelDisplayName } from '../../../src/lib/utils';

/**
 * Every shape of Claude model string a display helper can be handed: bare tier
 * aliases, canonical IDs, the versions Automaker once pinned on the user's
 * behalf, an undated tier-alias identifier, hand-written pins and versions that
 * do not exist yet.
 */
const CLAUDE_MODEL_STRINGS = [
  'haiku',
  'sonnet',
  'opus',
  'claude-haiku',
  'claude-sonnet',
  'claude-opus',
  'claude-haiku-4-5',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-opus-9-9',
  'claude-sonnet-1-19991231',
] as const;

const CLAUDE_TIER_NAMES = ['Claude Haiku', 'Claude Sonnet', 'Claude Opus'];

describe('agent-context-parser.ts', () => {
  describe('DEFAULT_MODEL', () => {
    it('should be a canonical ID, not a pinned version', () => {
      expect(DEFAULT_MODEL).toBe('claude-opus');
    });
  });

  describe('formatModelName', () => {
    describe('Provider-aware lookup', () => {
      it('should return provider displayName when providerId matches and model is found', () => {
        const providers: ClaudeCompatibleProvider[] = [
          {
            id: 'moonshot-ai',
            name: 'Moonshot AI',
            models: [
              { id: 'claude-sonnet-1-9', displayName: 'Moonshot v1.8' },
              { id: 'claude-opus-4-6', displayName: 'Moonshot v1.8 Pro' },
            ],
          },
        ];

        const options: FormatModelNameOptions = {
          providerId: 'moonshot-ai',
          claudeCompatibleProviders: providers,
        };

        expect(formatModelName('claude-sonnet-1-9', options)).toBe('Moonshot v1.8');
        expect(formatModelName('claude-opus-4-6', options)).toBe('Moonshot v1.8 Pro');
      });

      it('should return provider displayName for GLM models', () => {
        const providers: ClaudeCompatibleProvider[] = [
          {
            id: 'zhipu',
            name: 'Zhipu AI',
            models: [
              { id: 'claude-sonnet-1-9', displayName: 'GLM 4.7' },
              { id: 'claude-opus-4-6', displayName: 'GLM 4.7 Pro' },
            ],
          },
        ];

        const options: FormatModelNameOptions = {
          providerId: 'zhipu',
          claudeCompatibleProviders: providers,
        };

        expect(formatModelName('claude-sonnet-1-9', options)).toBe('GLM 4.7');
      });

      it('should return provider displayName for MiniMax models', () => {
        const providers: ClaudeCompatibleProvider[] = [
          {
            id: 'minimax',
            name: 'MiniMax',
            models: [
              { id: 'claude-sonnet-1-9', displayName: 'MiniMax M2.1' },
              { id: 'claude-opus-4-6', displayName: 'MiniMax M2.1 Pro' },
            ],
          },
        ];

        const options: FormatModelNameOptions = {
          providerId: 'minimax',
          claudeCompatibleProviders: providers,
        };

        expect(formatModelName('claude-sonnet-1-9', options)).toBe('MiniMax M2.1');
      });

      it('should fallback to default formatting when providerId is not found', () => {
        const providers: ClaudeCompatibleProvider[] = [
          {
            id: 'moonshot-ai',
            name: 'Moonshot AI',
            models: [{ id: 'claude-sonnet-1-9', displayName: 'Moonshot v1.8' }],
          },
        ];

        const options: FormatModelNameOptions = {
          providerId: 'unknown-provider',
          claudeCompatibleProviders: providers,
        };

        // Should fall through to default Claude formatting
        expect(formatModelName('claude-sonnet-1-9', options)).toBe('Claude Sonnet');
      });

      it('should fallback to default formatting when model is not in provider models', () => {
        const providers: ClaudeCompatibleProvider[] = [
          {
            id: 'moonshot-ai',
            name: 'Moonshot AI',
            models: [{ id: 'claude-sonnet-1-9', displayName: 'Moonshot v1.8' }],
          },
        ];

        const options: FormatModelNameOptions = {
          providerId: 'moonshot-ai',
          claudeCompatibleProviders: providers,
        };

        // Model not in provider's list, should use the tier name
        expect(formatModelName('claude-haiku-4-5', options)).toBe('Claude Haiku');
      });

      it('should handle empty providers array', () => {
        const options: FormatModelNameOptions = {
          providerId: 'moonshot-ai',
          claudeCompatibleProviders: [],
        };

        expect(formatModelName('claude-sonnet-1-9', options)).toBe('Claude Sonnet');
      });

      it('should handle provider with no models array', () => {
        const providers: ClaudeCompatibleProvider[] = [
          {
            id: 'moonshot-ai',
            name: 'Moonshot AI',
          },
        ];

        const options: FormatModelNameOptions = {
          providerId: 'moonshot-ai',
          claudeCompatibleProviders: providers,
        };

        expect(formatModelName('claude-sonnet-1-9', options)).toBe('Claude Sonnet');
      });

      it('should handle model with no displayName', () => {
        const providers: ClaudeCompatibleProvider[] = [
          {
            id: 'moonshot-ai',
            name: 'Moonshot AI',
            models: [{ id: 'claude-sonnet-1-9' } as unknown as ProviderModel], // No displayName
          },
        ];

        const options: FormatModelNameOptions = {
          providerId: 'moonshot-ai',
          claudeCompatibleProviders: providers,
        };

        expect(formatModelName('claude-sonnet-1-9', options)).toBe('Claude Sonnet');
      });

      it('should ignore provider lookup when providerId is undefined', () => {
        const providers: ClaudeCompatibleProvider[] = [
          {
            id: 'moonshot-ai',
            name: 'Moonshot AI',
            models: [{ id: 'claude-sonnet-1-9', displayName: 'Moonshot v1.8' }],
          },
        ];

        const options: FormatModelNameOptions = {
          providerId: undefined,
          claudeCompatibleProviders: providers,
        };

        expect(formatModelName('claude-sonnet-1-9', options)).toBe('Claude Sonnet');
      });

      it('should ignore provider lookup when claudeCompatibleProviders is undefined', () => {
        const options: FormatModelNameOptions = {
          providerId: 'moonshot-ai',
          claudeCompatibleProviders: undefined,
        };

        expect(formatModelName('claude-sonnet-1-9', options)).toBe('Claude Sonnet');
      });

      it('should use default formatting when no options provided', () => {
        expect(formatModelName('claude-sonnet-1-9')).toBe('Claude Sonnet');
        expect(formatModelName('claude-opus-4-6')).toBe('Claude Opus');
      });

      it('should handle OpenRouter provider with multiple models', () => {
        const providers: ClaudeCompatibleProvider[] = [
          {
            id: 'openrouter',
            name: 'OpenRouter',
            models: [
              { id: 'claude-sonnet-1-9', displayName: 'Claude Sonnet (OpenRouter)' },
              { id: 'claude-opus-4-6', displayName: 'Claude Opus (OpenRouter)' },
              { id: 'gpt-4o', displayName: 'GPT-4o (OpenRouter)' },
            ],
          },
        ];

        const options: FormatModelNameOptions = {
          providerId: 'openrouter',
          claudeCompatibleProviders: providers,
        };

        expect(formatModelName('claude-sonnet-1-9', options)).toBe('Claude Sonnet (OpenRouter)');
        expect(formatModelName('claude-opus-4-6', options)).toBe('Claude Opus (OpenRouter)');
        expect(formatModelName('gpt-4o', options)).toBe('GPT-4o (OpenRouter)');
      });
    });

    describe('Claude model formatting (default)', () => {
      it('should name the tier for an undated Haiku identifier, which pins nothing', () => {
        // `claude-haiku-4-5` is itself a tier alias: the provider's own
        // ANTHROPIC_DEFAULT_HAIKU_MODEL can point it at any version, so the
        // version in the string is not knowable and must not be shown.
        expect(formatModelName('claude-haiku-4-5')).toBe('Claude Haiku');
      });

      it('should name the tier for a version Automaker pinned on the user\u2019s behalf', () => {
        // These collapse to their tier when read, so the version in the string
        // is not the version that runs. Naming it would report a model that
        // never executes.
        expect(formatModelName('claude-opus-4-6')).toBe('Claude Opus');
        expect(formatModelName('claude-sonnet-4-6')).toBe('Claude Sonnet');
        expect(formatModelName('claude-haiku-4-5-20251001')).toBe('Claude Haiku');
      });

      it('should name the tier for a canonical ID, which carries no version', () => {
        expect(formatModelName('claude-opus')).toBe('Claude Opus');
        expect(formatModelName('claude-sonnet')).toBe('Claude Sonnet');
        expect(formatModelName('claude-haiku')).toBe('Claude Haiku');
      });

      it('should name the tier for an opus string it does not recognise', () => {
        expect(formatModelName('claude-opus-1-9')).toBe('Claude Opus');
        expect(formatModelName('claude-opus-9-9')).toBe('Claude Opus');
        expect(formatModelName('claude-1-opus')).toBe('Claude Opus');
      });

      it('should name the tier for a sonnet string it does not recognise', () => {
        expect(formatModelName('claude-sonnet-1-9')).toBe('Claude Sonnet');
        expect(formatModelName('claude-sonnet-1-19991231')).toBe('Claude Sonnet');
        expect(formatModelName('claude-1-sonnet')).toBe('Claude Sonnet');
      });

      it('should name the tier for a dated haiku identifier rather than print its raw ID', () => {
        expect(formatModelName('claude-haiku-4-5-20251001')).toBe('Claude Haiku');
        expect(formatModelName('claude-1-haiku')).toBe('Claude Haiku');
      });

      it('should never put a version number in a Claude label', () => {
        for (const model of CLAUDE_MODEL_STRINGS) {
          expect(formatModelName(model)).not.toMatch(/\d/);
        }
      });

      it('should never render a Claude model as its raw identifier', () => {
        for (const model of CLAUDE_MODEL_STRINGS) {
          const label = formatModelName(model);
          expect(label).not.toBe(model);
          expect(CLAUDE_TIER_NAMES).toContain(label);
        }
      });
    });

    /**
     * Criterion: no display helper can return a different name than another for
     * the same input (ngut-1995/harbor#38).
     *
     * There is now one function. `getModelDisplayName` in `@automaker/types`
     * holds the single table, the UI's `getModelDisplayName` is a re-export of
     * it, and `formatModelName` is a wrapper that adds one precedence rule and
     * otherwise delegates. These tests are what fails if anyone reintroduces a
     * table of their own: the first by identity, the rest by disagreement across
     * every model ID that can be enumerated.
     */
    describe('agreement with the other display helpers', () => {
      /** Every model ID Automaker can enumerate, plus loose shapes and Claude. */
      const EVERY_KNOWN_MODEL_ID: string[] = [
        ...CLAUDE_MODEL_STRINGS,
        ...CODEX_MODEL_IDS,
        ...Object.keys(CURSOR_MODEL_MAP),
        ...Object.keys(COPILOT_MODEL_MAP),
        ...Object.keys(GEMINI_MODEL_MAP),
        ...OPENCODE_MODELS.map((m) => m.id),
        // Shapes no catalogue enumerates.
        'auto',
        'composer-1',
        'cursor-sonnet',
        'gpt-4o',
        'o1',
        'google/gemini-2.5-pro',
        'arcee-ai/trinity-large-preview:free',
        'unknown-model-name',
      ];

      it('is the very same function as the @automaker/types helper', () => {
        // Not "produces equal output" -- the same function object. A second
        // implementation in apps/ui cannot satisfy this.
        expect(getUiModelDisplayName).toBe(getTypesModelDisplayName);
      });

      it('agrees with the shared helper on every model ID Automaker knows', () => {
        for (const model of EVERY_KNOWN_MODEL_ID) {
          expect(formatModelName(model), model).toBe(getTypesModelDisplayName(model));
          expect(getUiModelDisplayName(model), model).toBe(getTypesModelDisplayName(model));
        }
      });

      it('never renders a known model as its raw identifier', () => {
        // A catalogue model that no table can name would show up as an ID on a
        // card. This is what catches a provider adding a model to its catalogue
        // and the display table not following.
        const catalogued = EVERY_KNOWN_MODEL_ID.filter((id) => id !== 'unknown-model-name');
        for (const model of catalogued) {
          expect(formatModelName(model), model).not.toBe(model);
        }
      });

      it("still lets a Claude-compatible provider's own displayName win over the tier name", () => {
        // The agreement above is about the generic answer. A provider that serves
        // its own model behind a Claude-shaped ID keeps naming it -- that
        // precedence is formatModelName's entire reason to exist, and a
        // unification must not buy agreement by breaking it.
        const options: FormatModelNameOptions = {
          providerId: 'moonshot-ai',
          claudeCompatibleProviders: [
            {
              id: 'moonshot-ai',
              name: 'Moonshot AI',
              models: [{ id: 'claude-haiku-4-5', displayName: 'Moonshot v1.8' }],
            },
          ],
        };
        expect(formatModelName('claude-haiku-4-5', options)).toBe('Moonshot v1.8');
        expect(getUiModelDisplayName('claude-haiku-4-5')).toBe('Claude Haiku');
      });
    });

    describe('Codex/GPT model formatting', () => {
      it("names every Codex model as OpenAI's own catalogue does", () => {
        // Hyphenated, matching both the upstream model IDs and the label the
        // model picker offers them under.
        expect(formatModelName('codex-gpt-5.3-codex')).toBe('GPT-5.3-Codex');
        expect(formatModelName('codex-gpt-5.3-codex-spark')).toBe('GPT-5.3-Codex-Spark');
        expect(formatModelName('codex-gpt-5.2-codex')).toBe('GPT-5.2-Codex');
        expect(formatModelName('codex-gpt-5-codex')).toBe('GPT-5-Codex');
        expect(formatModelName('codex-gpt-5-codex-mini')).toBe('GPT-5-Codex-Mini');
        expect(formatModelName('codex-gpt-5')).toBe('GPT-5');
      });

      it('should format codex-gpt-5.2 as GPT-5.2', () => {
        expect(formatModelName('codex-gpt-5.2')).toBe('GPT-5.2');
      });

      it('keeps Codex in the name of a Codex-specific model', () => {
        // These used to read "GPT-5.1 Max" here and "GPT-5.1 Codex Max" in the
        // running-agents panel. Dropping "Codex" also collided with the
        // general-purpose gpt-5.1 model, which is a different model.
        expect(formatModelName('codex-gpt-5.1-codex-max')).toBe('GPT-5.1-Codex-Max');
        expect(formatModelName('codex-gpt-5.1-codex-mini')).toBe('GPT-5.1-Codex-Mini');
        expect(formatModelName('codex-gpt-5.1-codex')).toBe('GPT-5.1-Codex');
        expect(formatModelName('codex-gpt-5.1')).not.toContain('Codex');
      });

      it('should format codex-gpt-5.1 as GPT-5.1', () => {
        expect(formatModelName('codex-gpt-5.1')).toBe('GPT-5.1');
      });

      it('should format gpt- prefixed models in uppercase', () => {
        expect(formatModelName('gpt-4o')).toBe('GPT-4O');
        expect(formatModelName('gpt-4-turbo')).toBe('GPT-4-TURBO');
      });

      it('should format o-prefixed models (o1, o3, etc.) in uppercase', () => {
        expect(formatModelName('o1')).toBe('O1');
        expect(formatModelName('o1-mini')).toBe('O1-MINI');
        expect(formatModelName('o3')).toBe('O3');
      });
    });

    describe('Cursor model formatting', () => {
      it('should format cursor-auto as Cursor Auto', () => {
        expect(formatModelName('cursor-auto')).toBe('Cursor Auto');
      });

      it('should format auto as Cursor Auto', () => {
        expect(formatModelName('auto')).toBe('Cursor Auto');
      });

      it('should format cursor-composer-1 as Composer 1', () => {
        expect(formatModelName('cursor-composer-1')).toBe('Composer 1');
      });

      it('should format composer-1 as Composer 1', () => {
        expect(formatModelName('composer-1')).toBe('Composer 1');
      });

      it("names a catalogued Cursor model as Cursor's own catalogue does", () => {
        // Cursor pins a real version, and the user picked the model under this
        // exact label, so the version is nameable -- unlike a Claude tier alias.
        expect(formatModelName('cursor-sonnet-4.6')).toBe('Claude Sonnet 4.6');
        expect(formatModelName('cursor-sonnet-4.6-thinking')).toBe('Claude Sonnet 4.6 (Thinking)');
        expect(formatModelName('cursor-opus-4.5')).toBe('Claude Opus 4.5');
        expect(formatModelName('cursor-grok')).toBe('Grok');
        expect(formatModelName('cursor-gemini-3-pro')).toBe('Gemini 3 Pro');
      });

      it('falls back to provider and tier for a Cursor model not in the catalogue', () => {
        // A model Cursor adds after this build. The Claude rules do not shadow
        // these: they only match Claude models.
        expect(formatModelName('cursor-sonnet')).toBe('Cursor Sonnet');
        expect(formatModelName('cursor-opus')).toBe('Cursor Opus');
      });

      it('should format cursor-gpt models', () => {
        // cursor-gpt-4 becomes gpt-4 then GPT-4 (case preserved)
        expect(formatModelName('cursor-gpt-4')).toBe('GPT-4');
        // cursor-gpt-4o becomes gpt-4o then GPT-4o (not uppercase o)
        expect(formatModelName('cursor-gpt-4o')).toBe('GPT-4o');
      });

      it('should format cursor-gemini models', () => {
        // cursor-gemini-pro -> Cursor gemini-pro -> Cursor Gemini-pro
        expect(formatModelName('cursor-gemini-pro')).toBe('Cursor Gemini-pro');
        // cursor-gemini-2 -> Cursor gemini-2 -> Cursor Gemini-2
        expect(formatModelName('cursor-gemini-2')).toBe('Cursor Gemini-2');
      });

      it('falls back for an uncatalogued grok model', () => {
        expect(formatModelName('cursor-grok-5')).toBe('Cursor Grok');
      });
    });

    describe('Unknown model formatting (fallback)', () => {
      it('echoes an identifier it does not recognise', () => {
        // This used to split on dashes and keep the middle, which named
        // "unknown-model-name" as "model name" -- a name no model has. The other
        // two helpers echoed the identifier, and that is the answer kept.
        expect(formatModelName('unknown-model-name')).toBe('unknown-model-name');
        expect(formatModelName('some-random-model')).toBe('some-random-model');
      });

      it('never renders a model as the empty string', () => {
        // The dash-splitting fallback returned '' for a single-token identifier,
        // leaving the badge blank.
        expect(formatModelName('single')).toBe('single');
        expect(formatModelName('two-parts')).toBe('two-parts');
      });
    });
  });
});
