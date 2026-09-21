/**
 * Single-writer guard.
 *
 * A Feature's lifecycle state is written only by the Feature record. These tests
 * scan the server and shared-package sources and fail if:
 *   - a Feature's status is assigned outside `feature-record.ts`,
 *   - a Feature file (`feature.json`) is written outside `feature-record.ts`
 *     (the writer) or `feature-loader.ts` (the IO primitive the record delegates to),
 *   - the retired `FeatureStatusWithPipeline` alias reappears.
 *
 * The scanners are exercised against inline fixtures as well, so a scan that
 * quietly matches nothing cannot pass for the wrong reason.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FeatureLoader } from '@/services/feature-loader.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');

const RECORD_PATH = 'apps/server/src/services/feature-record.ts';
const LOADER_PATH = 'apps/server/src/services/feature-loader.ts';

const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'tests', 'test']);

function collectSourceFiles(directory: string, out: string[] = []): string[] {
  let entries: import('fs').Dirent[];
  try {
    entries = readdirSync(directory, { withFileTypes: true }) as import('fs').Dirent[];
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      collectSourceFiles(join(directory, entry.name), out);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(join(directory, entry.name));
    }
  }
  return out;
}

function relativePath(file: string): string {
  return relative(REPO_ROOT, file).split(sep).join('/');
}

function isRecordFile(relPath: string): boolean {
  return relPath === RECORD_PATH;
}

function isWriterPrimitive(relPath: string): boolean {
  return relPath === RECORD_PATH || relPath === LOADER_PATH;
}

const LIFECYCLE_LITERALS = new Set([
  'backlog',
  'ready',
  'in_progress',
  'interrupted',
  'waiting_approval',
  'verified',
  'completed',
  'merge_conflict',
]);

/** `.status` owners that are legitimately not a Feature (tasks, plans, sessions, …). */
const NON_FEATURE_STATUS_OWNERS = new Set([
  'planSpec',
  'task',
  'session',
  'record',
  'phase',
  'step',
  'todo',
  'part',
  'response',
  'resultEvent',
  'exitedSession',
  'completionResult',
  'file',
]);

function lineOf(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

/**
 * Feature-typed `.status = …` assignments. A receiver whose name contains
 * "feature" is always a Feature. Assigning a lifecycle literal to any other
 * receiver is only allowed for the non-Feature owners above.
 */
export function findFeatureStatusAssignments(source: string, relPath: string): string[] {
  if (isRecordFile(relPath)) return [];

  const offenders: string[] = [];
  const assignment = /([A-Za-z_$][\w$]*)\s*\.\s*status\s*=(?!=)/g;
  let match: RegExpExecArray | null;
  while ((match = assignment.exec(source)) !== null) {
    const owner = match[1];
    if (/feature/i.test(owner)) {
      offenders.push(`${relPath}:${lineOf(source, match.index)}: ${owner}.status =`);
      continue;
    }
    if (NON_FEATURE_STATUS_OWNERS.has(owner)) continue;

    const rest = source.slice(assignment.lastIndex, assignment.lastIndex + 40);
    const literal = rest.match(/^\s*(['"`])([a-zA-Z_]+)\1/);
    if (literal && LIFECYCLE_LITERALS.has(literal[2])) {
      offenders.push(`${relPath}:${lineOf(source, match.index)}: ${owner}.status =`);
    }
  }
  return offenders;
}

function collectFeatureJsonPathVars(source: string): Set<string> {
  const vars = new Set<string>();
  const declaration =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^\n;]*?['"`]feature\.json['"`]/g;
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(source)) !== null) {
    vars.add(match[1]);
  }
  return vars;
}

/** First argument of a call whose `(` is at `openParenIndex`, respecting nesting and strings. */
function extractFirstArg(source: string, openParenIndex: number): string | null {
  if (source[openParenIndex] !== '(') return null;
  let depth = 0;
  let quote: string | null = null;
  for (let i = openParenIndex; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') {
        i++;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth === 0) return source.slice(openParenIndex + 1, i);
    } else if (char === ',' && depth === 1) {
      return source.slice(openParenIndex + 1, i);
    }
  }
  return null;
}

