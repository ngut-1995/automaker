/**
 * A structural guard: no fourth place may decide what a model is called on screen.
 *
 * ngut-1995/harbor#38 left one table (`MODEL_DISPLAY_NAMES`) and the Claude tier
 * helper (`getClaudeTierDisplayName`), but the test that pins the table can only
 * see the table. A *new* source of names added elsewhere -- a second table, a
 * second helper -- would pass unnoticed.
 *
 * This test looks, so that one cannot. It scans the source of the application
 * and the shared packages for declarations whose shape says "I name models", and
 * fails on any that is not one of the known, delegating few. It is deliberately
 * about *declarations*, not calls: calling the shared helper from a hundred
 * places is the point; defining a second answer is not.
 *
 * Reverting the unification -- reintroducing a `MODEL_LABELS` table or a
 * `getModelLabel` helper in `apps/ui` -- makes this test fail. That is the
 * non-vacuity ngut-1995/harbor#43 asks for.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** Source roots worth scanning. Only `src`, never `dist` or tests. */
const SOURCE_ROOTS = [
  'apps/ui/src',
  'apps/server/src',
  'libs/types/src',
  'libs/model-resolver/src',
  'libs/utils/src',
  'libs/prompts/src',
  'libs/platform/src',
  'libs/git-utils/src',
  'libs/dependency-resolver/src',
];

/**
 * The declarations allowed to answer "what is this model called".
 *
 * Each delegates to `MODEL_DISPLAY_NAMES` or to the Claude tier helper, or --
 * for the three provider label accessors -- reads the very catalogue the shared
 * table is assembled from. None carries a table of its own. Adding a name here
 * is a claim that a new *source* has been reviewed, which is exactly the
 * decision ngut-1995/harbor#43 wants to force.
 */
const ALLOWED_NAME_FUNCTIONS = new Map<string, string>([
  ['getModelDisplayName', 'libs/types/src/model-display.ts'],
  ['getClaudeTierDisplayName', 'libs/types/src/model-display.ts'],
  ['formatModelName', 'apps/ui/src/lib/agent-context-parser.ts'],
  ['getPhaseModelLabel', 'apps/ui/src/lib/utils.ts'],
  ['getCodexModelLabel', 'libs/types/src/codex-models.ts'],
  ['getCursorModelLabel', 'libs/types/src/cursor-models.ts'],
  ['getOpencodeModelLabel', 'libs/types/src/opencode-models.ts'],
]);

/** Table declarations allowed to hold names, and where. */
const ALLOWED_NAME_TABLES = new Map<string, string>([
  ['MODEL_DISPLAY_NAMES', 'libs/types/src/model-display.ts'],
]);

function sourceFiles(dir: string): string[] {
  const absolute = path.join(REPO_ROOT, dir);
  if (!fs.existsSync(absolute)) return [];

  const files: string[] = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        /\.(ts|tsx)$/.test(entry.name) &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.test.tsx')
      ) {
        files.push(full);
      }
    }
  };
  walk(absolute);
  return files;
}

function relative(file: string): string {
  return path.relative(REPO_ROOT, file);
}

/** The shape of a name the guard treats as a display-name source. */
const NAMING_DECLARATION = /(Model.*(Name|Label)|ClaudeTier.*Name)/;

/** `function foo(` declarations. */
const FUNCTION_DECLARATION = /\bfunction\s+([A-Za-z_$][\w$]*)/g;

/** `const foo = (…) =>` / `const foo = async () =>` arrow declarations. */
const ARROW_DECLARATION =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g;

describe('the one source of model display names', () => {
  it('finds the known naming functions and tables (the guard is not vacuous)', () => {
    const foundFunctions = new Set<string>();
    const foundTables = new Set<string>();

    for (const dir of SOURCE_ROOTS) {
      for (const file of sourceFiles(dir)) {
        const source = fs.readFileSync(file, 'utf8');
        for (const match of [
          ...source.matchAll(FUNCTION_DECLARATION),
          ...source.matchAll(ARROW_DECLARATION),
        ]) {
          if (NAMING_DECLARATION.test(match[1])) {
            foundFunctions.add(match[1]);
          }
        }
        for (const match of source.matchAll(
          /\b(?:const|let|var)\s+([A-Z_]*MODEL[A-Z_]*(?:NAMES|LABELS))\b/g
        )) {
          foundTables.add(match[1]);
        }
      }
    }

    expect([...foundFunctions].sort()).toEqual([...ALLOWED_NAME_FUNCTIONS.keys()].sort());
    expect([...foundTables].sort()).toEqual([...ALLOWED_NAME_TABLES.keys()].sort());
  });

  it('declares each known naming function only where it is allowed', () => {
    for (const [name, allowedFile] of ALLOWED_NAME_FUNCTIONS) {
      const declaration = new RegExp(`(?:\\bfunction\\s+|\\b(?:const|let|var)\\s+)${name}\\b`);
      const declaring = SOURCE_ROOTS.flatMap(sourceFiles)
        .filter((file) => declaration.test(fs.readFileSync(file, 'utf8')))
        .map(relative);

      expect(declaring, name).toEqual([allowedFile]);
    }
  });

  it('declares each known name table only where it is allowed', () => {
    for (const [name, allowedFile] of ALLOWED_NAME_TABLES) {
      const declaration = new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`);
      const declaring = SOURCE_ROOTS.flatMap(sourceFiles)
        .filter((file) => declaration.test(fs.readFileSync(file, 'utf8')))
        .map(relative);

      expect(declaring, name).toEqual([allowedFile]);
    }
  });

  /**
   * Every surface that puts a model name in front of the user, and the shared
   * helper it reads that name from. A surface that grew its own table would stop
   * calling the helper, and this is what notices.
   */
  const NAMING_SURFACES: Record<string, string> = {
    'apps/ui/src/components/views/board-view/components/kanban-card/card-header.tsx':
      'formatModelName',
    'apps/ui/src/components/views/board-view/components/kanban-card/agent-info-panel.tsx':
      'formatModelName',
    'apps/ui/src/components/views/running-agents-view.tsx': 'getModelDisplayName',
    'apps/ui/src/components/views/project-settings-view/project-models-section.tsx':
      'getPhaseModelLabel',
    'apps/ui/src/components/views/project-settings-view/project-bulk-replace-dialog.tsx':
      'getModelDisplayName',
    'apps/ui/src/components/views/settings-view/model-defaults/bulk-replace-dialog.tsx':
      'getModelDisplayName',
  };

  it('pins every surface that names a model to the shared helper', () => {
    for (const [file, helper] of Object.entries(NAMING_SURFACES)) {
      const source = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
      expect(source, `${file} should call ${helper}()`).toContain(`${helper}(`);
    }
  });
});
