/**
 * Sessions routes - HTTP API for session management
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import { AgentService } from '../../services/agent-service.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createIndexHandler } from './routes/index.js';
import { createCreateHandler } from './routes/create.js';
import { createUpdateHandler } from './routes/update.js';
import { createArchiveHandler } from './routes/archive.js';
import { createUnarchiveHandler } from './routes/unarchive.js';
import { createDeleteHandler } from './routes/delete.js';

export const SESSIONS_MOUNT = '/api/sessions';

/** Create sessions operation handlers. */
export function createSessionsHandlers(agentService: AgentService): OperationHandlers {
  return {
    'sessions.list': createIndexHandler(agentService),
    'sessions.create': createCreateHandler(agentService),
    'sessions.update': createUpdateHandler(agentService),
    'sessions.archive': createArchiveHandler(agentService),
    'sessions.unarchive': createUnarchiveHandler(agentService),
    'sessions.delete': createDeleteHandler(agentService),
  };
}

export function createSessionsRoutes(agentService: AgentService): Router {
  return registerContractOperations(Router(), SESSIONS_MOUNT, createSessionsHandlers(agentService));
}
