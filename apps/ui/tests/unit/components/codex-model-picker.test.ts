/**
 * The Codex picker offers exactly the models the catalogue declares.
 *
 * The picker list used to be a hand-written copy of the Codex catalogue, and it
 * went stale: it stopped at GPT-5.2 while the server, the display names and the
 * shared types all knew about GPT-5.3 and its Spark variant. From the user's
 * side that reads as "Automaker doesn't have the latest Codex model", when in
 * fact it does and only the list they click was out of date
 * (ngut-1995/harbor#78).
 *
 * Nothing failed when that happened, because no test compared the two lists.
 * This one does. It is the assertion that fails on the commit before this test
 * was written, and the reason a model added to the catalogue cannot go missing
 * from the picker again.
 */

import { describe, it, expect } from 'vitest';
import { CODEX_MODEL_CATALOGUE, CODEX_CATALOGUE_ROWS } from '@automaker/types';
import { CODEX_MODELS } from '@/components/views/board-view/shared/model-constants';

const catalogueIds = CODEX_CATALOGUE_ROWS.map((row) => row.id);

describe('the Codex model picker', () => {
  it('offers exactly the models the catalogue declares', () => {
    expect(CODEX_MODELS.map((option) => option.id)).toEqual(catalogueIds);
  });

  it('offers the two GPT-5.3 models whose absence was the bug', () => {
    const offered = CODEX_MODELS.map((option) => option.id);
    expect(offered).toContain('codex-gpt-5.3-codex');
    expect(offered).toContain('codex-gpt-5.3-codex-spark');
  });

  it('reads every row straight off the catalogue row it derives from', () => {
    for (const option of CODEX_MODELS) {
      const row = CODEX_MODEL_CATALOGUE[option.id as keyof typeof CODEX_MODEL_CATALOGUE];
      expect(row, `${option.id} should be a catalogue row`).toBeDefined();
      expect(option.label).toBe(row.label);
      expect(option.description).toBe(row.description);
      expect(option.badge).toBe(row.badge);
      expect(option.provider).toBe('codex');
    }
  });

  /**
   * Codex models take an effort level, never Automaker's thinking level (see
   * CONTEXT.md, "Reasoning depth"). A picker row that claimed `hasThinking`
   * would offer the wrong control for the model underneath it.
   */
  it('describes reasoning depth as effort, not as thinking', () => {
    for (const option of CODEX_MODELS) {
      const row = CODEX_MODEL_CATALOGUE[option.id as keyof typeof CODEX_MODEL_CATALOGUE];
      expect(option.hasReasoning).toBe(row.hasReasoning);
      expect(option.hasThinking).toBeUndefined();
    }
  });
});
