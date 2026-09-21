/**
 * A structural guard: a model row may only live in a catalogue module.
 *
 * ngut-1995/harbor#78 was not a bug in a function. It was a *second copy*: the
 * UI's Codex picker list was written out by hand next to the shared table it
 * was supposed to mirror, and it stopped at 5.2 while the server, the shared
 * types and the display names all knew about 5.3. Nothing failed. A user simply
 * could not find a model Automaker already supported.
 *
 * Tickets 81-83 collapsed every provider onto one catalogue module each, so the
 * copy no longer exists. Nothing, however, stops the next release from adding a
 * new one -- and the catalogue tests can only see the catalogues, so a hand-
 * written list somewhere else would pass unnoticed exactly as it did before.
 *
 * This test looks, so that it cannot. It scans `apps` and `libs` for *model row
 * declarations* -- an object literal carrying a canonical model ID together with
 * a label and a description -- and fails on any declared outside a catalogue
 * module, naming the file, the line and the row so the fix needs no bisect.
 *
 * It is deliberately about *declarations*, not reads: mapping over a catalogue
 * from a hundred surfaces is the point; writing a second table of rows is not.
 *
 * Two things are deliberate and worth knowing before editing this file:
 *
 * - **Claude's rows are tier rows, and that is not an oversight.** ADR-0001
 *   fixed Claude at three tiers addressed by alias -- no `id`, no `claude-`
 *   prefix, `displayName` rather than `label`. `claude-tiers.ts` is therefore
 *   allowlisted as Claude's catalogue, and the ADR-0001 invariant is asserted
 *   here too: generalising the catalogue pattern must not be what lets a fourth
 *   Claude entry back in.
 * - **One row-building site is allowed outside a catalogue**, and it is
 *   recorded in `RUNTIME_ROW_BUILDERS` below with the reason.
 *
 * The guard is narrow on purpose. A false positive that blocks a legitimate
 * edit costs more than a slightly smaller net, so it only recognises the shape
 * that actually drifted. `it('recognises the hand-written list that caused #78')`
 * pins that it still catches that shape.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CODEX_CATALOGUE_ROWS } from '../../src/codex-models.js';
import { CURSOR_CATALOGUE_ROWS } from '../../src/cursor-models.js';
import { OPENCODE_CATALOGUE_ROWS } from '../../src/opencode-models.js';
import { GEMINI_CATALOGUE_ROWS } from '../../src/gemini-models.js';
import { COPILOT_CATALOGUE_ROWS } from '../../src/copilot-models.js';
import { CLAUDE_TIER_ROWS, CLAUDE_TIERS } from '../../src/claude-tiers.js';
import { CLAUDE_MODELS } from '../../src/model-display.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** Roots worth scanning. Everything Automaker itself writes lives under these. */
const SCANNED_ROOTS = ['apps', 'libs'];

/**
 * Directories never scanned.
 *
 * `tests` is skipped because a test may legitimately build a row fixture.
 * `.claude` is skipped because agent worktrees live there: scanning them would
 * make this test's result depend on whatever another branch happens to contain.
 */
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'build', '.claude', 'tests']);

/**
 * The providers whose rows this guard recognises, and therefore the canonical-ID
 * prefixes it knows. A provider missing from here would be invisible to the
 * scan, so `it('knows every provider that has a catalogue')` keeps it in step.
 */
const PROVIDERS = ['claude', 'codex', 'cursor', 'opencode', 'gemini', 'copilot'] as const;

/**
 * The catalogue modules. A model row declared anywhere else is the failure this
 * guard exists for.
 *
 * `claude-tiers.ts` is Claude's catalogue. Its rows are shaped differently on
 * purpose (see the header), which means the scan would not flag them anyway --
 * it is listed so that a reader looking for "where do Claude's rows live" finds
 * the answer in the same place as every other provider's.
 */
