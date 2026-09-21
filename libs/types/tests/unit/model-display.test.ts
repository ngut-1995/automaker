/**
 * Tests for the Claude display helpers.
 *
 * Automaker addresses Claude by tier alias, so it cannot know which version a
 * tier resolves to (see docs/adr/0001-claude-tier-aliases.md). These tests pin
 * down the consequence: a Claude model string that is not an exact, known match
 * renders as its tier name, never as a guessed version and never as a raw ID.
 */

import { describe, it, expect } from 'vitest';
import {
  getModelDisplayName,
  getClaudeTierDisplayName,
  MODEL_DISPLAY_NAMES,
  CODEX_MODELS,
  CLAUDE_TIER_DISPLAY_NAMES,
} from '../../src/model-display.js';
import { CURSOR_MODEL_MAP } from '../../src/cursor-models.js';
import { COPILOT_MODEL_MAP } from '../../src/copilot-models.js';
import { GEMINI_MODEL_MAP } from '../../src/gemini-models.js';
import { OPENCODE_MODELS } from '../../src/opencode-models.js';

describe('getClaudeTierDisplayName', () => {
  it('names the tier for bare tier aliases', () => {
    expect(getClaudeTierDisplayName('opus')).toBe('Claude Opus');
    expect(getClaudeTierDisplayName('sonnet')).toBe('Claude Sonnet');
    expect(getClaudeTierDisplayName('haiku')).toBe('Claude Haiku');
  });

  it('names the tier for canonical IDs', () => {
    expect(getClaudeTierDisplayName('claude-opus')).toBe('Claude Opus');
    expect(getClaudeTierDisplayName('claude-sonnet')).toBe('Claude Sonnet');
    expect(getClaudeTierDisplayName('claude-haiku')).toBe('Claude Haiku');
  });

  it('names the tier for pinned model IDs, including dated ones', () => {
    expect(getClaudeTierDisplayName('claude-opus-4-6')).toBe('Claude Opus');
    expect(getClaudeTierDisplayName('claude-haiku-4-5-20251001')).toBe('Claude Haiku');
    expect(getClaudeTierDisplayName('claude-sonnet-1-19991231')).toBe('Claude Sonnet');
  });

  it('names the tier for versions Automaker has never heard of', () => {
    expect(getClaudeTierDisplayName('claude-opus-9-9')).toBe('Claude Opus');
    expect(getClaudeTierDisplayName('claude-1-opus')).toBe('Claude Opus');
  });

  it('does not claim models from other providers', () => {
    expect(getClaudeTierDisplayName('cursor-opus-4.5')).toBeUndefined();
    expect(getClaudeTierDisplayName('cursor-sonnet-4.6')).toBeUndefined();
    expect(getClaudeTierDisplayName('copilot-claude-opus-4.5')).toBeUndefined();
    expect(getClaudeTierDisplayName('anthropic/claude-sonnet-4-5')).toBeUndefined();
    expect(getClaudeTierDisplayName('codex-gpt-5.2')).toBeUndefined();
    expect(getClaudeTierDisplayName('gemini-2.5-flash')).toBeUndefined();
    expect(getClaudeTierDisplayName('opencode-big-pickle')).toBeUndefined();
  });

  it('does not claim Claude strings with no tier in them', () => {
    expect(getClaudeTierDisplayName('claude-swift-1')).toBeUndefined();
  });
});

