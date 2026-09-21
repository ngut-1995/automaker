/**
 * Health check routes
 *
 * NOTE: Only the basic health check (/) and environment check are unauthenticated.
 * The /detailed endpoint requires authentication and is registered directly on the
 * app, outside this contract mount.
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createIndexHandler } from './routes/index.js';
import { createEnvironmentHandler } from './routes/environment.js';

export const HEALTH_MOUNT = '/api/health';

/** Create unauthenticated health operation handlers. */
export function createHealthHandlers(): OperationHandlers {
  return {
    'health.check': createIndexHandler(),
    'health.environment': createEnvironmentHandler(),
  };
}

/**
 * Create unauthenticated health routes (basic check + environment).
 * Used by load balancers and container orchestration.
 */
export function createHealthRoutes(): Router {
  return registerContractOperations(Router(), HEALTH_MOUNT, createHealthHandlers());
}

// Re-export detailed handler for use in authenticated routes
export { createDetailedHandler } from './routes/detailed.js';
