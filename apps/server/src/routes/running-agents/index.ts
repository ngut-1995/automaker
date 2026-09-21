/**
 * Running Agents routes - HTTP API for tracking active agent executions
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import type { AutoModeServiceCompat } from '../../services/auto-mode/index.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createIndexHandler } from './routes/index.js';

export const RUNNING_AGENTS_MOUNT = '/api/running-agents';

/**
 * Create running-agents operation handlers.
 *
 * @param autoModeService - AutoModeServiceCompat instance
 */
export function createRunningAgentsHandlers(
  autoModeService: AutoModeServiceCompat
): OperationHandlers {
  return {
    'runningAgents.getAll': createIndexHandler(autoModeService),
  };
}

export function createRunningAgentsRoutes(autoModeService: AutoModeServiceCompat): Router {
  return registerContractOperations(
    Router(),
    RUNNING_AGENTS_MOUNT,
    createRunningAgentsHandlers(autoModeService)
  );
}
