/**
 * The server accepts exactly the models the provider catalogues declare.
 *
 * A provider's model list and the board's picker used to be two hand-written
 * copies of one set, and for Codex they drifted (ngut-1995/harbor#78). Cursor,
 * OpenCode, Gemini and Copilot now derive their lists from the same catalogues
 * the picker derives from (ngut-1995/harbor#83).
 *
 * This is the server half of that invariant, asserted where the server's lists
 * are actually produced -- a `getAvailableModels` that derives can be replaced
 * by a hand-written list again, and this is what notices when it is.
 *
 * `codex-models-catalogue.test.ts` covers the Codex half.
 */

import { describe, it, expect } from 'vitest';
import {
  CURSOR_CATALOGUE_ROWS,
  OPENCODE_CATALOGUE_ROWS,
  GEMINI_CATALOGUE_ROWS,
  COPILOT_CATALOGUE_ROWS,
} from '@automaker/types';
import { CursorProvider } from '../../../src/providers/cursor-provider.js';
import { GeminiProvider } from '../../../src/providers/gemini-provider.js';
import { CopilotProvider } from '../../../src/providers/copilot-provider.js';
import { OpencodeProvider } from '../../../src/providers/opencode-provider.js';

const PROVIDERS = [
  {
    name: 'cursor',
    models: () => new CursorProvider().getAvailableModels(),
    rows: CURSOR_CATALOGUE_ROWS,
  },
  {
    name: 'gemini',
    models: () => new GeminiProvider().getAvailableModels(),
    rows: GEMINI_CATALOGUE_ROWS,
  },
  {
    name: 'copilot',
    models: () => new CopilotProvider().getAvailableModels(),
    rows: COPILOT_CATALOGUE_ROWS,
  },
  {
    name: 'opencode',
    models: () => new OpencodeProvider().getAvailableModels(),
    rows: OPENCODE_CATALOGUE_ROWS,
  },
];

describe('the server model lists', () => {
  for (const provider of PROVIDERS) {
    describe(provider.name, () => {
      it('lists exactly the models the catalogue declares, in catalogue order', () => {
        expect(provider.models().map((model) => model.id)).toEqual(
          provider.rows.map((row) => row.id)
        );
      });

      it('names every model exactly as the catalogue does', () => {
        const byId = new Map(provider.models().map((model) => [model.id, model]));
        for (const row of provider.rows) {
          expect(byId.get(row.id)?.name, row.id).toBe(row.label);
          expect(byId.get(row.id)?.description, row.id).toBe(row.description);
        }
      });
    });
  }

  /**
   * A feature card created before this change still names a model by its
   * canonical ID. No stored value was migrated, so every one of them must still
   * resolve.
   */
  it('still resolves models an older feature card may already name', () => {
    const cursor = new CursorProvider().getAvailableModels();
    expect(cursor.find((model) => model.id === 'cursor-auto')?.name).toBe('Auto (Recommended)');
    const gemini = new GeminiProvider().getAvailableModels();
    expect(gemini.find((model) => model.id === 'gemini-2.5-flash')?.name).toBe('Gemini 2.5 Flash');
  });
});

/**
 * OpenCode discovers most of its models by asking the CLI; the catalogue is only
 * what Automaker declares without asking. What matters downstream is that a
 * discovered model and a declared one arrive in the same shape, so that nothing
 * further along -- least of all the picker -- needs to know which is which
 * (ngut-1995/harbor#83).
 */
describe('the OpenCode declared models', () => {
  it('are the fallback until the CLI has answered', () => {
    const models = new OpencodeProvider().getAvailableModels();
    expect(models.map((model) => model.id)).toEqual(OPENCODE_CATALOGUE_ROWS.map((row) => row.id));
  });

  it('carry no field marking them as declared rather than discovered', () => {
    for (const model of new OpencodeProvider().getAvailableModels()) {
      expect(Object.keys(model).sort()).toEqual([
        'default',
        'description',
        'id',
        'modelString',
        'name',
        'provider',
        'supportsTools',
        'supportsVision',
        'tier',
      ]);
    }
  });
});
