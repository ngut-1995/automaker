/**
 * GitHub routes - HTTP API for GitHub integration
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import type { EventEmitter } from '../../lib/events.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createCheckGitHubRemoteHandler } from './routes/check-github-remote.js';
import { createListIssuesHandler } from './routes/list-issues.js';
import { createListPRsHandler } from './routes/list-prs.js';
import { createListCommentsHandler } from './routes/list-comments.js';
import { createListPRReviewCommentsHandler } from './routes/list-pr-review-comments.js';
import { createResolvePRCommentHandler } from './routes/resolve-pr-comment.js';
import { createValidateIssueHandler } from './routes/validate-issue.js';
import {
  createValidationStatusHandler,
  createValidationStopHandler,
  createGetValidationsHandler,
  createDeleteValidationHandler,
  createMarkViewedHandler,
} from './routes/validation-endpoints.js';
import type { SettingsService } from '../../services/settings-service.js';

export const GITHUB_MOUNT = '/api/github';

export function createGitHubHandlers(
  events: EventEmitter,
  settingsService?: SettingsService
): OperationHandlers {
  return {
    'github.checkRemote': createCheckGitHubRemoteHandler(),
    'github.listIssues': createListIssuesHandler(),
    'github.listPRs': createListPRsHandler(),
    'github.getIssueComments': createListCommentsHandler(),
    'github.getPRReviewComments': createListPRReviewCommentsHandler(),
    'github.resolveReviewThread': createResolvePRCommentHandler(),
    'github.validateIssue': createValidateIssueHandler(events, settingsService),
    'github.getValidationStatus': createValidationStatusHandler(),
    'github.stopValidation': createValidationStopHandler(),
    'github.getValidations': createGetValidationsHandler(),
    'github.deleteValidation': createDeleteValidationHandler(),
    'github.markValidationViewed': createMarkViewedHandler(events),
  };
}

export function createGitHubRoutes(
  events: EventEmitter,
  settingsService?: SettingsService
): Router {
  return registerContractOperations(
    Router(),
    GITHUB_MOUNT,
    createGitHubHandlers(events, settingsService)
  );
}
