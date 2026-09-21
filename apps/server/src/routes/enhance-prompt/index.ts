/**
 * Enhance prompt routes - HTTP API for AI-powered text enhancement
 *
 * Provides endpoints for enhancing user input text using Claude AI
 * with different enhancement modes (improve, expand, simplify, etc.)
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import type { SettingsService } from '../../services/settings-service.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createEnhanceHandler } from './routes/enhance.js';

export const ENHANCE_PROMPT_MOUNT = '/api/enhance-prompt';

/** Create enhance-prompt operation handlers. */
export function createEnhancePromptHandlers(settingsService?: SettingsService): OperationHandlers {
  return {
    'enhancePrompt.enhance': createEnhanceHandler(settingsService),
  };
}

/**
 * Create the enhance-prompt router
 *
 * @param settingsService - Settings service for loading custom prompts
 * @returns Express router with enhance-prompt endpoints
 */
export function createEnhancePromptRoutes(settingsService?: SettingsService): Router {
  return registerContractOperations(
    Router(),
    ENHANCE_PROMPT_MOUNT,
    createEnhancePromptHandlers(settingsService)
  );
}
