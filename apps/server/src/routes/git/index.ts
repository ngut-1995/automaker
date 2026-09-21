/**
 * Git routes - HTTP API for git operations (non-worktree)
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createDiffsHandler } from './routes/diffs.js';
import { createFileDiffHandler } from './routes/file-diff.js';
import { createStageFilesHandler } from './routes/stage-files.js';
import { createDetailsHandler } from './routes/details.js';
import { createEnhancedStatusHandler } from './routes/enhanced-status.js';

export const GIT_MOUNT = '/api/git';

export function createGitHandlers(): OperationHandlers {
  return {
    'git.diffs': createDiffsHandler(),
    'git.fileDiff': createFileDiffHandler(),
    'git.stageFiles': createStageFilesHandler(),
    'git.details': createDetailsHandler(),
    'git.enhancedStatus': createEnhancedStatusHandler(),
  };
}

export function createGitRoutes(): Router {
  return registerContractOperations(Router(), GIT_MOUNT, createGitHandlers());
}
