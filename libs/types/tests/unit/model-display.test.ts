/**
 * Tests for the Claude display helpers.
 *
 * Automaker addresses Claude by tier alias, so it cannot know which version a
 * tier resolves to (see docs/adr/0001-claude-tier-aliases.md). These tests pin
 * down the consequence: a Claude model string that is not an exact, known match
 * renders as its tier name, never as a guessed version and never as a raw ID.
 */

import { describe, it, expect } from 'vitest';
import { getModelDisplayName, getClaudeTierDisplayName } from '../../src/model-display.js';

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

  it('leaves models from other providers untouched', () => {
    expect(getModelDisplayName('codex-gpt-5.2')).toBe('GPT-5.2');
    expect(getModelDisplayName('gemini-2.5-flash')).toBe('Gemini 2.5 Flash');
    expect(getModelDisplayName('cursor-opus-4.5')).toBe('cursor-opus-4.5');
    expect(getModelDisplayName('copilot-claude-opus-4.5')).toBe('copilot-claude-opus-4.5');
    expect(getModelDisplayName('opencode-big-pickle')).toBe('opencode-big-pickle');
  });
});
