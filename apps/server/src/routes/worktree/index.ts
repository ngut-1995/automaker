/**
 * Worktree routes - HTTP API for git worktree operations
 *
 * The lifecycle operations are registered from the shared operation contract;
 * this file maps each to its handler and keeps the git/PR operations that have
 * not been migrated yet hand-registered.
 */

import { Router } from 'express';
import type { EventEmitter } from '../../lib/events.js';
import { validatePathParams } from '../../middleware/validate-paths.js';
import { requireValidWorktree, requireValidProject, requireGitRepoOnly } from './middleware.js';
import {
  registerContractOperations,
  type OperationHandlers,
  type OperationMiddleware,
} from '../contract.js';
import { createInfoHandler } from './routes/info.js';
import { createStatusHandler } from './routes/status.js';
import { createListHandler } from './routes/list.js';
import { createDiffsHandler } from './routes/diffs.js';
import { createFileDiffHandler } from './routes/file-diff.js';
import { createMergeHandler } from './routes/merge.js';
import { createCreateHandler } from './routes/create.js';
import { createDeleteHandler } from './routes/delete.js';
import { createCreatePRHandler } from './routes/create-pr.js';
import { createPRInfoHandler } from './routes/pr-info.js';
import { createCommitHandler } from './routes/commit.js';
import { createGenerateCommitMessageHandler } from './routes/generate-commit-message.js';
import { createPushHandler } from './routes/push.js';
import { createPullHandler } from './routes/pull.js';
import { createCheckoutBranchHandler } from './routes/checkout-branch.js';
import { createListBranchesHandler } from './routes/list-branches.js';
import { createSwitchBranchHandler } from './routes/switch-branch.js';
import {
  createOpenInEditorHandler,
  createGetDefaultEditorHandler,
  createGetAvailableEditorsHandler,
  createRefreshEditorsHandler,
} from './routes/open-in-editor.js';
import {
  createOpenInTerminalHandler,
  createGetAvailableTerminalsHandler,
  createGetDefaultTerminalHandler,
  createRefreshTerminalsHandler,
  createOpenInExternalTerminalHandler,
} from './routes/open-in-terminal.js';
import { createInitGitHandler } from './routes/init-git.js';
import { createMigrateHandler } from './routes/migrate.js';
import { createStartDevHandler } from './routes/start-dev.js';
import { createStopDevHandler } from './routes/stop-dev.js';
import { createListDevServersHandler } from './routes/list-dev-servers.js';
import { createGetDevServerLogsHandler } from './routes/dev-server-logs.js';
import { createStartTestsHandler } from './routes/start-tests.js';
import { createStopTestsHandler } from './routes/stop-tests.js';
import { createGetTestLogsHandler } from './routes/test-logs.js';
import {
  createGetInitScriptHandler,
  createPutInitScriptHandler,
  createDeleteInitScriptHandler,
  createRunInitScriptHandler,
} from './routes/init-script.js';
import { createCommitLogHandler } from './routes/commit-log.js';
import { createDiscardChangesHandler } from './routes/discard-changes.js';
import { createListRemotesHandler } from './routes/list-remotes.js';
import { createAddRemoteHandler } from './routes/add-remote.js';
import { createStashPushHandler } from './routes/stash-push.js';
import { createStashListHandler } from './routes/stash-list.js';
import { createStashApplyHandler } from './routes/stash-apply.js';
import { createStashDropHandler } from './routes/stash-drop.js';
import { createCherryPickHandler } from './routes/cherry-pick.js';
import { createBranchCommitLogHandler } from './routes/branch-commit-log.js';
import { createGeneratePRDescriptionHandler } from './routes/generate-pr-description.js';
import { createRebaseHandler } from './routes/rebase.js';
import { createAbortOperationHandler } from './routes/abort-operation.js';
import { createContinueOperationHandler } from './routes/continue-operation.js';
import { createStageFilesHandler } from './routes/stage-files.js';
import { createCheckChangesHandler } from './routes/check-changes.js';
import { createSetTrackingHandler } from './routes/set-tracking.js';
import { createSyncHandler } from './routes/sync.js';
import { createUpdatePRNumberHandler } from './routes/update-pr-number.js';
import type { SettingsService } from '../../services/settings-service.js';
import type { FeatureLoader } from '../../services/feature-loader.js';

export const WORKTREE_MOUNT = '/api/worktree';

/**
 * Create worktree lifecycle operation handlers.
 */
