/**
 * Setup routes - HTTP API for CLI detection, API keys, and platform info
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createClaudeStatusHandler } from './routes/claude-status.js';
import { createInstallClaudeHandler } from './routes/install-claude.js';
import { createAuthClaudeHandler } from './routes/auth-claude.js';
import { createStoreApiKeyHandler } from './routes/store-api-key.js';
import { createDeleteApiKeyHandler } from './routes/delete-api-key.js';
import { createApiKeysHandler } from './routes/api-keys.js';
import { createPlatformHandler } from './routes/platform.js';
import { createVerifyClaudeAuthHandler } from './routes/verify-claude-auth.js';
import { createVerifyCodexAuthHandler } from './routes/verify-codex-auth.js';
import { createGhStatusHandler } from './routes/gh-status.js';
import { createCursorStatusHandler } from './routes/cursor-status.js';
import { createCodexStatusHandler } from './routes/codex-status.js';
import { createInstallCodexHandler } from './routes/install-codex.js';
import { createAuthCodexHandler } from './routes/auth-codex.js';
import { createAuthCursorHandler } from './routes/auth-cursor.js';
import { createDeauthClaudeHandler } from './routes/deauth-claude.js';
import { createDeauthCodexHandler } from './routes/deauth-codex.js';
import { createDeauthCursorHandler } from './routes/deauth-cursor.js';
import { createAuthOpencodeHandler } from './routes/auth-opencode.js';
import { createDeauthOpencodeHandler } from './routes/deauth-opencode.js';
import { createOpencodeStatusHandler } from './routes/opencode-status.js';
import { createGeminiStatusHandler } from './routes/gemini-status.js';
import { createAuthGeminiHandler } from './routes/auth-gemini.js';
import { createDeauthGeminiHandler } from './routes/deauth-gemini.js';
import { createCopilotStatusHandler } from './routes/copilot-status.js';
import { createAuthCopilotHandler } from './routes/auth-copilot.js';
import { createDeauthCopilotHandler } from './routes/deauth-copilot.js';
import {
  createGetCopilotModelsHandler,
  createRefreshCopilotModelsHandler,
  createClearCopilotCacheHandler,
} from './routes/copilot-models.js';
import {
  createGetOpencodeModelsHandler,
  createRefreshOpencodeModelsHandler,
  createGetOpencodeProvidersHandler,
  createClearOpencodeCacheHandler,
} from './routes/opencode-models.js';
import {
  createGetCursorConfigHandler,
  createSetCursorDefaultModelHandler,
  createSetCursorModelsHandler,
  createGetCursorPermissionsHandler,
  createApplyPermissionProfileHandler,
  createSetCustomPermissionsHandler,
  createDeleteProjectPermissionsHandler,
  createGetExampleConfigHandler,
} from './routes/cursor-config.js';

export const SETUP_MOUNT = '/api/setup';

/** Create setup operation handlers. */
export function createSetupHandlers(): OperationHandlers {
  return {
    'setup.getClaudeStatus': createClaudeStatusHandler(),
    'setup.installClaude': createInstallClaudeHandler(),
    'setup.authClaude': createAuthClaudeHandler(),
    'setup.deauthClaude': createDeauthClaudeHandler(),
    'setup.storeApiKey': createStoreApiKeyHandler(),
    'setup.deleteApiKey': createDeleteApiKeyHandler(),
    'setup.getApiKeys': createApiKeysHandler(),
    'setup.getPlatform': createPlatformHandler(),
    'setup.verifyClaudeAuth': createVerifyClaudeAuthHandler(),
    'setup.verifyCodexAuth': createVerifyCodexAuthHandler(),
    'setup.getGhStatus': createGhStatusHandler(),
    'setup.getCursorStatus': createCursorStatusHandler(),
    'setup.authCursor': createAuthCursorHandler(),
    'setup.deauthCursor': createDeauthCursorHandler(),
    'setup.getCodexStatus': createCodexStatusHandler(),
    'setup.installCodex': createInstallCodexHandler(),
    'setup.authCodex': createAuthCodexHandler(),
    'setup.deauthCodex': createDeauthCodexHandler(),
    'setup.getOpencodeStatus': createOpencodeStatusHandler(),
    'setup.authOpencode': createAuthOpencodeHandler(),
    'setup.deauthOpencode': createDeauthOpencodeHandler(),
    'setup.getGeminiStatus': createGeminiStatusHandler(),
    'setup.authGemini': createAuthGeminiHandler(),
    'setup.deauthGemini': createDeauthGeminiHandler(),
    'setup.getCopilotStatus': createCopilotStatusHandler(),
    'setup.authCopilot': createAuthCopilotHandler(),
    'setup.deauthCopilot': createDeauthCopilotHandler(),
    'setup.getCopilotModels': createGetCopilotModelsHandler(),
    'setup.refreshCopilotModels': createRefreshCopilotModelsHandler(),
    'setup.clearCopilotCache': createClearCopilotCacheHandler(),
    'setup.getOpencodeModels': createGetOpencodeModelsHandler(),
    'setup.refreshOpencodeModels': createRefreshOpencodeModelsHandler(),
    'setup.getOpencodeProviders': createGetOpencodeProvidersHandler(),
    'setup.clearOpencodeCache': createClearOpencodeCacheHandler(),
    'setup.getCursorConfig': createGetCursorConfigHandler(),
    'setup.setCursorDefaultModel': createSetCursorDefaultModelHandler(),
    'setup.setCursorModels': createSetCursorModelsHandler(),
    'setup.getCursorPermissions': createGetCursorPermissionsHandler(),
    'setup.applyCursorPermissionProfile': createApplyPermissionProfileHandler(),
    'setup.setCursorCustomPermissions': createSetCustomPermissionsHandler(),
    'setup.deleteCursorProjectPermissions': createDeleteProjectPermissionsHandler(),
    'setup.getCursorExampleConfig': createGetExampleConfigHandler(),
  };
}

export function createSetupRoutes(): Router {
  return registerContractOperations(Router(), SETUP_MOUNT, createSetupHandlers());
}
