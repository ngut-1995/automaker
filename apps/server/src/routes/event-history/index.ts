/**
 * Event History routes - HTTP API for event history management
 *
 * Provides endpoints for:
 * - Listing events with filtering
 * - Getting individual event details
 * - Deleting events
 * - Clearing all events
 * - Replaying events to test hooks
 *
 * Mounted at /api/event-history in the main server.
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import type { EventHistoryService } from '../../services/event-history-service.js';
import type { SettingsService } from '../../services/settings-service.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createListHandler } from './routes/list.js';
import { createGetHandler } from './routes/get.js';
import { createDeleteHandler } from './routes/delete.js';
import { createClearHandler } from './routes/clear.js';
import { createReplayHandler } from './routes/replay.js';

export const EVENT_HISTORY_MOUNT = '/api/event-history';

/** Create event history operation handlers. */
export function createEventHistoryHandlers(
  eventHistoryService: EventHistoryService,
  settingsService: SettingsService
): OperationHandlers {
  return {
    'eventHistory.list': createListHandler(eventHistoryService),
    'eventHistory.get': createGetHandler(eventHistoryService),
    'eventHistory.delete': createDeleteHandler(eventHistoryService),
    'eventHistory.clear': createClearHandler(eventHistoryService),
    'eventHistory.replay': createReplayHandler(eventHistoryService, settingsService),
  };
}

/**
 * Create event history router with all endpoints.
 *
 * @param eventHistoryService - Instance of EventHistoryService
 * @param settingsService - Instance of SettingsService (for replay)
 */
export function createEventHistoryRoutes(
  eventHistoryService: EventHistoryService,
  settingsService: SettingsService
): Router {
  return registerContractOperations(
    Router(),
    EVENT_HISTORY_MOUNT,
    createEventHistoryHandlers(eventHistoryService, settingsService)
  );
}
