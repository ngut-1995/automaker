/**
 * Tests for the provider catalogues and the surfaces derived from them.
 *
 * Codex was the first provider collapsed into a single table
 * (ngut-1995/harbor#82); Cursor, OpenCode, Gemini and Copilot followed
 * (ngut-1995/harbor#83). These tests are about the property that only holds now
 * that all five look the same: every model row Automaker declares lives in a
 * catalogue module, carries an ID that says which provider serves it, and is
 * the only place that model is described.
 *
 * `codex-catalogue.test.ts` still covers what is particular to Codex. This file
 * covers what is true of every provider, including Claude -- whose catalogue is
 * the three ADR-0001 tiers and must stay that way.
 */

import { describe, it, expect } from 'vitest';
import {
  CODEX_CATALOGUE_ROWS,
  CODEX_MODEL_CATALOGUE,
  CODEX_MODEL_DEFINITIONS,
} from '../../src/codex-models.js';
import {
  CURSOR_CATALOGUE_ROWS,
  CURSOR_MODEL_CATALOGUE,
  CURSOR_MODEL_DEFINITIONS,
} from '../../src/cursor-models.js';
import {
  OPENCODE_CATALOGUE_ROWS,
  OPENCODE_MODEL_CATALOGUE,
  OPENCODE_MODEL_DEFINITIONS,
} from '../../src/opencode-models.js';
import {
  GEMINI_CATALOGUE_ROWS,
  GEMINI_MODEL_CATALOGUE,
  GEMINI_MODEL_DEFINITIONS,
} from '../../src/gemini-models.js';
import {
  COPILOT_CATALOGUE_ROWS,
  COPILOT_MODEL_CATALOGUE,
  COPILOT_MODEL_DEFINITIONS,
} from '../../src/copilot-models.js';
import {
  CLAUDE_MODELS,
  CODEX_MODELS,
  CURSOR_MODELS,
  OPENCODE_MODELS,
  GEMINI_MODELS,
  COPILOT_MODELS,
  MODEL_DISPLAY_NAMES,
  getModelDisplayName,
} from '../../src/model-display.js';
import { CLAUDE_TIERS } from '../../src/claude-tiers.js';
import type { ModelDefinition } from '../../src/provider.js';
import type { ModelOption } from '../../src/model-display.js';

/** One row of any provider's catalogue, in the fields every catalogue carries. */
interface CatalogueRow {
  id: string;
  label: string;
  description: string;
  provider: string;
  isDefault: boolean;
}

/**
 * Every catalogue, with the prefix its IDs must carry and the surfaces that
 * derive from it.
 *
 * Adding a provider means adding a row here, which is the point: a provider
 * with no catalogue has nowhere to be listed.
 */
const CATALOGUES: {
  provider: string;
  prefix: string;
  rows: CatalogueRow[];
  keyed: Record<string, CatalogueRow>;
  pickerRows: ModelOption[];
  serverModels: ModelDefinition[];
}[] = [
  {
    provider: 'codex',
    prefix: 'codex-',
    rows: CODEX_CATALOGUE_ROWS,
    keyed: CODEX_MODEL_CATALOGUE,
    pickerRows: CODEX_MODELS,
    serverModels: CODEX_MODEL_DEFINITIONS,
  },
  {
    provider: 'cursor',
    prefix: 'cursor-',
    rows: CURSOR_CATALOGUE_ROWS,
    keyed: CURSOR_MODEL_CATALOGUE,
    pickerRows: CURSOR_MODELS,
    serverModels: CURSOR_MODEL_DEFINITIONS,
  },
  {
    provider: 'opencode',
    prefix: 'opencode-',
    rows: OPENCODE_CATALOGUE_ROWS,
    keyed: OPENCODE_MODEL_CATALOGUE,
    pickerRows: OPENCODE_MODELS,
    serverModels: OPENCODE_MODEL_DEFINITIONS,
  },
  {
    provider: 'gemini',
    prefix: 'gemini-',
    rows: GEMINI_CATALOGUE_ROWS,
    keyed: GEMINI_MODEL_CATALOGUE,
    pickerRows: GEMINI_MODELS,
    serverModels: GEMINI_MODEL_DEFINITIONS,
  },
  {
    provider: 'copilot',
    prefix: 'copilot-',
    rows: COPILOT_CATALOGUE_ROWS,
    keyed: COPILOT_MODEL_CATALOGUE,
    pickerRows: COPILOT_MODELS,
    serverModels: COPILOT_MODEL_DEFINITIONS,
  },
];