/** Writes whose target is a Feature file, outside the record and the loader primitive. */
export function findDirectFeatureJsonWrites(source: string, relPath: string): string[] {
  if (isWriterPrimitive(relPath)) return [];

  const pathVars = collectFeatureJsonPathVars(source);
  const offenders: string[] = [];
  const call = /\b(?:atomicWriteJson|writeFile)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = call.exec(source)) !== null) {
    const openParenIndex = match.index + match[0].length - 1;
    const arg = extractFirstArg(source, openParenIndex);
    if (!arg) continue;
    const mentionsFeatureJson =
      /['"`]feature\.json['"`]/.test(arg) ||
      arg.includes('getFeatureJsonPath') ||
      [...pathVars].some((name) => new RegExp(`\\b${name}\\b`).test(arg));
    if (mentionsFeatureJson) {
      offenders.push(`${relPath}:${lineOf(source, match.index)}: ${arg.trim().slice(0, 60)}`);
    }
  }
  return offenders;
}

/** The full argument list of a call whose `(` is at `openParenIndex`. */
function extractCallArgs(source: string, openParenIndex: number): string | null {
  if (source[openParenIndex] !== '(') return null;
  let depth = 0;
  let quote: string | null = null;
  for (let i = openParenIndex; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') {
        i++;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth === 0) return source.slice(openParenIndex + 1, i);
    }
  }
  return null;
}

/**
 * A `loader.update(...)` call whose payload carries a `status` field. This is
 * the shape the assignment scan missed: the status travels as data, not as a
 * `feature.status =` assignment. The FeatureLoader runtime guard rejects it at
 * call time; this scan catches the literal shape in source before it runs.
 *
 * `create` is deliberately not scanned: creation legitimately carries an
 * initial status and is not a lifecycle transition. Payloads passed as opaque
 * variables (e.g. `fieldUpdates`) cannot be proven statically and are covered
 * by the runtime guard instead.
 */
export function findLoaderUpdateStatusWrites(source: string, relPath: string): string[] {
  if (isWriterPrimitive(relPath)) return [];

  const offenders: string[] = [];
  const call = /\b(?:this\.)?([A-Za-z_$][\w$]*)\s*\.\s*update\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = call.exec(source)) !== null) {
    if (!/loader$/i.test(match[1])) continue;
    const openParenIndex = match.index + match[0].length - 1;
    const args = extractCallArgs(source, openParenIndex);
    if (!args) continue;
    if (/\bstatus\s*:/.test(args) || /(?:^|[{,])\s*status\s*[,}]/.test(args)) {
      offenders.push(`${relPath}:${lineOf(source, match.index)}: ${args.trim().slice(0, 60)}`);
    }
  }
  return offenders;
}

function scan(relPath: string, scanner: (source: string, relPath: string) => string[]): string[] {
  let source: string;
  try {
    source = readFileSync(join(REPO_ROOT, relPath), 'utf8');
  } catch {
    return [];
  }
  if (source.includes('\u0000')) return [];
  return scanner(source, relPath);
}

const SOURCE_FILES = [
  ...collectSourceFiles(join(REPO_ROOT, 'apps', 'server', 'src')),
  ...collectSourceFiles(join(REPO_ROOT, 'libs')),
].map(relativePath);