const CATALOGUE_MODULES = new Set([
  'libs/types/src/claude-tiers.ts',
  'libs/types/src/codex-models.ts',
  'libs/types/src/cursor-models.ts',
  'libs/types/src/opencode-models.ts',
  'libs/types/src/gemini-models.ts',
  'libs/types/src/copilot-models.ts',
]);

/**
 * The one site outside a catalogue that may build rows, and why.
 *
 * OpenCode is the provider whose models are discovered at runtime: the CLI
 * reports what the user can actually reach, and this component converts each
 * discovered `ModelDefinition` into an `OpencodeModelRow` so the section renders
 * a discovered model exactly as it renders a declared one. Those IDs come from
 * the CLI, not from source, so there is no copy of the catalogue here to drift
 * -- nothing is written out by hand, and adding a model to the OpenCode
 * catalogue still means editing one row in one file.
 */
const RUNTIME_ROW_BUILDERS = new Set([
  'apps/ui/src/components/views/settings-view/providers/opencode-model-configuration.tsx',
]);

/** One model row the scan found in a source file. */
interface RowSighting {
  /** The provider the row's ID names. */
  provider: string;
  /** The ID as written in source, e.g. `codex-gpt-5.3-codex`. */
  id: string;
  /** The row's label, so a failure names something a human recognises. */
  label: string;
  /** 1-based line of the `id:` property. */
  line: number;
}

/**
 * Blank out comments, preserving offsets and newlines.
 *
 * A doc comment illustrating a row -- and the catalogue modules are full of
 * prose about rows -- is documentation, not a declaration. Replacing rather
 * than removing keeps reported line numbers honest.
 */
function withoutComments(source: string): string {
  const out = source.split('');
  let index = 0;
  const blank = (from: number, to: number): void => {
    for (let i = from; i < to; i++) {
      if (out[i] !== '\n') out[i] = ' ';
    }
  };

  while (index < source.length) {
    const char = source[index];

    if (char === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index);
      blank(index, end === -1 ? source.length : end);
      index = end === -1 ? source.length : end;
      continue;
    }
    if (char === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(index, stop);
      index = stop;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      index++;
      while (index < source.length && source[index] !== char) {
        if (source[index] === '\\') index++;
        index++;
      }
      index++;
      continue;
    }
    index++;
  }

  return out.join('');
}

/**
 * An `id:` property whose value names a model: either a canonical-ID string
 * literal, or a member of a provider's `*_MODEL_MAP` (which is how the Codex
 * catalogue spells its keys, and how a hand-written copy could spell them too).
 */
const ID_PROPERTY =
  /(?<![\w$.])id\s*:\s*(?:'([^']*)'|"([^"]*)"|([A-Z][A-Z0-9]*)_MODEL_MAP\s*\.\s*([A-Za-z0-9_$]+))/g;

/**
 * The other two properties that make an object a model row rather than merely an
 * object mentioning a model.
 *
 * A label alone is not enough: a settings-navigation item is `{ id, label, icon }`
 * and names a *section*, not a model, so requiring a description keeps the guard
 * off it. Every row in every catalogue carries all three.
 */
const ROW_PROPERTIES = [/(?<![\w$.])label\s*:/, /(?<![\w$.])description\s*:/];

/** The row's label, read back out of the object literal for the failure message. */
const LABEL_VALUE = /(?<![\w$.])label\s*:\s*(?:'([^']*)'|"([^"]*)")/;

/** The provider a written ID names, or `null` if it names no provider we know. */
function providerOf(literal: string | undefined, mapName: string | undefined): string | null {
  if (literal !== undefined) {
    return PROVIDERS.find((provider) => literal.startsWith(`${provider}-`)) ?? null;
  }
  if (mapName !== undefined) {
    const stem = mapName.toLowerCase();
    return PROVIDERS.find((provider) => provider === stem) ?? null;
  }
  return null;
}

/**
 * The object literal enclosing `index`, as source text, or `null` if `index` is
 * not inside one.
 */
