/**
 * Notifications routes - HTTP API for project-level notifications
 *
 * Provides endpoints for:
 * - Listing notifications
 * - Getting unread count
 * - Marking notifications as read
 * - Dismissing notifications
 *
 * All endpoints use handler factories that receive the NotificationService instance.
 * Mounted at /api/notifications in the main server.
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import type { NotificationService } from '../../services/notification-service.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createListHandler } from './routes/list.js';
import { createUnreadCountHandler } from './routes/unread-count.js';
import { createMarkReadHandler } from './routes/mark-read.js';
import { createDismissHandler } from './routes/dismiss.js';

export const NOTIFICATIONS_MOUNT = '/api/notifications';

/** Create notifications operation handlers. */
export function createNotificationsHandlers(
  notificationService: NotificationService
): OperationHandlers {
  return {
    'notifications.list': createListHandler(notificationService),
    'notifications.unreadCount': createUnreadCountHandler(notificationService),
    'notifications.markRead': createMarkReadHandler(notificationService),
    'notifications.dismiss': createDismissHandler(notificationService),
  };
}

/**
 * Create notifications router with all endpoints.
 *
 * @param notificationService - Instance of NotificationService
 */
export function createNotificationsRoutes(notificationService: NotificationService): Router {
  return registerContractOperations(
    Router(),
    NOTIFICATIONS_MOUNT,
    createNotificationsHandlers(notificationService)
  );
}
