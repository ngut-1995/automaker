import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ModelAlias, ModelProvider } from '@/store/app-store';
import {
  normalizeThinkingLevelForModel,
  normalizeReasoningEffortForModel,
  migrateClaudeModelId,
  getModelDisplayName,
  type ClaudeCompatibleProvider,
  type PhaseModelEntry,
} from '@automaker/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export getErrorMessage from @automaker/utils to maintain backward compatibility
// for components that already import it from here
// NOTE: Using subpath export to avoid pulling in Node.js-specific dependencies
// (the main @automaker/utils barrel imports modules that depend on @automaker/platform)
export { getErrorMessage } from '@automaker/utils/error-handler';

/**
 * Migrate a stored Claude model ID to its canonical form for display and editing.
 *
 * Delegates to the shared migration's Claude-only entry point, so the edit
 * dialog agrees with what the server resolves at execution time for Claude -- a
 * legacy alias becomes canonical, and a version Automaker pinned on the user's
 * behalf collapses back to its tier -- while a pin the user wrote themselves,
 * and every non-Claude identifier, is returned byte for byte.
 *
 * Not the full `migrateModelId`: that one also carries the Cursor and OpenCode
 * rules, and rewriting another provider's stored identifier when the user opens
 * a card is a behaviour change nobody asked for. Not a local copy of the Claude
 * rules either: the duplication is what drifted last time.
 */
export function migrateModelId(modelId: string | undefined): string | undefined {
  if (!modelId) return modelId;
  return migrateClaudeModelId(modelId);
}

/**
 * Normalize a model entry by ensuring thinking levels and reasoning efforts
 * are valid for the selected model.
 */
export function normalizeModelEntry(entry: PhaseModelEntry): PhaseModelEntry {
  const model = entry.model;

  return {
    model,
    providerId: entry.providerId,
    thinkingLevel: normalizeThinkingLevelForModel(model, entry.thinkingLevel),
    reasoningEffort: normalizeReasoningEffortForModel(model, entry.reasoningEffort),
  };
}

/**
 * Determine if the current model supports extended thinking controls
 * Note: This is for Claude's "thinking levels" only, not Codex's "reasoning effort"
 *
 * Rules:
 * - Claude models: support thinking (sonnet-4.5-thinking, opus-4.5-thinking, etc.)
 * - Cursor models: NO thinking controls (handled internally by Cursor CLI)
 * - Codex models: NO thinking controls (they use reasoningEffort instead)
 */
export function modelSupportsThinking(_model?: ModelAlias | string): boolean {
  if (!_model) return true;

  // Cursor models - don't show thinking controls
  if (_model.startsWith('cursor-')) {
    return false;
  }

  // Codex models - use reasoningEffort, not thinkingLevel
  if (_model.startsWith('codex-')) {
    return false;
  }

  // Bare gpt- models (legacy) - assume Codex, no thinking controls
  if (_model.startsWith('gpt-')) {
    return false;
  }

  // All Claude models support thinking
  return true;
}

/**
 * Determine the provider from a model string
 * Mirrors the logic in apps/server/src/providers/provider-factory.ts
 */
export function getProviderFromModel(model?: string): ModelProvider {
  if (!model) return 'claude';

  // Check for Cursor models (cursor- prefix)
  if (model.startsWith('cursor-') || model.startsWith('cursor:')) {
    return 'cursor';
  }

  // Check for Codex/OpenAI models (codex- prefix, gpt- prefix, or o-series)
  if (
    model.startsWith('codex-') ||
    model.startsWith('codex:') ||
    model.startsWith('gpt-') ||
    /^o\d/.test(model)
  ) {
    return 'codex';
  }

  // Default to Claude
  return 'claude';
}

/**
 * Get display name for a model.
 *
 * Re-exported, not reimplemented: `@automaker/types` holds the one table that
 * decides how a model is named on screen, and this used to be a second copy of
 * it that disagreed with the first. Importing from here still works so callers
 * do not have to change.
 *
 * @see getModelDisplayName in libs/types/src/model-display.ts
 */
export { getModelDisplayName };

/**
 * Format a phase entry's model for a "Using:" line.
 *
 * A Claude-compatible provider's own name for the model wins, qualified by the
 * provider so two providers behind the same Claude-shaped ID stay
 * distinguishable. Everything else is the shared `getModelDisplayName`.
 *
 * Lived twice -- once in each of the two project-settings components -- and is
 * now the one definition both read (ngut-1995/harbor#43).
 */
export function getPhaseModelLabel(
  entry: PhaseModelEntry,
  claudeCompatibleProviders?: ClaudeCompatibleProvider[]
): string {
  if (entry.providerId) {
    const provider = claudeCompatibleProviders?.find((p) => p.id === entry.providerId);
    const model = provider?.models?.find((m) => m.id === entry.model);
    if (provider && model) {
      return `${model.displayName} (${provider.name})`;
    }
  }
  return getModelDisplayName(entry.model);
}

/**
 * Truncate a description string with ellipsis
 */
export function truncateDescription(description: string, maxLength = 50): string {
  if (description.length <= maxLength) {
    return description;
  }
  return `${description.slice(0, maxLength)}...`;
}

/**
 * Normalize a file path to use forward slashes consistently.
 * This is important for cross-platform compatibility (Windows uses backslashes).
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Compare two paths for equality, handling cross-platform differences.
 * Normalizes both paths to forward slashes before comparison.
 */
export function pathsEqual(p1: string | undefined | null, p2: string | undefined | null): boolean {
  if (!p1 || !p2) return p1 === p2;
  return normalizePath(p1) === normalizePath(p2);
}

/**
 * Detect if running on macOS.
 * Checks Electron process.platform first, then falls back to navigator APIs.
 */
export const isMac =
  typeof process !== 'undefined' && process.platform === 'darwin'
    ? true
    : typeof navigator !== 'undefined' &&
      (/Mac/.test(navigator.userAgent) ||
        (navigator.platform ? navigator.platform.toLowerCase().includes('mac') : false));

/**
 * Sanitize a string for use in data-testid attributes.
 * Creates a deterministic, URL-safe identifier from any input string.
 *
 * Transformations:
 * - Convert to lowercase
 * - Replace spaces with hyphens
 * - Remove all non-alphanumeric characters (except hyphens)
 * - Collapse multiple consecutive hyphens into a single hyphen
 * - Trim leading/trailing hyphens
 *
 * @param name - The string to sanitize (e.g., project name, feature title)
 * @returns A sanitized string safe for CSS selectors and test IDs
 *
 * @example
 * sanitizeForTestId("My Awesome Project!") // "my-awesome-project"
 * sanitizeForTestId("test-project-123")    // "test-project-123"
 * sanitizeForTestId("  Foo  Bar  ")        // "foo-bar"
 */
export function sanitizeForTestId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a UUID v4 string.
 *
 * Uses crypto.getRandomValues() which works in all modern browsers,
 * including non-secure contexts (e.g., Docker via HTTP).
 *
 * @returns A RFC 4122 compliant UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateUUID(): string {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues === 'undefined') {
    throw new Error('Cryptographically secure random number generator not available.');
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant (RFC 4122) bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC 4122

  // Convert to hex string with proper UUID format
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Format a date as relative time (e.g., "2 minutes ago", "3 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) return date.toLocaleDateString();

  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}
