/**
 * The server accepts exactly the Codex models the catalogue declares.
 *
 * The server's list and the board's picker used to be two hand-written copies
 * of the same set, and they drifted: the server accepted GPT-5.3 while the
 * picker stopped at 5.2 (ngut-1995/harbor#78). Both now derive from the one
 * Codex catalogue in `@automaker/types`.
 *
 * This is the server half of that invariant, asserted where the server's list
 * is actually exported -- a re-export can be replaced by a hand-written list
 * again, and this is what notices when it is.
 */

import { describe, it, expect } from 'vitest';
import { CODEX_CATALOGUE_ROWS } from '@automaker/types';
import {
  CODEX_MODELS,
  getCodexModelById,
  getReasoningModels,
} from '../../../src/providers/codex-models.js';

const catalogueIds = CODEX_CATALOGUE_ROWS.map((row) => row.id);

describe('the server Codex model list', () => {
  it('lists exactly the models the catalogue declares', () => {
    expect(CODEX_MODELS.map((model) => model.id)).toEqual(catalogueIds);
  });

  it('accepts the two GPT-5.3 models the picker used to be missing', () => {
    expect(getCodexModelById('codex-gpt-5.3-codex')?.name).toBe('GPT-5.3-Codex');
    expect(getCodexModelById('codex-gpt-5.3-codex-spark')?.name).toBe('GPT-5.3-Codex-Spark');
  });

  /**
   * A feature card created before this change still names an older Codex model.
   * No stored value was migrated, so the server must still resolve it.
   */
  it('still resolves a model an older feature card may already name', () => {
    expect(getCodexModelById('codex-gpt-5.2-codex')?.name).toBe('GPT-5.2-Codex');
    expect(getCodexModelById('codex-gpt-5')?.name).toBe('GPT-5');
  });

  it('reports reasoning support from the catalogue row', () => {
    expect(getReasoningModels().map((model) => model.id)).toEqual(
      CODEX_CATALOGUE_ROWS.filter((row) => row.hasReasoning).map((row) => row.id)
    );
  });
});
