/**
 * Server-side contract conformance.
 *
 * For every migrated mount: every contract entry has a handler, and registering
 * the mount yields exactly one route per entry at the path the contract derives
 * — and nothing else.
 *
 * When a mount is migrated onto the contract, add an `it` block here.
 */

import { describe, it, expect } from 'vitest';
import { Router } from 'express';
import { OPERATIONS, operationNamesForMount } from '@automaker/types';
import {
  createFeaturesRoutes,
  createFeaturesHandlers,
  FEATURES_MOUNT,
} from '@/routes/features/index.js';
import {
  createAutoModeRoutes,
  createAutoModeHandlers,
  AUTO_MODE_MOUNT,
} from '@/routes/auto-mode/index.js';
import {
  createRunningAgentsRoutes,
  createRunningAgentsHandlers,
  RUNNING_AGENTS_MOUNT,
} from '@/routes/running-agents/index.js';
import { registerContractOperations, missingContractHandlers } from '@/routes/contract.js';
import type { OperationHandlers } from '@/routes/contract.js';

interface RegisteredRoute {
  path: string;
  methods: Record<string, boolean>;
}

function registeredRoutes(router: Router): RegisteredRoute[] {
  const stack = (router as unknown as { stack: Array<{ route?: RegisteredRoute }> }).stack;
  return stack.filter((layer) => layer.route).map((layer) => layer.route!);
}

/**
 * Assert that `mount` is fully described by the contract: handler coverage,
 * one route per entry at the derived path, and no route outside the contract.
 */
function expectContractMount(mount: string, handlers: OperationHandlers): void {
  expect(missingContractHandlers(mount, handlers), `missing handlers on ${mount}`).toEqual([]);

  const names = operationNamesForMount(mount);
  expect(names.length, `contract operations on ${mount}`).toBeGreaterThan(0);

  for (const name of names) {
    expect(handlers[name], `handler for ${name}`).toBeTypeOf('function');
  }

  const routes = registeredRoutes(registerContractOperations(Router(), mount, handlers));

  for (const name of names) {
    const definition = OPERATIONS[name];
    const method = definition.method.toLowerCase();
    const match = routes.find(
      (route) => route.path === definition.path && route.methods[method] === true
    );
    expect(match, `${name} -> ${definition.method} ${definition.path}`).toBeDefined();
  }

  const contractPairs = new Set(
    names.map((name) => `${OPERATIONS[name].method.toLowerCase()} ${OPERATIONS[name].path}`)
  );
  for (const route of routes) {
    for (const [method, enabled] of Object.entries(route.methods)) {
      if (!enabled) continue;
      expect(
        contractPairs.has(`${method} ${route.path}`),
        `route outside contract: ${method} ${route.path}`
      ).toBe(true);
    }
  }
}

describe('contract conformance', () => {
  it('features mount', () => {
    const handlers = createFeaturesHandlers({} as never);
    expectContractMount(FEATURES_MOUNT, handlers);
    // The public factory builds the same router.
    expect(registeredRoutes(createFeaturesRoutes({} as never)).length).toBe(
      operationNamesForMount(FEATURES_MOUNT).length
    );
  });

  it('auto-mode mount', () => {
    const handlers = createAutoModeHandlers({} as never);
    expectContractMount(AUTO_MODE_MOUNT, handlers);
    // The public factory builds the same router.
    expect(registeredRoutes(createAutoModeRoutes({} as never)).length).toBe(
      operationNamesForMount(AUTO_MODE_MOUNT).length
    );
  });

  it('running-agents mount', () => {
    const handlers = createRunningAgentsHandlers({} as never);
    expectContractMount(RUNNING_AGENTS_MOUNT, handlers);
    // The public factory builds the same router.
    expect(registeredRoutes(createRunningAgentsRoutes({} as never)).length).toBe(
      operationNamesForMount(RUNNING_AGENTS_MOUNT).length
    );
  });
});
