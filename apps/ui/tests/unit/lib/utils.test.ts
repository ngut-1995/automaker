/**
 * Tests for getModelDisplayName in the UI utils.
 *
 * This table is deliberately kept separate from the one in @automaker/types;
 * unifying them is out of scope here. What both must share is the guarantee
 * that an unrecognised Claude string renders as its tier name rather than as a
 * raw identifier or a guessed version.
 */

import { describe, it, expect } from 'vitest';
import { getModelDisplayName } from '../../../src/lib/utils';

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
    expect(getModelDisplayName('claude-opus-4-5')).toBe('Claude Opus');
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
