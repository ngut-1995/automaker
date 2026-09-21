/**
 * Agent routes - HTTP API for Claude agent interactions
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import { AgentService } from '../../services/agent-service.js';
import type { EventEmitter } from '../../lib/events.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createStartHandler } from './routes/start.js';
import { createSendHandler } from './routes/send.js';
import { createHistoryHandler } from './routes/history.js';
import { createStopHandler } from './routes/stop.js';
import { createClearHandler } from './routes/clear.js';
import { createModelHandler } from './routes/model.js';
import { createQueueAddHandler } from './routes/queue-add.js';
import { createQueueListHandler } from './routes/queue-list.js';
import { createQueueRemoveHandler } from './routes/queue-remove.js';
import { createQueueClearHandler } from './routes/queue-clear.js';

export const AGENT_MOUNT = '/api/agent';

/** Create agent operation handlers. */
export function createAgentHandlers(agentService: AgentService): OperationHandlers {
  return {
    'agent.start': createStartHandler(agentService),
    'agent.send': createSendHandler(agentService),
    'agent.getHistory': createHistoryHandler(agentService),
    'agent.stop': createStopHandler(agentService),
    'agent.clear': createClearHandler(agentService),
    'agent.model': createModelHandler(agentService),
    'agent.queueAdd': createQueueAddHandler(agentService),
    'agent.queueList': createQueueListHandler(agentService),
    'agent.queueRemove': createQueueRemoveHandler(agentService),
    'agent.queueClear': createQueueClearHandler(agentService),
  };
}

export function createAgentRoutes(agentService: AgentService, _events: EventEmitter): Router {
  return registerContractOperations(Router(), AGENT_MOUNT, createAgentHandlers(agentService));
}
