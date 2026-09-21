/**
 * Health check routes
 *
 * The basic health check (/) and environment check are unauthenticated and are
 * mounted before the auth middleware. `detailed` requires authentication and is
 * registered on a second router mounted at the same path *after* the auth
 * middleware, preserving the original protection.
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createIndexHandler } from './routes/index.js';
import { createEnvironmentHandler } from './routes/environment.js';
import { createDetailedHandler } from './routes/detailed.js';

export const HEALTH_MOUNT = '/api/health';

/** Create health operation handlers (covers the whole mount). */
export function createHealthHandlers(): OperationHandlers {
  return {
    'health.check': createIndexHandler(),
    'health.environment': createEnvironmentHandler(),
    'health.detailed': createDetailedHandler(),
  };
}

/**
 * Create unauthenticated health routes (basic check + environment).
 * Used by load balancers and container orchestration.
 */
export function createHealthRoutes(): Router {
  return registerContractOperations(
    Router(),
    HEALTH_MOUNT,
    createHealthHandlers(),
    {},
    {
      operations: ['health.check', 'health.environment'],
    }
  );
}

/**
 * Create the authenticated detailed health route. Mounted at `/api/health`
 * *after* the auth middleware, so it keeps its current protection. Registered
 * through the contract helper like every other operation.
 */
export function createHealthDetailedRoutes(): Router {
  return registerContractOperations(
    Router(),
    HEALTH_MOUNT,
    createHealthHandlers(),
    {},
    {
      operations: ['health.detailed'],
    }
  );
}

// Re-export detailed handler for backwards compatibility.
export { createDetailedHandler } from './routes/detailed.js';
