/**
 * Pipeline routes - HTTP API for pipeline configuration management
 *
 * Provides endpoints for:
 * - Getting pipeline configuration
 * - Saving pipeline configuration
 * - Adding, updating, deleting, and reordering pipeline steps
 *
 * All endpoints use handler factories that receive the PipelineService instance.
 * Mounted at /api/pipeline in the main server.
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import type { PipelineService } from '../../services/pipeline-service.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createGetConfigHandler } from './routes/get-config.js';
import { createSaveConfigHandler } from './routes/save-config.js';
import { createAddStepHandler } from './routes/add-step.js';
import { createUpdateStepHandler } from './routes/update-step.js';
import { createDeleteStepHandler } from './routes/delete-step.js';
import { createReorderStepsHandler } from './routes/reorder-steps.js';

export const PIPELINE_MOUNT = '/api/pipeline';

/** Create pipeline operation handlers. */
export function createPipelineHandlers(pipelineService: PipelineService): OperationHandlers {
  return {
    'pipeline.getConfig': createGetConfigHandler(pipelineService),
    'pipeline.saveConfig': createSaveConfigHandler(pipelineService),
    'pipeline.addStep': createAddStepHandler(pipelineService),
    'pipeline.updateStep': createUpdateStepHandler(pipelineService),
    'pipeline.deleteStep': createDeleteStepHandler(pipelineService),
    'pipeline.reorderSteps': createReorderStepsHandler(pipelineService),
  };
}

/**
 * Create pipeline router with all endpoints.
 *
 * @param pipelineService - Instance of PipelineService for file I/O
 */
export function createPipelineRoutes(pipelineService: PipelineService): Router {
  return registerContractOperations(
    Router(),
    PIPELINE_MOUNT,
    createPipelineHandlers(pipelineService)
  );
}
