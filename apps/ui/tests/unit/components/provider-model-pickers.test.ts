/**
 * The picker offers exactly the models the provider catalogues declare.
 *
 * The Codex picker list used to be a hand-written copy, and it went stale: it
 * stopped at GPT-5.2 while the server, the display names and the shared types
 * all knew about GPT-5.3. Nothing failed, because nothing compared the two
 * lists (ngut-1995/harbor#78).
 *
 * Cursor, OpenCode, Gemini and Copilot were already `.map()`s over a shared
 * table, but over four *different* shapes, each computing its own badge. They
 * now derive from catalogues shaped like Codex's (ngut-1995/harbor#83), and
 * this is the assertion that keeps them there: a list written out here again
 * fails, and so does a catalogue row the picker cannot show.
 *
 * `codex-model-picker.test.ts` covers the Codex half.
 */

import { describe, it, expect } from 'vitest';
import {
  CURSOR_CATALOGUE_ROWS,
  OPENCODE_CATALOGUE_ROWS,
  GEMINI_CATALOGUE_ROWS,
  COPILOT_CATALOGUE_ROWS,
  type ModelOption,
} from '@automaker/types';
import {
  CURSOR_MODELS,
  OPENCODE_MODELS,
  GEMINI_MODELS,
  COPILOT_MODELS,
} from '@/components/views/board-view/shared/model-constants';
import { mergeDiscoveredOpencodeModels } from '@/components/views/board-view/shared/opencode-model-merge';

const PICKERS = [
  { provider: 'cursor', offered: CURSOR_MODELS, rows: CURSOR_CATALOGUE_ROWS },
  { provider: 'opencode', offered: OPENCODE_MODELS, rows: OPENCODE_CATALOGUE_ROWS },
  { provider: 'gemini', offered: GEMINI_MODELS, rows: GEMINI_CATALOGUE_ROWS },
  { provider: 'copilot', offered: COPILOT_MODELS, rows: COPILOT_CATALOGUE_ROWS },
];

describe('the provider model pickers', () => {
  for (const picker of PICKERS) {
    describe(picker.provider, () => {
      it('offers exactly the models the catalogue declares, in catalogue order', () => {
        expect(picker.offered.map((option) => option.id)).toEqual(picker.rows.map((row) => row.id));
      });

      it('reads every row straight off the catalogue row it derives from', () => {
        const byId = new Map(picker.rows.map((row) => [row.id, row]));
        for (const option of picker.offered) {
          const row = byId.get(option.id);
          expect(row, `${option.id} should be a catalogue row`).toBeDefined();
          expect(option.label).toBe(row!.label);
          expect(option.description).toBe(row!.description);
          expect(option.provider).toBe(picker.provider);
        }
      });

      /**
       * These four providers take Automaker's thinking level, never a reasoning
       * effort: a row claiming `hasReasoning` would offer the wrong control for
       * the model underneath it (see CONTEXT.md, "Reasoning depth").
       */
      it('describes reasoning depth as thinking, not as effort', () => {
        for (const option of picker.offered) {
          expect(option.hasReasoning, option.id).toBeUndefined();
        }
      });
    });
  }
});

/**
 * OpenCode is the one provider whose models are not all known at build time.
 * The catalogue declares its free tier; the CLI reports the rest. The picker
 * must show both, and must not be able to tell them apart.
 */
describe('the OpenCode picker with discovered models', () => {
  const discovered: ModelOption[] = [
    {
      id: 'anthropic/claude-sonnet-4-5',
      label: 'Claude Sonnet 4.5',
      description: 'Discovered by the OpenCode CLI',
      provider: 'opencode',
    },
  ];

  it('offers a discovered model alongside the declared ones', () => {
    const offered = mergeDiscoveredOpencodeModels(OPENCODE_MODELS, discovered);
    expect(offered.map((option) => option.id)).toEqual([
      ...OPENCODE_CATALOGUE_ROWS.map((row) => row.id),
      'anthropic/claude-sonnet-4-5',
    ]);
  });

  it('gives a discovered row no field a declared row does not have', () => {
    const modelOptionFields = [
      'id',
      'label',
      'description',
      'badge',
      'provider',
      'hasThinking',
      'hasReasoning',
    ];
    for (const option of mergeDiscoveredOpencodeModels(OPENCODE_MODELS, discovered)) {
      for (const field of Object.keys(option)) {
        expect(modelOptionFields, `${option.id} carries an unexpected field`).toContain(field);
      }
      expect(option.provider).toBe('opencode');
    }
  });

  /**
   * The CLI reports Automaker's own declared models too, spelled with a slash
   * (`opencode/big-pickle`) rather than the canonical dash. Offering both would
   * show the user the same model twice; the declared row wins, because its ID is
   * the one a feature card stores.
   */
  it('shows a model once when the CLI reports one it already declares', () => {
    const alsoDeclared: ModelOption[] = [
      {
        id: 'opencode/big-pickle',
        label: 'Big Pickle (Free)',
        description: 'Reported by the OpenCode CLI',
        provider: 'opencode',
      },
    ];
    const offered = mergeDiscoveredOpencodeModels(OPENCODE_MODELS, alsoDeclared);
    expect(offered.map((option) => option.id)).toEqual(
      OPENCODE_CATALOGUE_ROWS.map((row) => row.id)
    );
  });
});
