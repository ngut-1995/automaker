/**
 * Terminal routes with password protection
 *
 * Provides REST API for terminal session management and authentication.
 * WebSocket connections for real-time I/O are handled separately in index.ts.
 *
 * Routes are registered from the shared operation contract; this file maps each
 * operation to its handler and declares the auth middleware that applies to the
 * protected operations.
 */

import { Router } from 'express';
import {
  terminalAuthMiddleware,
  validateTerminalToken,
  isTerminalEnabled,
  isTerminalPasswordRequired,
} from './common.js';
import {
  registerContractOperations,
  type OperationHandlers,
  type OperationMiddleware,
} from '../contract.js';
import { createStatusHandler } from './routes/status.js';
import { createAuthHandler } from './routes/auth.js';
import { createLogoutHandler } from './routes/logout.js';
import { createSessionsListHandler, createSessionsCreateHandler } from './routes/sessions.js';
import { createSessionDeleteHandler } from './routes/session-delete.js';
import { createSessionResizeHandler } from './routes/session-resize.js';
import { createSettingsGetHandler, createSettingsUpdateHandler } from './routes/settings.js';

// Re-export for use in main index.ts
export { validateTerminalToken, isTerminalEnabled, isTerminalPasswordRequired };

export const TERMINAL_MOUNT = '/api/terminal';

export function createTerminalHandlers(): OperationHandlers {
  return {
    'terminal.status': createStatusHandler(),
    'terminal.auth': createAuthHandler(),
    'terminal.logout': createLogoutHandler(),
    'terminal.sessions': createSessionsListHandler(),
    'terminal.createSession': createSessionsCreateHandler(),
    'terminal.deleteSession': createSessionDeleteHandler(),
    'terminal.resizeSession': createSessionResizeHandler(),
    'terminal.getSettings': createSettingsGetHandler(),
    'terminal.updateSettings': createSettingsUpdateHandler(),
  };
}

/** Terminal auth applies to every operation below the public status/auth/logout. */
export function createTerminalMiddleware(): OperationMiddleware {
  return {
    'terminal.sessions': [terminalAuthMiddleware],
    'terminal.createSession': [terminalAuthMiddleware],
    'terminal.deleteSession': [terminalAuthMiddleware],
    'terminal.resizeSession': [terminalAuthMiddleware],
    'terminal.getSettings': [terminalAuthMiddleware],
    'terminal.updateSettings': [terminalAuthMiddleware],
  };
}

export function createTerminalRoutes(): Router {
  return registerContractOperations(
    Router(),
    TERMINAL_MOUNT,
    createTerminalHandlers(),
    createTerminalMiddleware()
  );
}
