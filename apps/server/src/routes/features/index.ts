/**
 * Features routes - HTTP API for feature management
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import { FeatureLoader } from '../../services/feature-loader.js';
import type { SettingsService } from '../../services/settings-service.js';
import type { FacadeProvider } from '../../services/auto-mode/index.js';
import type { FeatureTransitioner } from '../../services/feature-record.js';
import type { EventEmitter } from '../../lib/events.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createListHandler } from './routes/list.js';
import { createGetHandler } from './routes/get.js';
import { createCreateHandler } from './routes/create.js';
import { createUpdateHandler } from './routes/update.js';
import { createBulkUpdateHandler } from './routes/bulk-update.js';
import { createBulkDeleteHandler } from './routes/bulk-delete.js';
import { createDeleteHandler } from './routes/delete.js';
import { createAgentOutputHandler, createRawOutputHandler } from './routes/agent-output.js';
import { createGenerateTitleHandler } from './routes/generate-title.js';
import { createExportHandler } from './routes/export.js';
import { createImportHandler, createConflictCheckHandler } from './routes/import.js';
import {
  createOrphanedListHandler,
  createOrphanedResolveHandler,
  createOrphanedBulkResolveHandler,
} from './routes/orphaned.js';

export const FEATURES_MOUNT = '/api/features';

export function createFeaturesHandlers(
  featureLoader: FeatureLoader,
  settingsService?: SettingsService,
  events?: EventEmitter,
  getFacade?: FacadeProvider,
  featureRecord?: FeatureTransitioner
): OperationHandlers {
  const listHandler = createListHandler(featureLoader, getFacade);

  return {
    'features.list': listHandler,
    'features.listPost': listHandler,
    'features.get': createGetHandler(featureLoader),
    'features.create': createCreateHandler(featureLoader, events),
    'features.update': createUpdateHandler(featureLoader, events, featureRecord),
    'features.bulkUpdate': createBulkUpdateHandler(featureLoader, featureRecord),
    'features.bulkDelete': createBulkDeleteHandler(featureLoader),
    'features.delete': createDeleteHandler(featureLoader),
    'features.getAgentOutput': createAgentOutputHandler(featureLoader),
    'features.rawOutput': createRawOutputHandler(featureLoader),
    'features.generateTitle': createGenerateTitleHandler(settingsService),
    'features.export': createExportHandler(featureLoader),
    'features.import': createImportHandler(featureLoader),
    'features.checkConflicts': createConflictCheckHandler(featureLoader),
    'features.getOrphaned': createOrphanedListHandler(featureLoader, getFacade),
    'features.resolveOrphaned': createOrphanedResolveHandler(featureLoader, featureRecord),
    'features.bulkResolveOrphaned': createOrphanedBulkResolveHandler(featureLoader, featureRecord),
  };
}

export function createFeaturesRoutes(
  featureLoader: FeatureLoader,
  settingsService?: SettingsService,
  events?: EventEmitter,
  getFacade?: FacadeProvider,
  featureRecord?: FeatureTransitioner
): Router {
  return registerContractOperations(
    Router(),
    FEATURES_MOUNT,
    createFeaturesHandlers(featureLoader, settingsService, events, getFacade, featureRecord)
  );
}