describe('every provider catalogue', () => {
  for (const catalogue of CATALOGUES) {
    describe(catalogue.provider, () => {
      it('prefixes every canonical ID with its own provider', () => {
        for (const row of catalogue.rows) {
          expect(row.id, row.id).toMatch(new RegExp(`^${catalogue.prefix}`));
          expect(row.provider, row.id).toBe(catalogue.provider);
        }
      });

      it('gives every row a label and a description', () => {
        for (const row of catalogue.rows) {
          expect(row.label.length, row.id).toBeGreaterThan(0);
          expect(row.description.length, row.id).toBeGreaterThan(0);
        }
      });

      it('keys every row by its own canonical ID', () => {
        for (const [id, row] of Object.entries(catalogue.keyed)) {
          expect(row.id, id).toBe(id);
        }
      });

      it('declares exactly one default model', () => {
        expect(catalogue.rows.filter((row) => row.isDefault)).toHaveLength(1);
      });

      it('offers exactly the catalogue in the picker rows, in catalogue order', () => {
        expect(catalogue.pickerRows.map((option) => option.id)).toEqual(
          catalogue.rows.map((row) => row.id)
        );
      });

      it('offers exactly the catalogue in the server model list, in catalogue order', () => {
        expect(catalogue.serverModels.map((model) => model.id)).toEqual(
          catalogue.rows.map((row) => row.id)
        );
      });

      it('names exactly the catalogue in the display-name lookup', () => {
        const named = Object.keys(MODEL_DISPLAY_NAMES).filter((id) =>
          id.startsWith(catalogue.prefix)
        );
        expect([...named].sort()).toEqual([...catalogue.rows.map((row) => row.id)].sort());
      });

      /**
       * The point of one table: the name in the picker a user chooses from is
       * the name on the card that results, with no second place to disagree.
       *
       * `cursor-auto` is the documented exception -- its catalogue label is a
       * recommendation ("Auto (Recommended)") rather than a name, and
       * `DISPLAY_NAME_OVERRIDES` records why. `model-display.test.ts` is what
       * forces that reason to exist.
       */
      it('gives a model the same name in the picker and on the card', () => {
        for (const row of catalogue.rows) {
          if (row.id === 'cursor-auto') continue;
          expect(getModelDisplayName(row.id), row.id).toBe(row.label);
          expect(catalogue.pickerRows.find((option) => option.id === row.id)?.label, row.id).toBe(
            row.label
          );
          expect(catalogue.serverModels.find((model) => model.id === row.id)?.name, row.id).toBe(
            row.label
          );
        }
      });
    });
  }

  /**
   * A canonical ID names one model, whoever serves it. Two providers offering
   * the same underlying model (`cursor-gpt-5.2-codex` and `codex-gpt-5.2-codex`)
   * still get an ID each, and the prefix is what keeps them apart -- which is
   * also why a routing predicate can read the provider off the string.
   */
  it('shares no canonical ID between two providers', () => {
    const seen = new Map<string, string>();
    for (const catalogue of CATALOGUES) {
      for (const row of catalogue.rows) {
        const owner = seen.get(row.id);
        expect(owner, `${row.id} is declared by both ${owner} and ${catalogue.provider}`).toBe(
          undefined
        );
        seen.set(row.id, catalogue.provider);
      }
    }
    expect(seen.size).toBe(CATALOGUES.reduce((total, c) => total + c.rows.length, 0));
  });
});

/**
 * Claude is the one provider this work did not restructure.
 *
 * ADR-0001 fixed its catalogue at exactly the three tier entries, with no
 * versions, and generalising the catalogue pattern to five providers must not be
 * the thing that lets a fourth Claude entry back in.
 */
describe('the Claude catalogue', () => {
  it('is still exactly the three tiers, derived from the tier rows', () => {
    expect(CLAUDE_MODELS.map((option) => option.id)).toEqual([...CLAUDE_TIERS]);
    expect(CLAUDE_MODELS).toHaveLength(3);
  });

  it('names no version, and no provider catalogue claims a Claude string', () => {
    for (const option of CLAUDE_MODELS) {
      expect(option.id, option.id).not.toMatch(/\d/);
    }
    for (const catalogue of CATALOGUES) {
      for (const row of catalogue.rows) {
        expect(row.id.startsWith('claude-'), row.id).toBe(false);
      }
    }
  });
});
