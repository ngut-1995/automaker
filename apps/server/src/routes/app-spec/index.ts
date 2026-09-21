/**
 * Spec Regeneration routes - HTTP API for AI-powered spec generation
 *
 * Every operation is registered from the shared operation contract; this file
 * maps each to its handler.
 */

import { Router } from 'express';
import type { EventEmitter } from '../../lib/events.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createCreateHandler } from './routes/create.js';
import { createGenerateHandler } from './routes/generate.js';
import { createGenerateFeaturesHandler } from './routes/generate-features.js';
import { createSyncHandler } from './routes/sync.js';
import { createStopHandler } from './routes/stop.js';
import { createStatusHandler } from './routes/status.js';
import type { SettingsService } from '../../services/settings-service.js';

export const SPEC_REGENERATION_MOUNT = '/api/spec-regeneration';

export function createSpecRegenerationHandlers(
  events: EventEmitter,
  settingsService?: SettingsService
): OperationHandlers {
  return {
    'specRegeneration.create': createCreateHandler(events),
    'specRegeneration.generate': createGenerateHandler(events, settingsService),
    'specRegeneration.generateFeatures': createGenerateFeaturesHandler(events, settingsService),
    'specRegeneration.sync': createSyncHandler(events, settingsService),
    'specRegeneration.stop': createStopHandler(),
    'specRegeneration.status': createStatusHandler(),
  };
}

export function createSpecRegenerationRoutes(
  events: EventEmitter,
  settingsService?: SettingsService
): Router {
  return registerContractOperations(
    Router(),
    SPEC_REGENERATION_MOUNT,
    createSpecRegenerationHandlers(events, settingsService)
  );
}
