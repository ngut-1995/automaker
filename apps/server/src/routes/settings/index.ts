/**
 * Settings routes - HTTP API for persistent file-based settings
 *
 * Provides endpoints for:
 * - Status checking (migration readiness)
 * - Global settings CRUD
 * - Credentials management
 * - Project-specific settings
 * - localStorage to file migration
 *
 * Every operation is registered from the shared operation contract; this file
 * maps each to its handler.
 */

import { Router } from 'express';
import type { SettingsService } from '../../services/settings-service.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createGetGlobalHandler } from './routes/get-global.js';
import { createUpdateGlobalHandler } from './routes/update-global.js';
import { createGetCredentialsHandler } from './routes/get-credentials.js';
import { createUpdateCredentialsHandler } from './routes/update-credentials.js';
import { createGetProjectHandler } from './routes/get-project.js';
import { createUpdateProjectHandler } from './routes/update-project.js';
import { createMigrateHandler } from './routes/migrate.js';
import { createStatusHandler } from './routes/status.js';
import { createDiscoverAgentsHandler } from './routes/discover-agents.js';

export const SETTINGS_MOUNT = '/api/settings';

/**
 * Create settings operation handlers.
 *
 * @param settingsService - Instance of SettingsService for file I/O
 */
export function createSettingsHandlers(settingsService: SettingsService): OperationHandlers {
  return {
    'settings.getStatus': createStatusHandler(settingsService),
    'settings.getGlobal': createGetGlobalHandler(settingsService),
    'settings.updateGlobal': createUpdateGlobalHandler(settingsService),
    'settings.getCredentials': createGetCredentialsHandler(settingsService),
    'settings.updateCredentials': createUpdateCredentialsHandler(settingsService),
    'settings.getProject': createGetProjectHandler(settingsService),
    'settings.updateProject': createUpdateProjectHandler(settingsService),
    'settings.migrate': createMigrateHandler(settingsService),
    'settings.discoverAgents': createDiscoverAgentsHandler(),
  };
}

export function createSettingsRoutes(settingsService: SettingsService): Router {
  return registerContractOperations(
    Router(),
    SETTINGS_MOUNT,
    createSettingsHandlers(settingsService)
  );
}
