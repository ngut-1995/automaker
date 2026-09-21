/**
 * Models routes - HTTP API for model providers and availability
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createAvailableHandler } from './routes/available.js';
import { createProvidersHandler } from './routes/providers.js';

export const MODELS_MOUNT = '/api/models';

export function createModelsHandlers(): OperationHandlers {
  return {
    'models.available': createAvailableHandler(),
    'models.providers': createProvidersHandler(),
  };
}

export function createModelsRoutes(): Router {
  return registerContractOperations(Router(), MODELS_MOUNT, createModelsHandlers());
}