describe('getModelDisplayName', () => {
  it('keeps the existing labels for exact, known identifiers', () => {
    expect(getModelDisplayName('haiku')).toBe('Claude Haiku');
    expect(getModelDisplayName('sonnet')).toBe('Claude Sonnet');
    expect(getModelDisplayName('opus')).toBe('Claude Opus');
    expect(getModelDisplayName('claude-haiku')).toBe('Claude Haiku');
    expect(getModelDisplayName('claude-sonnet')).toBe('Claude Sonnet');
    expect(getModelDisplayName('claude-opus')).toBe('Claude Opus');
  });

  it('names the tier for a version Automaker pinned on the user\u2019s behalf', () => {
    // These collapse to their tier when read, so the version in the string is
    // not the version that runs.
    expect(getModelDisplayName('claude-opus-4-6')).toBe('Claude Opus');
    expect(getModelDisplayName('claude-sonnet-4-6')).toBe('Claude Sonnet');
    expect(getModelDisplayName('claude-haiku-4-5-20251001')).toBe('Claude Haiku');
  });

  it('renders an unrecognised Claude string as its tier name, not a raw ID', () => {
    expect(getModelDisplayName('claude-opus-1-9')).toBe('Claude Opus');
    expect(getModelDisplayName('claude-sonnet-1-19991231')).toBe('Claude Sonnet');
    expect(getModelDisplayName('claude-opus-9-9')).toBe('Claude Opus');
  });

  it('renders an unrecognised Haiku identifier, dated or not, as Claude Haiku', () => {
    expect(getModelDisplayName('claude-haiku-1-9')).toBe('Claude Haiku');
    expect(getModelDisplayName('claude-haiku-4-5-20251001')).toBe('Claude Haiku');
  });

  it('names a model from another provider by its own catalogue label', () => {
    expect(getModelDisplayName('codex-gpt-5.2')).toBe('GPT-5.2');
    expect(getModelDisplayName('gemini-2.5-flash')).toBe('Gemini 2.5 Flash');
    expect(getModelDisplayName('cursor-opus-4.5')).toBe('Claude Opus 4.5');
    expect(getModelDisplayName('copilot-claude-opus-4.5')).toBe('Claude Opus 4.5');
    expect(getModelDisplayName('opencode-big-pickle')).toBe('Big Pickle');
  });

  it('echoes an identifier it has never heard of rather than inventing a name', () => {
    // The old behaviour in one of the three helpers was to split on dashes and
    // keep the middle -- which named "unknown-model-name" as "model name" and a
    // single-token ID as the empty string. An identifier is at least true.
    expect(getModelDisplayName('unknown-model-name')).toBe('unknown-model-name');
    expect(getModelDisplayName('single')).toBe('single');
  });

  it('names a model that was migrated from a legacy or retired identifier', () => {
    expect(getModelDisplayName('sonnet-4.6')).toBe('Claude Sonnet 4.6');
    expect(getModelDisplayName('opencode/big-pickle')).toBe('Big Pickle');
    expect(getModelDisplayName('opencode-minimax-m2.1-free')).toBe('MiniMax M2.5 Free');
  });
});

/**
 * Criterion: one table, in the shared types package, is the only source of model
 * display names, and a fourth cannot reappear unnoticed (ngut-1995/harbor#38).
 *
 * The defence is structural rather than a list of expected strings: the table is
 * *derived* from the provider catalogues, so these tests fail if anyone writes a
 * name a second time and it drifts, or adds a catalogue model the table cannot
 * name.
 */
describe('the single display-name table', () => {
  const CATALOGUE_LABELS: Record<string, string> = {
    ...Object.fromEntries(CODEX_MODELS.map((m) => [m.id, m.label])),
    ...Object.fromEntries(Object.entries(CURSOR_MODEL_MAP).map(([id, c]) => [id, c.label])),
    ...Object.fromEntries(Object.entries(GEMINI_MODEL_MAP).map(([id, c]) => [id, c.label])),
    ...Object.fromEntries(Object.entries(COPILOT_MODEL_MAP).map(([id, c]) => [id, c.label])),
    ...Object.fromEntries(OPENCODE_MODELS.map((m) => [m.id, m.label])),
  };

  /**
   * The complete set of identifiers whose name is written by hand instead of
   * taken from the provider's catalogue. Every entry needs a reason in
   * `DISPLAY_NAME_OVERRIDES`; this test is what forces one to be given.
   */
  const DOCUMENTED_OVERRIDES: Record<string, string> = {
    'cursor-auto': 'Cursor Auto',
  };

  it('names every model in every provider catalogue', () => {
    for (const id of Object.keys(CATALOGUE_LABELS)) {
      expect(getModelDisplayName(id), id).not.toBe(id);
    }
  });

  it('names each of them exactly as its own provider catalogue does', () => {
    for (const [id, label] of Object.entries(CATALOGUE_LABELS)) {
      if (id in DOCUMENTED_OVERRIDES) continue;
      expect(getModelDisplayName(id), id).toBe(label);
    }
  });

  it('overrides a catalogue label only where a reason is recorded', () => {
    const overridden = Object.entries(CATALOGUE_LABELS)
      .filter(([id, label]) => getModelDisplayName(id) !== label)
      .map(([id]) => id);
    expect(overridden.sort()).toEqual(Object.keys(DOCUMENTED_OVERRIDES).sort());

    for (const [id, label] of Object.entries(DOCUMENTED_OVERRIDES)) {
      expect(getModelDisplayName(id), id).toBe(label);
    }
  });

  it('holds no row for a Claude model, so only the tier helper can name one', () => {
    // A Claude row here would be a second place a Claude name could come from,
    // and the version in the row would be one the provider is free to ignore
    // (docs/adr/0001-claude-tier-aliases.md).
    const claudeRows = Object.keys(MODEL_DISPLAY_NAMES).filter(
      (id) => id.startsWith('claude-') || id in CLAUDE_TIER_DISPLAY_NAMES
    );
    expect(claudeRows).toEqual([]);
  });

  it('answers every Claude tier from CLAUDE_TIER_DISPLAY_NAMES and nowhere else', () => {
    for (const [tier, label] of Object.entries(CLAUDE_TIER_DISPLAY_NAMES)) {
      expect(getModelDisplayName(tier)).toBe(label);
      expect(getModelDisplayName(`claude-${tier}`)).toBe(label);
    }
  });
});
