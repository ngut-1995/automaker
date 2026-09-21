/**
 * Worktree routes - HTTP API for git worktree operations
 *
 * Every operation is registered from the shared operation contract; this file
 * maps each to its handler and declares any extra per-operation middleware.
 */

import { Router } from 'express';
import type { EventEmitter } from '../../lib/events.js';
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
    'worktree.createPR': createCreatePRHandler(),
    'worktree.getPRInfo': createPRInfoHandler(),
    'worktree.updatePRNumber': createUpdatePRNumberHandler(),
    'worktree.commit': createCommitHandler(),
    'worktree.generateCommitMessage': createGenerateCommitMessageHandler(settingsService),
    'worktree.push': createPushHandler(),
    'worktree.pull': createPullHandler(),
    'worktree.sync': createSyncHandler(),
    'worktree.setTracking': createSetTrackingHandler(),
    'worktree.checkoutBranch': createCheckoutBranchHandler(events),
    'worktree.checkChanges': createCheckChangesHandler(),
    'worktree.listBranches': createListBranchesHandler(),
    'worktree.switchBranch': createSwitchBranchHandler(events),
    'worktree.discardChanges': createDiscardChangesHandler(),
    'worktree.listRemotes': createListRemotesHandler(),
    'worktree.addRemote': createAddRemoteHandler(),
    'worktree.getCommitLog': createCommitLogHandler(events),
    'worktree.stashPush': createStashPushHandler(events),
    'worktree.stashList': createStashListHandler(events),
    'worktree.stashApply': createStashApplyHandler(events),
    'worktree.stashDrop': createStashDropHandler(events),
    'worktree.cherryPick': createCherryPickHandler(events),
    'worktree.generatePRDescription': createGeneratePRDescriptionHandler(settingsService),
    'worktree.getBranchCommitLog': createBranchCommitLogHandler(events),
    'worktree.rebase': createRebaseHandler(events),
    'worktree.abortOperation': createAbortOperationHandler(events),
    'worktree.continueOperation': createContinueOperationHandler(events),
    'worktree.stageFiles': createStageFilesHandler(),
  };
}

/** Extra per-operation middleware, beyond the contract's path-param checks. */
export function createWorktreeMiddleware(): OperationMiddleware {
  return {
    'worktree.merge': [requireValidProject],
    'worktree.updatePRNumber': [requireValidWorktree],
    'worktree.commit': [requireGitRepoOnly],
    'worktree.generateCommitMessage': [requireGitRepoOnly],
    'worktree.push': [requireValidWorktree],
    'worktree.pull': [requireValidWorktree],
    'worktree.sync': [requireValidWorktree],
    'worktree.setTracking': [requireValidWorktree],
    'worktree.checkoutBranch': [requireValidWorktree],
    'worktree.checkChanges': [requireGitRepoOnly],
    'worktree.listBranches': [requireValidWorktree],
    'worktree.switchBranch': [requireValidWorktree],
    'worktree.discardChanges': [requireGitRepoOnly],
    'worktree.listRemotes': [requireValidWorktree],
    'worktree.addRemote': [requireGitRepoOnly],
    'worktree.getCommitLog': [requireValidWorktree],
    'worktree.stashPush': [requireGitRepoOnly],
    'worktree.stashList': [requireGitRepoOnly],
    'worktree.stashApply': [requireGitRepoOnly],
    'worktree.stashDrop': [requireGitRepoOnly],
    'worktree.cherryPick': [requireValidWorktree],
    'worktree.generatePRDescription': [requireGitRepoOnly],
    'worktree.getBranchCommitLog': [requireValidWorktree],
    'worktree.rebase': [requireValidWorktree],
    'worktree.abortOperation': [requireGitRepoOnly],
    'worktree.continueOperation': [requireGitRepoOnly],
    'worktree.stageFiles': [requireGitRepoOnly],
  };
}

export function createWorktreeRoutes(
  events: EventEmitter,
  settingsService?: SettingsService,
  featureLoader?: FeatureLoader
): Router {
  return registerContractOperations(
    Router(),
    WORKTREE_MOUNT,
    createWorktreeHandlers(events, settingsService, featureLoader),
    createWorktreeMiddleware()
  );
}
