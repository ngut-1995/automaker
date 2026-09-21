import { describe, it, expect } from 'vitest';
import {
  migrateClaudeModelId,
  migrateModelId,
  migratePhaseModelEntry,
} from '../../src/model-migration.js';
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
 *
 * Deliberately NOT the IDs Automaker itself used to write — and deliberately
 * fictional versions, so no Claude release can make this list stale or make a
 * reader take one of these for a default. What matters is the *shape* of a
 * hand-written pin, not that the version ever existed.
 */
const DELIBERATE_PINS = [
  'claude-sonnet-1-19991231',
  'claude-opus-1-19991231',
  'claude-1-9-haiku-19991231',
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

  describe('migrateClaudeModelId', () => {
    it.each(Object.entries(PINNED_BY_ACCIDENT_CLAUDE_MODEL_MAP))(
      'collapses %s to %s',
      (pinned, canonical) => {
        expect(migrateClaudeModelId(pinned)).toBe(canonical);
      }
    );

    it.each(DELIBERATE_PINS)('leaves the deliberate pin %s intact', (pinned) => {
      expect(migrateClaudeModelId(pinned)).toBe(pinned);
    });

    it.each(CLAUDE_CANONICAL_IDS)('leaves the canonical ID %s unchanged', (canonical) => {
      expect(migrateClaudeModelId(canonical)).toBe(canonical);
    });

    it('migrates the legacy bare Claude aliases', () => {
      expect(migrateClaudeModelId('opus')).toBe('claude-opus');
      expect(migrateClaudeModelId('sonnet')).toBe('claude-sonnet');
      expect(migrateClaudeModelId('haiku')).toBe('claude-haiku');
    });

    it('carries no Cursor rule: a Cursor identifier survives byte for byte', () => {
      expect(migrateClaudeModelId('cursor-auto')).toBe('cursor-auto');
      // A bare legacy Cursor ID, which migrateModelId would prefix.
      expect(migrateClaudeModelId('opus-4.5')).toBe('opus-4.5');
      expect(migrateModelId('opus-4.5')).toBe('cursor-opus-4.5');
    });

    it('carries no OpenCode rule: a retired identifier survives byte for byte', () => {
      expect(migrateClaudeModelId('opencode-big-pickle')).toBe('opencode-big-pickle');
      expect(migrateClaudeModelId('opencode-grok-code')).toBe('opencode-grok-code');
      expect(migrateModelId('opencode-grok-code')).toBe('opencode-big-pickle');
      expect(migrateClaudeModelId('opencode/glm-4.7-free')).toBe('opencode/glm-4.7-free');
    });

    it('leaves the remaining providers untouched', () => {
      expect(migrateClaudeModelId('codex-gpt-5.3-codex')).toBe('codex-gpt-5.3-codex');
      expect(migrateClaudeModelId('copilot-claude-opus-4.5')).toBe('copilot-claude-opus-4.5');
      expect(migrateClaudeModelId('GLM-4.7')).toBe('GLM-4.7');
    });

    it('returns a falsy input unchanged', () => {
      expect(migrateClaudeModelId(undefined)).toBeUndefined();
      expect(migrateClaudeModelId(null)).toBeNull();
      expect(migrateClaudeModelId('')).toBe('');
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
