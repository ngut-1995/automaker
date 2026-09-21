/**
 * Tests for the Codex catalogue and the surfaces derived from it.
 *
 * Codex used to be declared four times over -- once for the server's model
 * list, once for the picker, once for the display names, once more in the
 * shared types -- and the copies fell out of step. The picker stopped at
 * GPT-5.2 while everything else already accepted GPT-5.3 and its Spark variant,
 * and no test noticed, because no test compared them (ngut-1995/harbor#78).
 *
 * These tests pin the consequence of collapsing those copies into one table:
 * each derived surface lists exactly the models the catalogue declares, and a
 * row carries every fact the four declarations carried between them.
 */

import { describe, it, expect } from 'vitest';
import {
  CODEX_MODEL_CATALOGUE,
  CODEX_CATALOGUE_ROWS,
  CODEX_MODEL_DEFINITIONS,
  codexModelHasReasoning,
  getCodexModelLabel,
  codexModelSupportsVision,
} from '../../src/codex-models.js';
import { CODEX_MODELS, MODEL_DISPLAY_NAMES, getModelDisplayName } from '../../src/model-display.js';
import { CODEX_MODEL_IDS, REASONING_CAPABLE_MODELS } from '../../src/model.js';

const catalogueIds = CODEX_CATALOGUE_ROWS.map((row) => row.id);

describe('the Codex catalogue', () => {
  it('carries every Codex model Automaker addresses, in one table', () => {
    expect([...catalogueIds].sort()).toEqual([...CODEX_MODEL_IDS].sort());
  });

  /**
   * The two models the drift hid. Naming them outright is what stops the
   * regression coming back as "the catalogue is self-consistent but empty".
   */
  it('carries the two GPT-5.3 models the picker used to be missing', () => {
    expect(catalogueIds).toContain('codex-gpt-5.3-codex');
    expect(catalogueIds).toContain('codex-gpt-5.3-codex-spark');
  });

  it('gives every row a prefixed canonical ID, a label and a description', () => {
    for (const row of CODEX_CATALOGUE_ROWS) {
      expect(row.id, row.id).toMatch(/^codex-/);
      expect(row.label.length, row.id).toBeGreaterThan(0);
      expect(row.description.length, row.id).toBeGreaterThan(0);
      expect(row.provider, row.id).toBe('codex');
    }
  });

  it('keys every row by its own canonical ID', () => {
    for (const [id, row] of Object.entries(CODEX_MODEL_CATALOGUE)) {
      expect(row.id, id).toBe(id);
    }
  });

  it('names exactly one default model', () => {
    expect(CODEX_CATALOGUE_ROWS.filter((row) => row.isDefault).map((row) => row.id)).toEqual([
      'codex-gpt-5.3-codex',
    ]);
  });

  /**
   * `REASONING_CAPABLE_MODELS` in `./model.js` answers the same question the
   * rows do, for the callers that ask it of a bare string. The two are still
   * written separately; this is what keeps them from disagreeing.
   */
  it('agrees with the reasoning-capable set about which models take an effort level', () => {
    const fromCatalogue = CODEX_CATALOGUE_ROWS.filter((row) => row.hasReasoning).map(
      (row) => row.id
    );
    expect([...fromCatalogue].sort()).toEqual([...REASONING_CAPABLE_MODELS].sort());
  });
});

describe('the surfaces derived from the Codex catalogue', () => {
  it('offers exactly the catalogue in the picker rows', () => {
    expect(CODEX_MODELS.map((option) => option.id)).toEqual(catalogueIds);
  });

  it('offers exactly the catalogue in the server model list', () => {
    expect(CODEX_MODEL_DEFINITIONS.map((definition) => definition.id)).toEqual(catalogueIds);
  });

  it('names exactly the catalogue in the display-name lookup', () => {
    const named = Object.keys(MODEL_DISPLAY_NAMES).filter((id) => id.startsWith('codex-'));
    expect([...named].sort()).toEqual([...catalogueIds].sort());
  });

  /**
   * The point of one table: the name in the picker a user chooses from is the
   * name on the card that results, with no second place to disagree.
   */
  it('gives a model the same name on every surface', () => {
    for (const row of CODEX_CATALOGUE_ROWS) {
      expect(getModelDisplayName(row.id), row.id).toBe(row.label);
      expect(getCodexModelLabel(row.id), row.id).toBe(row.label);
      expect(CODEX_MODELS.find((option) => option.id === row.id)?.label, row.id).toBe(row.label);
      expect(
        CODEX_MODEL_DEFINITIONS.find((definition) => definition.id === row.id)?.name,
        row.id
      ).toBe(row.label);
    }
  });

  /**
   * The server list keeps the capability facts the picker has no use for --
   * context window, output budget, tool support, the wire provider -- so
   * collapsing the declarations lost nothing.
   */
  it('keeps every capability the server list used to declare', () => {
    for (const definition of CODEX_MODEL_DEFINITIONS) {
      const row = CODEX_MODEL_CATALOGUE[definition.id as keyof typeof CODEX_MODEL_CATALOGUE];
      expect(definition.provider, definition.id).toBe('openai');
      expect(definition.modelString, definition.id).toBe(row.id);
      expect(definition.contextWindow, definition.id).toBe(row.contextWindow);
      expect(definition.maxOutputTokens, definition.id).toBe(row.maxOutputTokens);
      expect(definition.supportsVision, definition.id).toBe(row.supportsVision);
      expect(definition.supportsTools, definition.id).toBe(row.supportsTools);
      expect(definition.tier, definition.id).toBe(row.tier);
      expect(definition.hasReasoning, definition.id).toBe(row.hasReasoning);
    }
  });
});

describe('the Codex capability accessors', () => {
  it('answer from the catalogue row', () => {
    for (const row of CODEX_CATALOGUE_ROWS) {
      expect(codexModelHasReasoning(row.id), row.id).toBe(row.hasReasoning);
      expect(codexModelSupportsVision(row.id), row.id).toBe(row.supportsVision);
    }
  });

  /**
   * A model shipped after this build has no row. Refusing it an effort level is
   * the safe answer; refusing it an image attachment is not, because every
   * Codex model Automaker has ever listed takes images.
   */
  it('degrade honestly for an ID the catalogue has never heard of', () => {
    const unknown = 'codex-gpt-9' as never;
    expect(codexModelHasReasoning(unknown)).toBe(false);
    expect(codexModelSupportsVision(unknown)).toBe(true);
    expect(getCodexModelLabel(unknown)).toBe('codex-gpt-9');
  });
});
