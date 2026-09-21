/**
 * Contract-backed route registration.
 *
 * A sub-router declares a mapping from operation name to the handler that
 * implements it; this helper walks the contract entries for that mount and
 * wires each one, including its path-param validation. No registration line is
 * written by hand.
 */

import { Router } from 'express';
import type { RequestHandler } from 'express';
import { OPERATIONS, type OperationDefinition, type OperationName } from '@automaker/types';
import { validatePathParams } from '../middleware/validate-paths.js';

/** Handlers for the operations of a single mount, keyed by operation name. */
export type OperationHandlers = Partial<Record<OperationName, RequestHandler>>;

/** Contract operations for a mount that the given handlers do not cover. */
export function missingContractHandlers(
  mount: string,
  handlers: OperationHandlers
): OperationName[] {
  return (Object.keys(OPERATIONS) as OperationName[]).filter(
    (name) => OPERATIONS[name].mount === mount && !handlers[name]
  );
}

/**
 * Register every contract operation for `mount` on `router`.
 *
 * Throws when a contract entry for the mount has no handler, so an omission
 * fails loudly at startup (and in the conformance test) rather than becoming a
 * runtime 404.
 */
export function registerContractOperations(
  router: Router,
  mount: string,
  handlers: OperationHandlers
): Router {
  const missing = missingContractHandlers(mount, handlers);
  if (missing.length > 0) {
    throw new Error(
      `No handler registered for contract operations on ${mount}: ${missing.join(', ')}`
    );
  }

  for (const name of Object.keys(OPERATIONS) as OperationName[]) {
    const definition: OperationDefinition<unknown, unknown> = OPERATIONS[name];
    if (definition.mount !== mount) continue;

    const handler = handlers[name];
    if (!handler) continue;

    const middlewares: RequestHandler[] = [];
    if (definition.pathParams && definition.pathParams.length > 0) {
      middlewares.push(validatePathParams(...definition.pathParams));
    }

    switch (definition.method) {
      case 'GET':
        router.get(definition.path, ...middlewares, handler);
        break;
      case 'POST':
        router.post(definition.path, ...middlewares, handler);
        break;
      case 'PUT':
        router.put(definition.path, ...middlewares, handler);
        break;
      case 'DELETE':
        router.delete(definition.path, ...middlewares, handler);
        break;
    }
  }

  return router;
}
