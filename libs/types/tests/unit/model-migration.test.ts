import { describe, it, expect } from 'vitest';
import { migrateModelId, migratePhaseModelEntry } from '../../src/model-migration.js';
import {
  CLAUDE_CANONICAL_IDS,
  PINNED_BY_ACCIDENT_CLAUDE_MODEL_MAP,
  isPinnedByAccidentClaudeModelId,
} from '../../src/model.js';
import type { PhaseModelEntry } from '../../src/settings.js';

/** Build a PhaseModelEntry from an arbitrary model string. */
const entry = (model: string, rest: Partial<PhaseModelEntry> = {}): PhaseModelEntry =>
  ({ model, ...rest }) as PhaseModelEntry;

/**
 * Pinned Claude model IDs a user could plausibly have written by hand.
 * Deliberately NOT the IDs Automaker itself used to write.
 */
const DELIBERATE_PINS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20241113',
  'claude-3-5-haiku-20241022',
  'claude-haiku-4-5',
  'claude-sonnet-4-6-20260101',
];

describe('pinned-by-accident Claude model IDs', () => {
  describe('the enumerated list', () => {
    it("contains exactly the three IDs Automaker wrote on the user's behalf", () => {
      expect(Object.keys(PINNED_BY_ACCIDENT_CLAUDE_MODEL_MAP).sort()).toEqual([
        'claude-haiku-4-5-20251001',
        'claude-opus-4-6',
        'claude-sonnet-4-6',
      ]);
    });

    it('maps every entry to a canonical ID', () => {
      for (const canonical of Object.values(PINNED_BY_ACCIDENT_CLAUDE_MODEL_MAP)) {
        expect(CLAUDE_CANONICAL_IDS).toContain(canonical);
      }
    });

    it('recognises an entry only by exact equality, never by pattern', () => {
      // Same tier, neighbouring spellings: not on the list, so not recognised.
      expect(isPinnedByAccidentClaudeModelId('claude-opus-4-6')).toBe(true);
      expect(isPinnedByAccidentClaudeModelId('claude-opus-4-7')).toBe(false);
      expect(isPinnedByAccidentClaudeModelId('claude-opus-4-6-20260101')).toBe(false);
      expect(isPinnedByAccidentClaudeModelId('claude-haiku-4-5')).toBe(false);
      expect(isPinnedByAccidentClaudeModelId('claude-opus')).toBe(false);
    });
  });

  describe('migrateModelId', () => {
    it.each(Object.entries(PINNED_BY_ACCIDENT_CLAUDE_MODEL_MAP))(
      'collapses %s to %s',
      (pinned, canonical) => {
        expect(migrateModelId(pinned)).toBe(canonical);
      }
    );

    it.each(DELIBERATE_PINS)('leaves the deliberate pin %s intact', (pinned) => {
      expect(migrateModelId(pinned)).toBe(pinned);
    });

    it.each(CLAUDE_CANONICAL_IDS)('leaves the canonical ID %s unchanged', (canonical) => {
      expect(migrateModelId(canonical)).toBe(canonical);
    });

    it('does not touch non-Claude provider models', () => {
      expect(migrateModelId('cursor-auto')).toBe('cursor-auto');
      expect(migrateModelId('codex-gpt-5.3-codex')).toBe('codex-gpt-5.3-codex');
      expect(migrateModelId('GLM-4.7')).toBe('GLM-4.7');
    });
  });

  describe('migratePhaseModelEntry', () => {
    it.each(Object.entries(PINNED_BY_ACCIDENT_CLAUDE_MODEL_MAP))(
      'collapses a phase model stored as %s to %s',
      (pinned, canonical) => {
        expect(migratePhaseModelEntry(entry(pinned)).model).toBe(canonical);
        // Legacy string form of the same entry.
        expect(migratePhaseModelEntry(pinned).model).toBe(canonical);
      }
    );

    it('preserves the rest of the entry while collapsing the model', () => {
      const result = migratePhaseModelEntry(entry('claude-opus-4-6', { thinkingLevel: 'high' }));

      expect(result.model).toBe('claude-opus');
      expect(result.thinkingLevel).toBe('high');
    });

    it.each(DELIBERATE_PINS)('leaves a phase model deliberately pinned to %s intact', (pinned) => {
      expect(migratePhaseModelEntry(entry(pinned)).model).toBe(pinned);
    });
  });
});
