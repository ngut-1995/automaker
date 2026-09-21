/**
 * Server-side contract conformance: every contract operation for a mount has a
 * handler, and registering the mount yields exactly one route per entry at the
 * path the contract derives.
 */

import { describe, it, expect } from 'vitest';
import { OPERATIONS, operationNamesForMount } from '@automaker/types';
import { createFeaturesRoutes } from '@/routes/features/index.js';
import { FEATURES_MOUNT, createFeaturesHandlers } from '@/routes/features/index.js';
import { missingContractHandlers } from '@/routes/contract.js';

interface RegisteredRoute {
  path: string;
  methods: Record<string, boolean>;
}

function registeredRoutes(router: unknown): RegisteredRoute[] {
  const stack = (router as { stack: Array<{ route?: RegisteredRoute }> }).stack;
  return stack.filter((layer) => layer.route).map((layer) => layer.route!);
}

describe('features contract conformance', () => {
  it('has a handler for every features contract entry', () => {
    const handlers = createFeaturesHandlers({} as never);
    expect(missingContractHandlers(FEATURES_MOUNT, handlers)).toEqual([]);

    for (const name of operationNamesForMount(FEATURES_MOUNT)) {
      expect(handlers[name], `handler for ${name}`).toBeTypeOf('function');
    }
  });

  it('registers exactly one route per contract entry at its derived path', () => {
    const routes = registeredRoutes(createFeaturesRoutes({} as never));

    for (const name of operationNamesForMount(FEATURES_MOUNT)) {
      const definition = OPERATIONS[name];
      const method = definition.method.toLowerCase();
      const match = routes.find(
        (route) => route.path === definition.path && route.methods[method] === true
      );
      expect(match, `${name} -> ${definition.method} ${definition.path}`).toBeDefined();
    }

    // No route is registered outside the contract.
    const contractPairs = new Set(
      operationNamesForMount(FEATURES_MOUNT).map(
        (name) => `${OPERATIONS[name].method.toLowerCase()} ${OPERATIONS[name].path}`
      )
    );
    for (const route of routes) {
      for (const [method, enabled] of Object.entries(route.methods)) {
        if (!enabled) continue;
        expect(contractPairs.has(`${method} ${route.path}`)).toBe(true);
      }
    }
  });
});