function enclosingObjectLiteral(source: string, index: number): string | null {
  let depth = 0;
  let open = -1;
  for (let i = index; i >= 0; i--) {
    if (source[i] === '}') depth++;
    else if (source[i] === '{') {
      if (depth === 0) {
        open = i;
        break;
      }
      depth--;
    }
  }
  if (open === -1) return null;

  depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

/**
 * Every model row declared in `source`.
 *
 * A model row is an object literal carrying a canonical model ID together with a
 * label and a description. Requiring all three is what keeps the guard off the
 * many places that merely mention an ID -- a default in settings, a case in a
 * routing predicate, a navigation entry whose `id` happens to start with a
 * provider name.
 */
function findModelRows(source: string): RowSighting[] {
  const code = withoutComments(source);
  const sightings: RowSighting[] = [];

  for (const match of code.matchAll(ID_PROPERTY)) {
    const [, single, double, mapName, mapKey] = match;
    const literal = single ?? double;
    const provider = providerOf(literal, mapName);
    if (provider === null) continue;

    const object = enclosingObjectLiteral(code, match.index);
    if (object === null || !ROW_PROPERTIES.every((property) => property.test(object))) continue;

    const label = LABEL_VALUE.exec(object);

    sightings.push({
      provider,
      id: literal ?? `${mapName}_MODEL_MAP.${mapKey}`,
      label: label?.[1] ?? label?.[2] ?? '',
      line: code.slice(0, match.index).split('\n').length,
    });
  }

  return sightings;
}

/** Every `.ts`/`.tsx` source file below `root`, excluding tests. */
function sourceFiles(root: string): string[] {
  const absolute = path.join(REPO_ROOT, root);
  if (!fs.existsSync(absolute)) return [];

  const files: string[] = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
        walk(path.join(current, entry.name));
      } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        files.push(path.join(current, entry.name));
      }
    }
  };
  walk(absolute);
  return files;
}

function scannedFiles(): string[] {
  return SCANNED_ROOTS.flatMap(sourceFiles);
}

function relative(file: string): string {
  return path.relative(REPO_ROOT, file);
}

