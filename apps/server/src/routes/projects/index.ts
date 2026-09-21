/**
 * Projects routes - HTTP API for multi-project overview and management
 *
 * Every operation is registered from the shared operation contract; this file
 * maps each to its handler.
 */

import { Router } from 'express';
import type { FeatureLoader } from '../../services/feature-loader.js';
import type { FacadeProvider, GlobalAutoModeService } from '../../services/auto-mode/index.js';
import type { SettingsService } from '../../services/settings-service.js';
import type { NotificationService } from '../../services/notification-service.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createOverviewHandler } from './routes/overview.js';

export const PROJECTS_MOUNT = '/api/projects';

export function createProjectsHandlers(
  featureLoader: FeatureLoader,
  global: GlobalAutoModeService,
  getFacade: FacadeProvider,
  settingsService: SettingsService,
  notificationService: NotificationService
): OperationHandlers {
  return {
    'projects.getOverview': createOverviewHandler(
      featureLoader,
      global,
      getFacade,
      settingsService,
      notificationService
    ),
  };
}

export function createProjectsRoutes(
  featureLoader: FeatureLoader,
  global: GlobalAutoModeService,
  getFacade: FacadeProvider,
  settingsService: SettingsService,
  notificationService: NotificationService
): Router {
  return registerContractOperations(
    Router(),
    PROJECTS_MOUNT,
    createProjectsHandlers(featureLoader, global, getFacade, settingsService, notificationService)
  );
}
