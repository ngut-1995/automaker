/**
 * Templates routes
 * Provides API for cloning GitHub starter templates
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createCloneHandler } from './routes/clone.js';

export const TEMPLATES_MOUNT = '/api/templates';

export function createTemplatesHandlers(): OperationHandlers {
  return {
    'templates.clone': createCloneHandler(),
  };
}

export function createTemplatesRoutes(): Router {
  return registerContractOperations(Router(), TEMPLATES_MOUNT, createTemplatesHandlers());
}
