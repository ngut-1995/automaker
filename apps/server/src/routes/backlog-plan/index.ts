/**
 * Backlog Plan routes - HTTP API for AI-assisted backlog modification
 *
 * Every operation is registered from the shared operation contract; this file
 * maps each to its handler.
 */

import { Router } from 'express';
import type { EventEmitter } from '../../lib/events.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createGenerateHandler } from './routes/generate.js';
import { createStopHandler } from './routes/stop.js';
import { createStatusHandler } from './routes/status.js';
import { createApplyHandler } from './routes/apply.js';
import { createClearHandler } from './routes/clear.js';
import type { SettingsService } from '../../services/settings-service.js';

export const BACKLOG_PLAN_MOUNT = '/api/backlog-plan';

export function createBacklogPlanHandlers(
  events: EventEmitter,
  settingsService?: SettingsService
): OperationHandlers {
  return {
    'backlogPlan.generate': createGenerateHandler(events, settingsService),
    'backlogPlan.stop': createStopHandler(),
    'backlogPlan.status': createStatusHandler(),
    'backlogPlan.apply': createApplyHandler(settingsService),
    'backlogPlan.clear': createClearHandler(),
  };
}

export function createBacklogPlanRoutes(
  events: EventEmitter,
  settingsService?: SettingsService
): Router {
  return registerContractOperations(
    Router(),
    BACKLOG_PLAN_MOUNT,
    createBacklogPlanHandlers(events, settingsService)
  );
}
