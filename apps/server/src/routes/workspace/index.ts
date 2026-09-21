/**
 * Workspace routes
 * Provides API endpoints for workspace directory management
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createConfigHandler } from './routes/config.js';
import { createDirectoriesHandler } from './routes/directories.js';

export const WORKSPACE_MOUNT = '/api/workspace';

export function createWorkspaceHandlers(): OperationHandlers {
  return {
    'workspace.config': createConfigHandler(),
    'workspace.directories': createDirectoriesHandler(),
  };
}

export function createWorkspaceRoutes(): Router {
  return registerContractOperations(Router(), WORKSPACE_MOUNT, createWorkspaceHandlers());
}
