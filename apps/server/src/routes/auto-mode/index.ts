/**
 * Auto Mode routes - HTTP API for autonomous feature implementation
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 *
 * Handlers take what they actually need: global status/questions go to
 * GlobalAutoModeService, while per-project execution goes through a facade
 * provider owned by the composition root.
 */

import { Router } from 'express';
import type { FacadeProvider, GlobalAutoModeService } from '../../services/auto-mode/index.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createStopFeatureHandler } from './routes/stop-feature.js';
import { createStatusHandler } from './routes/status.js';
import { createRunFeatureHandler } from './routes/run-feature.js';
import { createStartHandler } from './routes/start.js';
import { createStopHandler } from './routes/stop.js';
import { createVerifyFeatureHandler } from './routes/verify-feature.js';
import { createResumeFeatureHandler } from './routes/resume-feature.js';
import { createContextExistsHandler } from './routes/context-exists.js';
import { createAnalyzeProjectHandler } from './routes/analyze-project.js';
import { createFollowUpFeatureHandler } from './routes/follow-up-feature.js';
import { createCommitFeatureHandler } from './routes/commit-feature.js';
import { createApprovePlanHandler } from './routes/approve-plan.js';
import { createResumeInterruptedHandler } from './routes/resume-interrupted.js';
import { createReconcileHandler } from './routes/reconcile.js';

export const AUTO_MODE_MOUNT = '/api/auto-mode';

/**
 * Create auto-mode operation handlers.
 *
 * @param global - GlobalAutoModeService for status and state reconciliation
 * @param getFacade - Provider for the per-project facade
 */
export function createAutoModeHandlers(
  global: GlobalAutoModeService,
  getFacade: FacadeProvider
): OperationHandlers {
  return {
    'autoMode.start': createStartHandler(getFacade),
    'autoMode.stop': createStopHandler(getFacade),
    'autoMode.stopFeature': createStopFeatureHandler(global, getFacade),
    'autoMode.status': createStatusHandler(global, getFacade),
    'autoMode.runFeature': createRunFeatureHandler(getFacade),
    'autoMode.verifyFeature': createVerifyFeatureHandler(getFacade),
    'autoMode.resumeFeature': createResumeFeatureHandler(getFacade),
    'autoMode.contextExists': createContextExistsHandler(getFacade),
    'autoMode.analyzeProject': createAnalyzeProjectHandler(getFacade),
    'autoMode.followUpFeature': createFollowUpFeatureHandler(getFacade),
    'autoMode.commitFeature': createCommitFeatureHandler(getFacade),
    'autoMode.approvePlan': createApprovePlanHandler(getFacade),
    'autoMode.resumeInterrupted': createResumeInterruptedHandler(getFacade),
    'autoMode.reconcile': createReconcileHandler(global),
  };
}

export function createAutoModeRoutes(
  global: GlobalAutoModeService,
  getFacade: FacadeProvider
): Router {
  return registerContractOperations(
    Router(),
    AUTO_MODE_MOUNT,
    createAutoModeHandlers(global, getFacade)
  );
}
