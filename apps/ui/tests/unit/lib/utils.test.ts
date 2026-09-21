/**
 * Tests for getModelDisplayName in the UI utils.
 *
 * This table is deliberately kept separate from the one in @automaker/types;
 * unifying them is out of scope here. What both must share is the guarantee
 * that an unrecognised Claude string renders as its tier name rather than as a
 * raw identifier or a guessed version.
 */

import { describe, it, expect } from 'vitest';
import { getModelDisplayName, migrateModelId } from '../../../src/lib/utils';

describe('getModelDisplayName', () => {
  it('keeps the existing labels for exact, known identifiers', () => {
    expect(getModelDisplayName('haiku')).toBe('Claude Haiku');
    expect(getModelDisplayName('sonnet')).toBe('Claude Sonnet');
    expect(getModelDisplayName('opus')).toBe('Claude Opus');
    expect(getModelDisplayName('claude-haiku')).toBe('Claude Haiku');
    expect(getModelDisplayName('claude-sonnet')).toBe('Claude Sonnet');
    expect(getModelDisplayName('claude-opus')).toBe('Claude Opus');
  });

  it('renders an unrecognised Claude string as its tier name, not a raw ID', () => {
    expect(getModelDisplayName('claude-opus-1-9')).toBe('Claude Opus');
    expect(getModelDisplayName('claude-sonnet-4-6')).toBe('Claude Sonnet');
    expect(getModelDisplayName('claude-opus-9-9')).toBe('Claude Opus');
  });

  it('renders a dated Haiku identifier as Claude Haiku', () => {
    expect(getModelDisplayName('claude-haiku-4-5-20251001')).toBe('Claude Haiku');
  });

  it('leaves models from other providers untouched', () => {
    expect(getModelDisplayName('codex-gpt-5.2')).toBe('GPT-5.2');
    expect(getModelDisplayName('cursor-auto')).toBe('Cursor Auto');
    expect(getModelDisplayName('cursor-opus-4.5')).toBe('cursor-opus-4.5');
    expect(getModelDisplayName('copilot-claude-opus-4.5')).toBe('copilot-claude-opus-4.5');
    expect(getModelDisplayName('opencode-big-pickle')).toBe('opencode-big-pickle');
  });
});

describe('migrateModelId', () => {
  it('collapses a version Automaker pinned on the user\u2019s behalf to its tier', () => {
    // The edit dialog must agree with what the server resolves at run time.
    expect(migrateModelId('claude-opus-4-6')).toBe('claude-opus');
    expect(migrateModelId('claude-sonnet-4-6')).toBe('claude-sonnet');
    expect(migrateModelId('claude-haiku-4-5-20251001')).toBe('claude-haiku');
  });

  it('leaves a pin the user wrote themselves intact', () => {
    expect(migrateModelId('claude-sonnet-1-19991231')).toBe('claude-sonnet-1-19991231');
    expect(migrateModelId('claude-opus-4-7')).toBe('claude-opus-4-7');
  });

  it('still migrates legacy bare aliases to canonical IDs', () => {
    expect(migrateModelId('opus')).toBe('claude-opus');
    expect(migrateModelId('sonnet')).toBe('claude-sonnet');
    expect(migrateModelId('haiku')).toBe('claude-haiku');
  });

  it('keeps a Cursor identifier byte for byte', () => {
    // Editing a card must not rewrite another provider's stored identifier.
    expect(migrateModelId('cursor-auto')).toBe('cursor-auto');
    expect(migrateModelId('cursor-opus-4.1')).toBe('cursor-opus-4.1');
    // A bare legacy Cursor ID is the settings layer's business, not the dialog's.
    expect(migrateModelId('opus-4.5')).toBe('opus-4.5');
  });

  it('keeps an OpenCode identifier byte for byte, retired or not', () => {
    expect(migrateModelId('opencode-big-pickle')).toBe('opencode-big-pickle');
    // 'opencode-grok-code' is retired and the shared migration replaces it;
    // the dialog must not.
    expect(migrateModelId('opencode-grok-code')).toBe('opencode-grok-code');
    expect(migrateModelId('opencode/glm-4.7-free')).toBe('opencode/glm-4.7-free');
  });

  it('keeps identifiers from the remaining providers untouched', () => {
    expect(migrateModelId('codex-gpt-5.3-codex')).toBe('codex-gpt-5.3-codex');
    expect(migrateModelId('copilot-claude-opus-4.5')).toBe('copilot-claude-opus-4.5');
    expect(migrateModelId('gemini-3-pro')).toBe('gemini-3-pro');
  });

  it('returns a falsy input unchanged', () => {
    expect(migrateModelId(undefined)).toBeUndefined();
    expect(migrateModelId('')).toBe('');
  });
});
