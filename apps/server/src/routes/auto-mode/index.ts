/**
 * Auto Mode routes - HTTP API for autonomous feature implementation
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 *
 * Uses AutoModeServiceCompat which provides the old interface while
 * delegating to GlobalAutoModeService and per-project facades.
 */

import { Router } from 'express';
import type { AutoModeServiceCompat } from '../../services/auto-mode/index.js';
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
 * @param autoModeService - AutoModeServiceCompat instance
 */
export function createAutoModeHandlers(autoModeService: AutoModeServiceCompat): OperationHandlers {
  return {
    'autoMode.start': createStartHandler(autoModeService),
    'autoMode.stop': createStopHandler(autoModeService),
    'autoMode.stopFeature': createStopFeatureHandler(autoModeService),
    'autoMode.status': createStatusHandler(autoModeService),
    'autoMode.runFeature': createRunFeatureHandler(autoModeService),
    'autoMode.verifyFeature': createVerifyFeatureHandler(autoModeService),
    'autoMode.resumeFeature': createResumeFeatureHandler(autoModeService),
    'autoMode.contextExists': createContextExistsHandler(autoModeService),
    'autoMode.analyzeProject': createAnalyzeProjectHandler(autoModeService),
    'autoMode.followUpFeature': createFollowUpFeatureHandler(autoModeService),
    'autoMode.commitFeature': createCommitFeatureHandler(autoModeService),
    'autoMode.approvePlan': createApprovePlanHandler(autoModeService),
    'autoMode.resumeInterrupted': createResumeInterruptedHandler(autoModeService),
    'autoMode.reconcile': createReconcileHandler(autoModeService),
  };
}

export function createAutoModeRoutes(autoModeService: AutoModeServiceCompat): Router {
  return registerContractOperations(
    Router(),
    AUTO_MODE_MOUNT,
    createAutoModeHandlers(autoModeService)
  );
}