describe('a model row may only live in a catalogue', () => {
  it('declares no model row outside a catalogue module', () => {
    const offenders: string[] = [];

    for (const file of scannedFiles()) {
      const name = relative(file);
      if (CATALOGUE_MODULES.has(name) || RUNTIME_ROW_BUILDERS.has(name)) continue;

      for (const row of findModelRows(fs.readFileSync(file, 'utf8'))) {
        offenders.push(`${name}:${row.line}: ${row.provider} row ${row.id} ("${row.label}")`);
      }
    }

    expect(
      offenders,
      [
        'Model rows were declared outside a catalogue module:',
        ...offenders.map((offender) => `  ${offender}`),
        '',
        'A model row belongs in its provider catalogue under libs/types/src/,',
        'and every other surface derives from that table (ngut-1995/harbor#78).',
      ].join('\n')
    ).toEqual([]);
  });

  it('finds rows in every catalogue module (the guard is not vacuous)', () => {
    const counted = [...CATALOGUE_MODULES]
      .filter((name) => name !== 'libs/types/src/claude-tiers.ts')
      .map((name) => [name, findModelRows(fs.readFileSync(path.join(REPO_ROOT, name), 'utf8'))]);

    for (const [name, rows] of counted as [string, RowSighting[]][]) {
      expect(rows.length, `${name} should declare rows the guard can see`).toBeGreaterThan(0);
    }
  });

  /**
   * The non-vacuity that matters: the guard must catch the *specific* shape that
   * caused #78 -- a hand-written provider list in the UI that starts at an older
   * model. This is the pre-#82 UI Codex list, abridged; running the scan over it
   * is running the scan over `main` as it was.
   */
  it('recognises the hand-written list that caused #78', () => {
    const preFixUiList = `
      import type { ModelOption } from '@automaker/types';

      export const CODEX_MODELS: ModelOption[] = [
        {
          id: 'codex-gpt-5.2-codex',
          label: 'GPT-5.2-Codex',
          description: 'Frontier agentic coding model.',
          badge: 'Premium',
        },
        {
          id: 'codex-gpt-5.2',
          label: 'GPT-5.2',
          description: 'General-purpose model.',
          badge: 'Balanced',
        },
      ];
    `;

    const rows = findModelRows(preFixUiList);

    expect(rows.map((row) => row.id)).toEqual(['codex-gpt-5.2-codex', 'codex-gpt-5.2']);
    expect(rows.map((row) => row.label)).toEqual(['GPT-5.2-Codex', 'GPT-5.2']);
    expect(rows.every((row) => row.provider === 'codex')).toBe(true);
  });

  it('ignores what is not a row: a bare ID, a navigation entry, a comment', () => {
    const notRows = `
      const DEFAULT = { model: 'codex-gpt-5.3-codex', thinkingLevel: 'high' };
      const byId = { id: 'codex-gpt-5.3-codex', enabled: true };
      const navigation = [{ id: 'codex-provider', label: 'Codex', icon: OpenAIIcon }];
      /** { id: 'codex-gpt-5.3-codex', label: 'GPT-5.3-Codex', description: 'x' } */
      // { id: 'cursor-auto', label: 'Auto', description: 'x' }
    `;

    expect(findModelRows(notRows)).toEqual([]);
  });

  it('knows every provider that has a catalogue', () => {
    const declared = new Set(
      [
        ...CODEX_CATALOGUE_ROWS,
        ...CURSOR_CATALOGUE_ROWS,
        ...OPENCODE_CATALOGUE_ROWS,
        ...GEMINI_CATALOGUE_ROWS,
        ...COPILOT_CATALOGUE_ROWS,
      ].map((row) => row.provider as string)
    );

    for (const provider of declared) {
      expect(PROVIDERS as readonly string[], `${provider} is unknown to the guard`).toContain(
        provider
      );
    }
  });

  it('points every allowlisted path at a file that still exists', () => {
    for (const name of [...CATALOGUE_MODULES, ...RUNTIME_ROW_BUILDERS]) {
      expect(fs.existsSync(path.join(REPO_ROOT, name)), name).toBe(true);
    }
  });
});

/**
 * ADR-0001, restated where the guard can see it.
 *
 * Claude is addressed by tier and never by version. Its rows live in
 * `claude-tiers.ts` -- keyed by alias, with a `displayName` and no canonical ID
 * -- which is why the scan above passes over them rather than flagging them.
 * That pass-over must not become a hole: if generalising the catalogue pattern
 * ever admits a fourth Claude entry, or a versioned one, this is what fails.
 */
describe('the Claude catalogue, as ADR-0001 left it', () => {
  it('is exactly the three tiers', () => {
    expect(CLAUDE_TIER_ROWS.map((row) => row.tier)).toEqual([...CLAUDE_TIERS]);
    expect(CLAUDE_TIER_ROWS).toHaveLength(3);
    expect(CLAUDE_MODELS.map((option) => option.id)).toEqual([...CLAUDE_TIERS]);
  });

  it('names no version, in any of its spellings', () => {
    for (const row of CLAUDE_TIER_ROWS) {
      expect(row.tier, row.tier).not.toMatch(/\d/);
      expect(row.displayName, row.tier).not.toMatch(/\d/);
    }
    for (const option of CLAUDE_MODELS) {
      expect(option.id, option.id).not.toMatch(/\d/);
      expect(option.label, option.id).not.toMatch(/\d/);
    }
  });

  it('keeps its rows in the module the guard treats as the Claude catalogue', () => {
    expect(CATALOGUE_MODULES.has('libs/types/src/claude-tiers.ts')).toBe(true);

    const source = fs.readFileSync(path.join(REPO_ROOT, 'libs/types/src/claude-tiers.ts'), 'utf8');
    for (const row of CLAUDE_TIER_ROWS) {
      expect(source, row.tier).toContain(`tier: '${row.tier}'`);
    }
  });
});