export function createWorktreeHandlers(
  events: EventEmitter,
  settingsService?: SettingsService,
  featureLoader?: FeatureLoader
): OperationHandlers {
  return {
    'worktree.info': createInfoHandler(),
    'worktree.status': createStatusHandler(),
    'worktree.list': createListHandler(),
    'worktree.diffs': createDiffsHandler(),
    'worktree.fileDiff': createFileDiffHandler(),
    'worktree.merge': createMergeHandler(events),
    'worktree.create': createCreateHandler(events, settingsService),
    'worktree.delete': createDeleteHandler(events, featureLoader),
    'worktree.openInEditor': createOpenInEditorHandler(),
    'worktree.openInTerminal': createOpenInTerminalHandler(),
    'worktree.getDefaultEditor': createGetDefaultEditorHandler(),
    'worktree.getAvailableEditors': createGetAvailableEditorsHandler(),
    'worktree.refreshEditors': createRefreshEditorsHandler(),
    'worktree.getAvailableTerminals': createGetAvailableTerminalsHandler(),
    'worktree.getDefaultTerminal': createGetDefaultTerminalHandler(),
    'worktree.refreshTerminals': createRefreshTerminalsHandler(),
    'worktree.openInExternalTerminal': createOpenInExternalTerminalHandler(),
    'worktree.initGit': createInitGitHandler(),
    'worktree.migrate': createMigrateHandler(),
    'worktree.startDev': createStartDevHandler(settingsService),
    'worktree.stopDev': createStopDevHandler(),
    'worktree.listDevServers': createListDevServersHandler(),
    'worktree.getDevServerLogs': createGetDevServerLogsHandler(),
    'worktree.startTests': createStartTestsHandler(settingsService),
    'worktree.stopTests': createStopTestsHandler(),
    'worktree.getTestLogs': createGetTestLogsHandler(),
    'worktree.getInitScript': createGetInitScriptHandler(),
    'worktree.setInitScript': createPutInitScriptHandler(),
    'worktree.deleteInitScript': createDeleteInitScriptHandler(),
    'worktree.runInitScript': createRunInitScriptHandler(events),
  };
}

/** Extra per-operation middleware, beyond the contract's path-param checks. */
export function createWorktreeMiddleware(): OperationMiddleware {
  return {
    'worktree.merge': [requireValidProject],
  };
}

export function createWorktreeRoutes(
  events: EventEmitter,
  settingsService?: SettingsService,
  featureLoader?: FeatureLoader
): Router {
  const router = registerContractOperations(
    Router(),
    WORKTREE_MOUNT,
    createWorktreeHandlers(events, settingsService, featureLoader),
    createWorktreeMiddleware()
  );

  router.post('/create-pr', createCreatePRHandler());
  router.post('/pr-info', createPRInfoHandler());
  router.post(
    '/update-pr-number',
    validatePathParams('worktreePath', 'projectPath?'),
    requireValidWorktree,
    createUpdatePRNumberHandler()
  );
  router.post(
    '/commit',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createCommitHandler()
  );
  router.post(
    '/generate-commit-message',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createGenerateCommitMessageHandler(settingsService)
  );
  router.post(
    '/push',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createPushHandler()
  );
  router.post(
    '/pull',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createPullHandler()
  );
  router.post(
    '/sync',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createSyncHandler()
  );
  router.post(
    '/set-tracking',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createSetTrackingHandler()
  );
  router.post(
    '/checkout-branch',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createCheckoutBranchHandler(events)
  );
  router.post(
    '/check-changes',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createCheckChangesHandler()
  );
  router.post(
    '/list-branches',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createListBranchesHandler()
  );
  router.post(
    '/switch-branch',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createSwitchBranchHandler(events)
  );

  // Discard changes route
  router.post(
    '/discard-changes',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createDiscardChangesHandler()
  );

  // List remotes route
  router.post(
    '/list-remotes',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createListRemotesHandler()
  );

  // Add remote route
  router.post(
    '/add-remote',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createAddRemoteHandler()
  );

  // Commit log route
  router.post(
    '/commit-log',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createCommitLogHandler(events)
  );

  // Stash routes
  router.post(
    '/stash-push',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createStashPushHandler(events)
  );
  router.post(
    '/stash-list',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createStashListHandler(events)
  );
  router.post(
    '/stash-apply',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createStashApplyHandler(events)
  );
  router.post(
    '/stash-drop',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createStashDropHandler(events)
  );

  // Cherry-pick route
  router.post(
    '/cherry-pick',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createCherryPickHandler(events)
  );

  // Generate PR description route
  router.post(
    '/generate-pr-description',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createGeneratePRDescriptionHandler(settingsService)
  );

  // Branch commit log route (get commits from a specific branch)
  router.post(
    '/branch-commit-log',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createBranchCommitLogHandler(events)
  );

  // Rebase route
  router.post(
    '/rebase',
    validatePathParams('worktreePath'),
    requireValidWorktree,
    createRebaseHandler(events)
  );

  // Abort in-progress merge/rebase/cherry-pick
  router.post(
    '/abort-operation',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createAbortOperationHandler(events)
  );

  // Continue in-progress merge/rebase/cherry-pick after resolving conflicts
  router.post(
    '/continue-operation',
    validatePathParams('worktreePath'),
    requireGitRepoOnly,
    createContinueOperationHandler(events)
  );

  // Stage/unstage files route
  router.post(
    '/stage-files',
    validatePathParams('worktreePath', 'files[]'),
    requireGitRepoOnly,
    createStageFilesHandler()
  );

  return router;
}
