/**
 * Context routes - HTTP API for context file operations
 *
 * Provides endpoints for managing context files including
 * AI-powered image description generation.
 *
 * Every operation is registered from the shared operation contract; this file
 * maps each to its handler.
 */

import { Router } from 'express';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createDescribeImageHandler } from './routes/describe-image.js';
import { createDescribeFileHandler } from './routes/describe-file.js';
import type { SettingsService } from '../../services/settings-service.js';

export const CONTEXT_MOUNT = '/api/context';

/**
 * Create context operation handlers.
 *
 * @param settingsService - Optional settings service for loading autoLoadClaudeMd setting
 */
export function createContextHandlers(settingsService?: SettingsService): OperationHandlers {
  return {
    'context.describeImage': createDescribeImageHandler(settingsService),
    'context.describeFile': createDescribeFileHandler(settingsService),
  };
}

export function createContextRoutes(settingsService?: SettingsService): Router {
  return registerContractOperations(
    Router(),
    CONTEXT_MOUNT,
    createContextHandlers(settingsService)
  );
}
