/**
 * Contract-shape tests: the operation registry is well-formed and its paths are
 * unique by construction. These are the tests that fail when a contract entry
 * is malformed or collides with another.
 */

import { describe, it, expect } from 'vitest';
import {
  OPERATIONS,
  operationPath,
  operationNames,
  operationNamesForMount,
  operationMounts,
  findDuplicateOperations,
  assertUniqueOperations,
} from '../../src/operations.js';
import type { OperationName } from '../../src/operations.js';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
const FEATURES_MOUNT = '/api/features';

describe('operation contract', () => {
  it('declares well-formed entries', () => {
    for (const name of operationNames()) {
      const definition = OPERATIONS[name];
      expect(HTTP_METHODS, `${name} method`).toContain(definition.method);
      expect(definition.mount, `${name} mount`).toMatch(/^\/api(\/|$)/);
      expect(definition.path, `${name} path`).toMatch(/^\//);
      // request/response are type-only placeholders.
      expect(definition.request, `${name} request`).toBeNull();
      expect(definition.response, `${name} response`).toBeNull();
      expect(operationPath(name), `${name} full path`).toBe(
        `${definition.mount}${definition.path}`
      );
    }
  });

  it('has no duplicate method + full path pairs', () => {
    expect(findDuplicateOperations()).toEqual([]);
    expect(() => assertUniqueOperations()).not.toThrow();
  });

  it('names every mount and its operations', () => {
    expect(operationMounts()).toContain(FEATURES_MOUNT);

    const names = operationNamesForMount(FEATURES_MOUNT);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(OPERATIONS[name].mount).toBe(FEATURES_MOUNT);
      expect(name.startsWith('features.')).toBe(true);
    }
  });

  it('resolves operations by name only', () => {
    expect(operationNames()).toContain('features.create' as OperationName);
    expect(OPERATIONS['features.create'].path).toBe('/create');
  });
});
