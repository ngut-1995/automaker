/**
 * Event-vocabulary tests.
 *
 * The WebSocket event vocabulary is single-sourced in `EVENT_TYPES`. These tests
 * pin that: the list has no duplicates, the operation contract only names
 * members, and — the important one — no source file outside the shared module
 * re-declares an event name or misspells one.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EVENT_TYPES } from '../../src/event.js';
import { OPERATIONS } from '../../src/operations.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

const EVENT_TYPE_SET: ReadonlySet<string> = new Set(EVENT_TYPES);

/** Domains are the first colon-separated segment, e.g. `worktree` from `worktree:init-started`. */
const EVENT_DOMAINS: ReadonlySet<string> = new Set(EVENT_TYPES.map((type) => type.split(':')[0]));

/** A colon-separated lower/camel token, e.g. `auto-mode:event` or `worktree:copy-files:copied`. */
const COLON_TOKEN = /^[a-zA-Z][a-zA-Z0-9-]*(?::[a-zA-Z0-9-]+)+$/;

const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'tests']);

/** Recursively collect every `.ts`/`.tsx` file below `directory`. */
function collectSourceFiles(directory: string, out: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      collectSourceFiles(join(directory, entry.name), out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(join(directory, entry.name));
    }
  }
  return out;
}

/** Every quoted string literal in `source`, with its quote-agnostic body. */
function stringLiterals(source: string): string[] {
  const literals: string[] = [];
  const pattern = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    literals.push(match[2]);
  }
  return literals;
}

describe('event vocabulary', () => {
  it('declares each event type exactly once', () => {
    expect(new Set(EVENT_TYPES).size).toBe(EVENT_TYPES.length);
  });

  it('resolves every operation emitted event to a shared event name', () => {
    const definitions = Object.values(OPERATIONS) as Array<{
      emittedEvents?: readonly string[];
    }>;
    const unknown: string[] = [];
    for (const definition of definitions) {
      for (const eventName of definition.emittedEvents ?? []) {
        if (!EVENT_TYPE_SET.has(eventName)) unknown.push(eventName);
      }
    }
    expect(unknown).toEqual([]);
  });

  it('declares no event name outside the shared vocabulary', () => {
    const files = [
      ...collectSourceFiles(join(REPO_ROOT, 'apps')),
      ...collectSourceFiles(join(REPO_ROOT, 'libs')),
    ];

    const offenders: string[] = [];
    for (const file of files) {
      let source: string;
      try {
        source = readFileSync(file, 'utf8');
      } catch {
        continue; // unreadable — not text
      }
      if (source.includes('\u0000')) continue; // binary masquerading as source

      for (const literal of stringLiterals(source)) {
        if (!COLON_TOKEN.test(literal)) continue;
        const domain = literal.split(':')[0];
        if (!EVENT_DOMAINS.has(domain)) continue;
        if (!EVENT_TYPE_SET.has(literal)) {
          offenders.push(`${relative(REPO_ROOT, file)}: ${literal}`);
        }
      }
    }

    expect(offenders, `event names outside EVENT_TYPES:\n${offenders.join('\n')}`).toEqual([]);
  });
});