describe('Feature single writer', () => {
  it('has source files to scan', () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(100);
    expect(SOURCE_FILES).toContain(RECORD_PATH);
  });

  it('assigns no Feature status outside the record', () => {
    const offenders = SOURCE_FILES.flatMap((file) => scan(file, findFeatureStatusAssignments));
    expect(
      offenders,
      `Feature status assignments outside the record:\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('writes no feature.json outside the record or the loader primitive', () => {
    const offenders = SOURCE_FILES.flatMap((file) => scan(file, findDirectFeatureJsonWrites));
    expect(
      offenders,
      `Direct feature.json writes outside the record/loader:\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('passes no Feature status through loader.update payloads outside the record', () => {
    const offenders = SOURCE_FILES.flatMap((file) => scan(file, findLoaderUpdateStatusWrites));
    expect(
      offenders,
      `Feature status written through loader.update payloads outside the record:\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('has deleted the FeatureStatusWithPipeline alias everywhere', () => {
    const offenders = SOURCE_FILES.filter(
      (file) =>
        scan(file, (source) => (source.includes('FeatureStatusWithPipeline') ? ['found'] : []))
          .length > 0
    );
    expect(
      offenders,
      `FeatureStatusWithPipeline still referenced in:\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});

describe('Feature single writer guard fixtures', () => {
  it('flags Feature status assignments', () => {
    expect(
      findFeatureStatusAssignments(`feature.status = status;`, 'apps/server/src/other.ts')
    ).toHaveLength(1);
    expect(
      findFeatureStatusAssignments(
        `updatedFeature.status = 'verified';`,
        'apps/server/src/other.ts'
      )
    ).toHaveLength(1);
    expect(
      findFeatureStatusAssignments(`currentFeature.status = 'ready';`, 'apps/server/src/other.ts')
    ).toHaveLength(1);
  });

  it('flags a lifecycle literal assigned to a generic receiver', () => {
    expect(
      findFeatureStatusAssignments(`card.status = 'completed';`, 'apps/server/src/other.ts')
    ).toHaveLength(1);
  });

  it('ignores task, planSpec and session status writes', () => {
    const source = [
      `task.status = 'completed';`,
      `feature.planSpec.status = 'pending';`,
      `activeSession.session.status = 'completed';`,
      `step.status = 'active';`,
    ].join('\n');
    expect(findFeatureStatusAssignments(source, 'apps/server/src/other.ts')).toEqual([]);
  });

  it('allows the record to assign the Feature status', () => {
    expect(findFeatureStatusAssignments(`feature.status = target;`, RECORD_PATH)).toEqual([]);
  });

  it('flags a direct feature.json write', () => {
    const source = `await atomicWriteJson(path.join(featureDir, 'feature.json'), feature, opts);`;
    expect(findDirectFeatureJsonWrites(source, 'apps/server/src/other.ts')).toHaveLength(1);
  });

  it('flags a feature.json write through getFeatureJsonPath', () => {
    const source = `await atomicWriteJson(loader.getFeatureJsonPath(projectPath, featureId), feature);`;
    expect(findDirectFeatureJsonWrites(source, 'apps/server/src/other.ts')).toHaveLength(1);
  });

  it('flags a feature.json write through a path variable', () => {
    const source = [
      `const featurePath = path.join(featureDir, 'feature.json');`,
      `await atomicWriteJson(featurePath, feature, opts);`,
    ].join('\n');
    expect(findDirectFeatureJsonWrites(source, 'apps/server/src/other.ts')).toHaveLength(1);
  });

  it('allows writes to unrelated JSON files', () => {
    const source = [
      `const pipelinePath = path.join(dir, 'pipeline.json');`,
      `await atomicWriteJson(pipelinePath, config, opts);`,
    ].join('\n');
    expect(findDirectFeatureJsonWrites(source, 'apps/server/src/other.ts')).toEqual([]);
  });

  it('allows the record and loader to write feature.json', () => {
    const source = `await atomicWriteJson(this.getFeatureJsonPath(projectPath, featureId), feature);`;
    expect(findDirectFeatureJsonWrites(source, RECORD_PATH)).toEqual([]);
    expect(findDirectFeatureJsonWrites(source, LOADER_PATH)).toEqual([]);
  });

  it('flags a loader.update payload carrying a status field', () => {
    const source = `await featureLoader.update(projectPath, featureId, { status: 'completed' });`;
    expect(findLoaderUpdateStatusWrites(source, 'apps/server/src/other.ts')).toHaveLength(1);
  });

  it('flags shorthand status in a loader.update payload', () => {
    expect(
      findLoaderUpdateStatusWrites(
        `await loader.update(p, id, { status });`,
        'apps/server/src/other.ts'
      )
    ).toHaveLength(1);
  });

  it('ignores a loader.update payload without a status field', () => {
    expect(
      findLoaderUpdateStatusWrites(
        `await featureLoader.update(p, id, { title: 'x', updatedAt: now });`,
        'apps/server/src/other.ts'
      )
    ).toEqual([]);
  });

  it('allows the record and loader to pass status to update', () => {
    const source = `await featureLoader.update(p, id, { status: 'x' });`;
    expect(findLoaderUpdateStatusWrites(source, RECORD_PATH)).toEqual([]);
    expect(findLoaderUpdateStatusWrites(source, LOADER_PATH)).toEqual([]);
  });
});

describe('FeatureLoader runtime status guard', () => {
  it('throws when update is handed a status, naming the record', async () => {
    const loader = new FeatureLoader();
    await expect(
      loader.update('/nonexistent-project', 'feature-guard', { status: 'backlog' })
    ).rejects.toThrow(/FeatureRecord\.transition/);
  });

  it('proceeds past the guard for a status-free update', async () => {
    const loader = new FeatureLoader();
    await expect(
      loader.update('/nonexistent-project', 'feature-guard', { title: 'x' })
    ).rejects.toThrow(/not found/);
  });
});
