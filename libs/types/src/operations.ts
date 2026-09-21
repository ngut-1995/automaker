/**
 * The operation contract.
 *
 * Every HTTP operation the server exposes is declared exactly once here, as an
 * entry carrying its method, mount, path, request shape, response shape, the
 * path params to validate, and the events it emits. Both sides of the UI-server
 * seam derive from this single registry:
 *
 * - the server registers routes by iterating the entries for a mount, and
 * - the UI derives its paths (`operationPath`) and its response types
 *   (`ResponseOf`) from the same entries.
 *
 * This module must stay dependency-free (types in, types out) so the UI bundle
 * can import it without pulling in Node code.
 */

import type { EventType } from './event.js';
import type { Feature } from './feature.js';
import type { MergeStateInfo } from './worktree.js';
import type { MultiProjectOverview } from './project-overview.js';
import type { AgentDefinition } from './provider.js';
import type { Credentials, GlobalSettings, ProjectSettings } from './settings.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface OperationDefinition<Req, Res> {
  readonly method: HttpMethod;
  /** Base path the router is mounted at, e.g. '/api/features'. */
  readonly mount: string;
  /** Path within the mount, e.g. '/create'. */
  readonly path: string;
  /**
   * Request body / query shape. Type-only: the runtime value is `null`, the
   * static type is what carries the contract.
   */
  readonly request: Req;
  /**
   * Success payload shape. Type-only: the runtime value is `null`, the static
   * type is what carries the contract.
   */
  readonly response: Res;
  /** Events the operation's handler may emit. */
  readonly emittedEvents?: readonly EventType[];
  /** Path params the shared middleware validates, e.g. ['projectPath']. */
  readonly pathParams?: readonly string[];
}

// ---------------------------------------------------------------------------
// Features mount (/api/features)
// ---------------------------------------------------------------------------

export interface FeaturesListRequest {
  projectPath: string;
}
export interface FeaturesListResponse {
  success: boolean;
  features?: Feature[];
  error?: string;
}

export interface FeaturesGetRequest {
  projectPath: string;
  featureId: string;
}
export interface FeaturesGetResponse {
  success: boolean;
  feature?: Feature;
  error?: string;
}

export interface FeaturesCreateRequest {
  projectPath: string;
  feature: Feature;
}
export interface FeaturesCreateResponse {
  success: boolean;
  feature?: Feature;
  error?: string;
}

export interface FeaturesUpdateRequest {
  projectPath: string;
  featureId: string;
  updates: Partial<Feature>;
  descriptionHistorySource?: 'enhance' | 'edit';
  enhancementMode?: 'improve' | 'technical' | 'simplify' | 'acceptance' | 'ux-reviewer';
  preEnhancementDescription?: string;
}
export interface FeaturesUpdateResponse {
  success: boolean;
  feature?: Feature;
  error?: string;
}

export interface FeaturesDeleteRequest {
  projectPath: string;
  featureId: string;
}
export interface FeaturesDeleteResponse {
  success: boolean;
  error?: string;
}

export interface FeaturesBulkUpdateRequest {
  projectPath: string;
  featureIds: string[];
  updates: Partial<Feature>;
}
export interface FeaturesBulkUpdateResponse {
  success: boolean;
  updatedCount?: number;
  failedCount?: number;
  results?: Array<{ featureId: string; success: boolean; error?: string }>;
  features?: Feature[];
  error?: string;
}

export interface FeaturesBulkDeleteRequest {
  projectPath: string;
  featureIds: string[];
}
export interface FeaturesBulkDeleteResponse {
  success: boolean;
  deletedCount?: number;
  failedCount?: number;
  results?: Array<{ featureId: string; success: boolean; error?: string }>;
  error?: string;
}

export interface FeaturesAgentOutputRequest {
  projectPath: string;
  featureId: string;
}
export interface FeaturesAgentOutputResponse {
  success: boolean;
  content?: string | null;
  error?: string;
}

export interface FeaturesGenerateTitleRequest {
  description: string;
  projectPath?: string;
}
export interface FeaturesGenerateTitleResponse {
  success: boolean;
  title?: string;
  error?: string;
}

export interface FeaturesExportRequest {
  projectPath: string;
  featureIds?: string[];
  format?: 'json' | 'yaml';
  includeHistory?: boolean;
  includePlanSpec?: boolean;
  category?: string;
  status?: string;
  prettyPrint?: boolean;
  metadata?: Record<string, unknown>;
}
export interface FeaturesExportResponse {
  success: boolean;
  data?: string;
  format?: 'json' | 'yaml';
  contentType?: string;
  filename?: string;
  error?: string;
}

export interface FeaturesImportRequest {
  projectPath: string;
  data: string;
  overwrite?: boolean;
  preserveBranchInfo?: boolean;
  targetCategory?: string;
}
export interface FeaturesImportResponse {
  success: boolean;
  importedCount?: number;
  failedCount?: number;
  results?: Array<{
    success: boolean;
    featureId?: string;
    importedAt: string;
    warnings?: string[];
    errors?: string[];
    wasOverwritten?: boolean;
  }>;
  error?: string;
}

export interface FeaturesCheckConflictsRequest {
  projectPath: string;
  data: string;
}
export interface FeaturesCheckConflictsResponse {
  success: boolean;
  hasConflicts?: boolean;
  conflicts?: Array<{
    featureId: string;
    title?: string;
    existingTitle?: string;
    hasConflict: boolean;
  }>;
  totalFeatures?: number;
  conflictCount?: number;
  error?: string;
}

export interface FeaturesGetOrphanedRequest {
  projectPath: string;
}
export interface FeaturesGetOrphanedResponse {
  success: boolean;
  orphanedFeatures?: Array<{ feature: Feature; missingBranch: string }>;
  error?: string;
}

export type OrphanedFeatureAction = 'delete' | 'create-worktree' | 'move-to-branch';

export interface FeaturesResolveOrphanedRequest {
  projectPath: string;
  featureId: string;
  action: OrphanedFeatureAction;
  targetBranch?: string | null;
}
export interface FeaturesResolveOrphanedResponse {
  success: boolean;
  action?: string;
  worktreePath?: string;
  branchName?: string;
  error?: string;
}

export interface FeaturesBulkResolveOrphanedRequest {
  projectPath: string;
  featureIds: string[];
  action: OrphanedFeatureAction;
  targetBranch?: string | null;
}
export interface FeaturesBulkResolveOrphanedResponse {
  success: boolean;
  resolvedCount?: number;
  failedCount?: number;
  results?: Array<{ featureId: string; success: boolean; action?: string; error?: string }>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Auto Mode mount (/api/auto-mode)
// ---------------------------------------------------------------------------

export interface AutoModeStartRequest {
  projectPath: string;
  branchName?: string | null;
  maxConcurrency?: number;
}
export interface AutoModeStartResponse {
  success: boolean;
  error?: string;
}

export interface AutoModeStopRequest {
  projectPath: string;
  branchName?: string | null;
}
export interface AutoModeStopResponse {
  success: boolean;
  error?: string;
  runningFeatures?: number;
}

export interface AutoModeStopFeatureRequest {
  featureId: string;
}
export interface AutoModeStopFeatureResponse {
  success: boolean;
  error?: string;
}

export interface AutoModeStatusRequest {
  projectPath?: string;
  branchName?: string | null;
}
export interface AutoModeStatusResponse {
  success: boolean;
  isRunning?: boolean;
  isAutoLoopRunning?: boolean;
  currentFeatureId?: string | null;
  runningFeatures?: string[];
  runningProjects?: string[];
  runningCount?: number;
  maxConcurrency?: number;
  error?: string;
}

export interface AutoModeRunFeatureRequest {
  projectPath: string;
  featureId: string;
  useWorktrees?: boolean;
  worktreePath?: string;
}
export interface AutoModeRunFeatureResponse {
  success: boolean;
  passes?: boolean;
  error?: string;
}

export interface AutoModeVerifyFeatureRequest {
  projectPath: string;
  featureId: string;
}
export interface AutoModeVerifyFeatureResponse {
  success: boolean;
  passes?: boolean;
  error?: string;
}

export interface AutoModeResumeFeatureRequest {
  projectPath: string;
  featureId: string;
  useWorktrees?: boolean;
}
export interface AutoModeResumeFeatureResponse {
  success: boolean;
  passes?: boolean;
  error?: string;
}

export interface AutoModeContextExistsRequest {
  projectPath: string;
  featureId: string;
}
export interface AutoModeContextExistsResponse {
  success: boolean;
  exists?: boolean;
  error?: string;
}

export interface AutoModeAnalyzeProjectRequest {
  projectPath: string;
}
export interface AutoModeAnalyzeProjectResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AutoModeFollowUpFeatureRequest {
  projectPath: string;
  featureId: string;
  prompt: string;
  imagePaths?: string[];
  useWorktrees?: boolean;
}
export interface AutoModeFollowUpFeatureResponse {
  success: boolean;
  passes?: boolean;
  error?: string;
}

export interface AutoModeCommitFeatureRequest {
  projectPath: string;
  featureId: string;
  worktreePath?: string;
}
export interface AutoModeCommitFeatureResponse {
  success: boolean;
  error?: string;
}

export interface AutoModeApprovePlanRequest {
  projectPath: string;
  featureId: string;
  approved: boolean;
  editedPlan?: string;
  feedback?: string;
}
export interface AutoModeApprovePlanResponse {
  success: boolean;
  error?: string;
}

export interface AutoModeResumeInterruptedRequest {
  projectPath: string;
}
export interface AutoModeResumeInterruptedResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AutoModeReconcileRequest {
  projectPath: string;
}
export interface AutoModeReconcileResponse {
  success: boolean;
  reconciledCount?: number;
  message?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Running Agents mount (/api/running-agents)
// ---------------------------------------------------------------------------

/**
 * Mirrors the UI's `RunningAgent` (the contract module cannot import from the
 * UI). Kept structurally compatible so the client can return it unchanged.
 */
export interface RunningAgentSummary {
  featureId: string;
  projectPath: string;
  projectName: string;
  isAutoMode: boolean;
  model?: string;
  provider?: string;
  title?: string;
  description?: string;
  branchName?: string;
}

export type RunningAgentsGetAllRequest = Record<string, never>;

export interface RunningAgentsGetAllResponse {
  success: boolean;
  runningAgents?: RunningAgentSummary[];
  totalCount?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Worktree mount (/api/worktree) — lifecycle operations
// ---------------------------------------------------------------------------

/** Mirrors the UI's slim `WorktreeInfo` (the contract cannot import from the UI). */
export interface WorktreeInfoSummary {
  worktreePath: string;
  branchName: string;
  head?: string;
  baseBranch?: string;
}

/**
 * One entry of `worktree.list`. Carries both the slim shape the `list` method
 * declares and the richer shape `listAll` declares, since both share the route.
 */
export interface WorktreeListEntry extends WorktreeInfoSummary {
  path: string;
  branch: string;
  isMain: boolean;
  isCurrent: boolean;
  hasWorktree: boolean;
  hasChanges?: boolean;
  changedFilesCount?: number;
  pr?: {
    number: number;
    url: string;
    title: string;
    state: string;
    createdAt: string;
  };
}

export interface WorktreeInfoRequest {
  projectPath: string;
  featureId: string;
}
export interface WorktreeInfoResponse {
  success: boolean;
  worktreePath?: string;
  branchName?: string;
  head?: string;
  error?: string;
}

export interface WorktreeStatusRequest {
  projectPath: string;
  featureId: string;
}
export interface WorktreeStatusResponse {
  success: boolean;
  modifiedFiles?: number;
  files?: string[];
  diffStat?: string;
  recentCommits?: string[];
  error?: string;
}

export interface WorktreeListRequest {
  projectPath: string;
  includeDetails?: boolean;
  forceRefreshGitHub?: boolean;
}
export interface WorktreeListResponse {
  success: boolean;
  worktrees?: WorktreeListEntry[];
  removedWorktrees?: Array<{ path: string; branch: string }>;
  error?: string;
}

export interface WorktreeFileStatus {
  status: string;
  path: string;
  statusText: string;
  indexStatus?: string;
  workTreeStatus?: string;
  isMergeAffected?: boolean;
  mergeType?: string;
}

export interface WorktreeDiffsRequest {
  projectPath: string;
  featureId: string;
  useWorktrees?: boolean;
}
export interface WorktreeDiffsResponse {
  success: boolean;
  diff?: string;
  files?: WorktreeFileStatus[];
  hasChanges?: boolean;
  error?: string;
  mergeState?: MergeStateInfo;
}

export interface WorktreeFileDiffRequest {
  projectPath: string;
  featureId: string;
  filePath: string;
}
export interface WorktreeFileDiffResponse {
  success: boolean;
  diff?: string;
  filePath?: string;
  error?: string;
}

export interface WorktreeMergeRequest {
  projectPath: string;
  branchName: string;
  worktreePath: string;
  targetBranch?: string;
  options?: object;
}
export interface WorktreeMergeResponse {
  success: boolean;
  mergedBranch?: string;
  targetBranch?: string;
  deleted?: {
    worktreeDeleted: boolean;
    branchDeleted: boolean;
  };
  error?: string;
  hasConflicts?: boolean;
  conflictFiles?: string[];
}

export interface WorktreeCreateRequest {
  projectPath: string;
  branchName: string;
  baseBranch?: string;
}
export interface WorktreeCreateResponse {
  success: boolean;
  worktree?: {
    path: string;
    branch: string;
    isNew: boolean;
    baseCommitHash?: string;
    syncResult?: {
      synced: boolean;
      remote?: string;
      message?: string;
      diverged?: boolean;
    };
  };
  error?: string;
}

export interface WorktreeDeleteRequest {
  projectPath: string;
  worktreePath: string;
  deleteBranch?: boolean;
}
export interface WorktreeDeleteResponse {
  success: boolean;
  deleted?: {
    worktreePath: string;
    branch: string | null;
  };
  error?: string;
}

export interface WorktreeCreatePRRequest {
  worktreePath: string;
  projectPath?: string;
  commitMessage?: string;
  prTitle?: string;
  prBody?: string;
  baseBranch?: string;
  draft?: boolean;
  remote?: string;
  targetRemote?: string;
}
export interface WorktreeCreatePRResponse {
  success: boolean;
  result?: {
    branch: string;
    committed: boolean;
    commitHash?: string;
    pushed: boolean;
    prUrl?: string;
    prNumber?: number;
    prCreated: boolean;
    prAlreadyExisted?: boolean;
    prError?: string;
    browserUrl?: string;
    ghCliAvailable?: boolean;
  };
  error?: string;
}

export interface WorktreeGetPRInfoRequest {
  worktreePath: string;
  branchName: string;
}
export interface WorktreeGetPRInfoResponse {
  success: boolean;
  result?: {
    hasPR: boolean;
    ghCliAvailable: boolean;
    prInfo?: {
      number: number;
      title: string;
      url: string;
      state: string;
      author: string;
      body: string;
      comments: Array<{
        id: number;
        author: string;
        body: string;
        createdAt: string;
        isReviewComment: boolean;
      }>;
      reviewComments: Array<{
        id: number;
        author: string;
        body: string;
        path?: string;
        line?: number;
        createdAt: string;
        isReviewComment: boolean;
      }>;
    };
    error?: string;
  };
  error?: string;
}

export interface WorktreeUpdatePRNumberRequest {
  worktreePath: string;
  prNumber: number;
  projectPath?: string;
}
export interface WorktreeUpdatePRNumberResponse {
  success: boolean;
  result?: {
    branch: string;
    prInfo: {
      number: number;
      url: string;
      title: string;
      state: string;
      createdAt: string;
    };
    ghCliUnavailable?: boolean;
  };
  error?: string;
}

export interface WorktreeCommitRequest {
  worktreePath: string;
  message: string;
  files?: string[];
}
export interface WorktreeCommitResponse {
  success: boolean;
  result?: {
    committed: boolean;
    commitHash?: string;
    branch?: string;
    message?: string;
  };
  error?: string;
}

export interface WorktreeGenerateCommitMessageRequest {
  worktreePath: string;
  model?: string;
  thinkingLevel?: string;
  providerId?: string;
}
export interface WorktreeGenerateCommitMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface WorktreePushRequest {
  worktreePath: string;
  force?: boolean;
  remote?: string;
  autoResolve?: boolean;
}
export interface WorktreePushResponse {
  success: boolean;
  result?: {
    branch: string;
    pushed: boolean;
    diverged?: boolean;
    autoResolved?: boolean;
    message: string;
  };
  error?: string;
  diverged?: boolean;
  hasConflicts?: boolean;
  conflictFiles?: string[];
  code?: 'NOT_GIT_REPO' | 'NO_COMMITS';
}

export interface WorktreePullRequest {
  worktreePath: string;
  remote?: string;
  stashIfNeeded?: boolean;
  remoteBranch?: string;
}
export interface WorktreePullResponse {
  success: boolean;
  result?: {
    branch: string;
    pulled: boolean;
    message: string;
    hasLocalChanges?: boolean;
    localChangedFiles?: string[];
    hasConflicts?: boolean;
    conflictSource?: 'pull' | 'stash';
    conflictFiles?: string[];
    stashed?: boolean;
    stashRestored?: boolean;
  };
  error?: string;
  code?: 'NOT_GIT_REPO' | 'NO_COMMITS';
}

export interface WorktreeSyncRequest {
  worktreePath: string;
  remote?: string;
}
export interface WorktreeSyncResponse {
  success: boolean;
  result?: {
    branch: string;
    pulled: boolean;
    pushed: boolean;
    isFastForward?: boolean;
    isMerge?: boolean;
    autoResolved?: boolean;
    message: string;
  };
  error?: string;
  hasConflicts?: boolean;
  conflictFiles?: string[];
  conflictSource?: 'pull' | 'stash';
}

export interface WorktreeSetTrackingRequest {
  worktreePath: string;
  remote: string;
  branch?: string;
}
export interface WorktreeSetTrackingResponse {
  success: boolean;
  result?: {
    branch: string;
    remote: string;
    upstream: string;
    message: string;
  };
  error?: string;
}

export interface WorktreeCheckoutBranchRequest {
  worktreePath: string;
  branchName: string;
  baseBranch?: string;
  stashChanges?: boolean;
  includeUntracked?: boolean;
}
export interface WorktreeCheckoutBranchResponse {
  success: boolean;
  result?: {
    previousBranch: string;
    newBranch: string;
    message: string;
    hasConflicts?: boolean;
    stashedChanges?: boolean;
  };
  error?: string;
  code?: 'NOT_GIT_REPO' | 'NO_COMMITS';
  stashPopConflicts?: boolean;
  stashPopConflictMessage?: string;
}

export interface WorktreeCheckChangesRequest {
  worktreePath: string;
}
export interface WorktreeCheckChangesResponse {
  success: boolean;
  result?: {
    hasChanges: boolean;
    staged: string[];
    unstaged: string[];
    untracked: string[];
    totalFiles: number;
  };
  error?: string;
}

export interface WorktreeListBranchesRequest {
  worktreePath: string;
  includeRemote?: boolean;
}
export interface WorktreeListBranchesResponse {
  success: boolean;
  result?: {
    currentBranch: string;
    branches: Array<{
      name: string;
      isCurrent: boolean;
      isRemote: boolean;
    }>;
    aheadCount: number;
    behindCount: number;
    hasRemoteBranch: boolean;
    hasAnyRemotes: boolean;
    trackingRemote?: string;
  };
  error?: string;
  code?: 'NOT_GIT_REPO' | 'NO_COMMITS';
}

export interface WorktreeSwitchBranchRequest {
  worktreePath: string;
  branchName: string;
}
export interface WorktreeSwitchBranchResponse {
  success: boolean;
  result?: {
    previousBranch: string;
    currentBranch: string;
    message: string;
    hasConflicts: boolean;
    stashedChanges: boolean;
  };
  error?: string;
  code?: 'NOT_GIT_REPO' | 'NO_COMMITS' | 'UNCOMMITTED_CHANGES';
  stashPopConflicts?: boolean;
  stashPopConflictMessage?: string;
}

export interface WorktreeDiscardChangesRequest {
  worktreePath: string;
  files?: string[];
}
export interface WorktreeDiscardChangesResponse {
  success: boolean;
  result?: {
    discarded: boolean;
    filesDiscarded: number;
    filesRemaining: number;
    branch: string;
    message: string;
  };
  error?: string;
}

export interface WorktreeListRemotesRequest {
  worktreePath: string;
}
export interface WorktreeListRemotesResponse {
  success: boolean;
  result?: {
    remotes: Array<{
      name: string;
      url: string;
      branches: Array<{
        name: string;
        fullRef: string;
      }>;
    }>;
  };
  error?: string;
  code?: 'NOT_GIT_REPO' | 'NO_COMMITS';
}

export interface WorktreeAddRemoteRequest {
  worktreePath: string;
  remoteName: string;
  remoteUrl: string;
}
export interface WorktreeAddRemoteResponse {
  success: boolean;
  result?: {
    remoteName: string;
    remoteUrl: string;
    fetched: boolean;
    message: string;
  };
  error?: string;
  code?: 'REMOTE_EXISTS';
}

/** One entry of the commit log returned by `worktree.getCommitLog`/`getBranchCommitLog`. */
export interface WorktreeCommitSummary {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: string;
  subject: string;
  body: string;
  files: string[];
}

export interface WorktreeGetCommitLogRequest {
  worktreePath: string;
  limit?: number;
}
export interface WorktreeGetCommitLogResponse {
  success: boolean;
  result?: {
    branch: string;
    commits: WorktreeCommitSummary[];
    total: number;
  };
  error?: string;
}

export interface WorktreeStashPushRequest {
  worktreePath: string;
  message?: string;
  files?: string[];
}
export interface WorktreeStashPushResponse {
  success: boolean;
  result?: {
    stashed: boolean;
    branch?: string;
    message?: string;
  };
  error?: string;
}

export interface WorktreeStashListRequest {
  worktreePath: string;
}
export interface WorktreeStashListResponse {
  success: boolean;
  result?: {
    stashes: Array<{
      index: number;
      message: string;
      branch: string;
      date: string;
      files: string[];
    }>;
    total: number;
  };
  error?: string;
}

export interface WorktreeStashApplyRequest {
  worktreePath: string;
  stashIndex: number;
  pop?: boolean;
}
export interface WorktreeStashApplyResponse {
  success: boolean;
  result?: {
    applied: boolean;
    hasConflicts: boolean;
    conflictFiles?: string[];
    operation: 'apply' | 'pop';
    stashIndex: number;
    message: string;
  };
  error?: string;
}

export interface WorktreeStashDropRequest {
  worktreePath: string;
  stashIndex: number;
}
export interface WorktreeStashDropResponse {
  success: boolean;
  result?: {
    dropped: boolean;
    stashIndex: number;
    message: string;
  };
  error?: string;
}

export interface WorktreeCherryPickRequest {
  worktreePath: string;
  commitHashes: string[];
  options?: {
    noCommit?: boolean;
  };
}
export interface WorktreeCherryPickResponse {
  success: boolean;
  result?: {
    cherryPicked: boolean;
    commitHashes: string[];
    branch: string;
    message: string;
  };
  error?: string;
  hasConflicts?: boolean;
  aborted?: boolean;
}

export interface WorktreeGeneratePRDescriptionRequest {
  worktreePath: string;
  baseBranch?: string;
  model?: string;
  thinkingLevel?: string;
  providerId?: string;
}
export interface WorktreeGeneratePRDescriptionResponse {
  success: boolean;
  title?: string;
  body?: string;
  error?: string;
}

export interface WorktreeGetBranchCommitLogRequest {
  worktreePath: string;
  branchName?: string;
  limit?: number;
}
export interface WorktreeGetBranchCommitLogResponse {
  success: boolean;
  result?: {
    branch: string;
    commits: WorktreeCommitSummary[];
    total: number;
  };
  error?: string;
}

export interface WorktreeRebaseRequest {
  worktreePath: string;
  ontoBranch: string;
  remote?: string;
}
export interface WorktreeRebaseResponse {
  success: boolean;
  result?: {
    branch: string;
    ontoBranch: string;
    message: string;
  };
  error?: string;
  hasConflicts?: boolean;
  conflictFiles?: string[];
  aborted?: boolean;
}

export interface WorktreeAbortOperationRequest {
  worktreePath: string;
}
export interface WorktreeAbortOperationResponse {
  success: boolean;
  result?: {
    operation: string;
    message: string;
  };
  error?: string;
}

export interface WorktreeContinueOperationRequest {
  worktreePath: string;
}
export interface WorktreeContinueOperationResponse {
  success: boolean;
  result?: {
    operation: string;
    message: string;
  };
  error?: string;
}

export interface WorktreeStageFilesRequest {
  worktreePath: string;
  files: string[];
  operation: 'stage' | 'unstage';
}
export interface WorktreeStageFilesResponse {
  success: boolean;
  result?: {
    operation: 'stage' | 'unstage';
    filesCount: number;
  };
  error?: string;
}

export interface WorktreeOpenInEditorRequest {
  worktreePath: string;
  editorCommand?: string;
}
export interface WorktreeOpenInEditorResponse {
  success: boolean;
  result?: {
    message: string;
    editorName?: string;
  };
  error?: string;
}

export interface WorktreeOpenInTerminalRequest {
  worktreePath: string;
}
export interface WorktreeOpenInTerminalResponse {
  success: boolean;
  result?: {
    message: string;
    terminalName: string;
  };
  error?: string;
}

export type WorktreeGetDefaultEditorRequest = Record<string, never>;
export interface WorktreeGetDefaultEditorResponse {
  success: boolean;
  result?: {
    editorName: string;
    editorCommand: string;
  };
  error?: string;
}

export type WorktreeGetAvailableEditorsRequest = Record<string, never>;
export interface WorktreeGetAvailableEditorsResponse {
  success: boolean;
  result?: {
    editors: Array<{ name: string; command: string }>;
  };
  error?: string;
}

export type WorktreeRefreshEditorsRequest = Record<string, never>;
export interface WorktreeRefreshEditorsResponse {
  success: boolean;
  result?: {
    editors: Array<{ name: string; command: string }>;
    message: string;
  };
  error?: string;
}

export type WorktreeGetAvailableTerminalsRequest = Record<string, never>;
export interface WorktreeGetAvailableTerminalsResponse {
  success: boolean;
  result?: {
    terminals: Array<{ id: string; name: string; command: string }>;
  };
  error?: string;
}

export type WorktreeGetDefaultTerminalRequest = Record<string, never>;
export interface WorktreeGetDefaultTerminalResponse {
  success: boolean;
  result?: {
    terminalId: string;
    terminalName: string;
    terminalCommand: string;
  } | null;
  error?: string;
}

export type WorktreeRefreshTerminalsRequest = Record<string, never>;
export interface WorktreeRefreshTerminalsResponse {
  success: boolean;
  result?: {
    terminals: Array<{ id: string; name: string; command: string }>;
    message: string;
  };
  error?: string;
}

export interface WorktreeOpenInExternalTerminalRequest {
  worktreePath: string;
  terminalId?: string;
}
export interface WorktreeOpenInExternalTerminalResponse {
  success: boolean;
  result?: {
    message: string;
    terminalName: string;
  };
  error?: string;
}

export interface WorktreeInitGitRequest {
  projectPath: string;
}
export interface WorktreeInitGitResponse {
  success: boolean;
  result?: {
    initialized: boolean;
    message: string;
  };
  error?: string;
}

export interface WorktreeMigrateRequest {
  projectPath: string;
}
export interface WorktreeMigrateResponse {
  success: boolean;
  migrated?: boolean;
  message?: string;
  path?: string;
  error?: string;
}

export interface WorktreeStartDevRequest {
  projectPath: string;
  worktreePath: string;
}
export interface WorktreeStartDevResponse {
  success: boolean;
  result?: {
    worktreePath: string;
    port: number;
    url: string;
    message: string;
  };
  error?: string;
}

export interface WorktreeStopDevRequest {
  worktreePath: string;
}
export interface WorktreeStopDevResponse {
  success: boolean;
  result?: {
    worktreePath: string;
    message: string;
  };
  error?: string;
}

export type WorktreeListDevServersRequest = Record<string, never>;
export interface WorktreeListDevServersResponse {
  success: boolean;
  result?: {
    servers: Array<{
      worktreePath: string;
      port: number;
      url: string;
      urlDetected: boolean;
    }>;
  };
  error?: string;
}

export interface WorktreeGetDevServerLogsRequest {
  worktreePath: string;
}
export interface WorktreeGetDevServerLogsResponse {
  success: boolean;
  result?: {
    worktreePath: string;
    port: number;
    url: string;
    logs: string;
    startedAt: string;
  };
  error?: string;
}

export type WorktreeTestRunStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'cancelled'
  | 'error';

export interface WorktreeStartTestsRequest {
  worktreePath: string;
  projectPath?: string;
  testFile?: string;
}
export interface WorktreeStartTestsResponse {
  success: boolean;
  result?: {
    sessionId: string;
    worktreePath: string;
    command: string;
    status: WorktreeTestRunStatus;
    testFile?: string;
    message: string;
  };
  error?: string;
}

export interface WorktreeStopTestsRequest {
  sessionId: string;
}
export interface WorktreeStopTestsResponse {
  success: boolean;
  result?: {
    sessionId: string;
    message: string;
  };
  error?: string;
}

export interface WorktreeGetTestLogsRequest {
  worktreePath?: string;
  sessionId?: string;
}
export interface WorktreeGetTestLogsResponse {
  success: boolean;
  result?: {
    sessionId: string;
    worktreePath: string;
    command: string;
    status: WorktreeTestRunStatus;
    testFile?: string;
    logs: string;
    startedAt: string;
    finishedAt: string | null;
    exitCode: number | null;
  };
  error?: string;
}

export interface WorktreeGetInitScriptRequest {
  projectPath: string;
}
export interface WorktreeGetInitScriptResponse {
  success: boolean;
  exists: boolean;
  content: string;
  path: string;
  error?: string;
}

export interface WorktreeSetInitScriptRequest {
  projectPath: string;
  content: string;
}
export interface WorktreeSetInitScriptResponse {
  success: boolean;
  path?: string;
  error?: string;
}

export interface WorktreeDeleteInitScriptRequest {
  projectPath: string;
}
export interface WorktreeDeleteInitScriptResponse {
  success: boolean;
  error?: string;
}

export interface WorktreeRunInitScriptRequest {
  projectPath: string;
  worktreePath: string;
  branch: string;
}
export interface WorktreeRunInitScriptResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Settings mount (/api/settings)
// ---------------------------------------------------------------------------

/** API-key status for each provider, masked for display. */
export interface MaskedCredentials {
  anthropic: { configured: boolean; masked: string };
  google: { configured: boolean; masked: string };
  openai: { configured: boolean; masked: string };
  zai: { configured: boolean; masked: string };
}

export type SettingsGetStatusRequest = Record<string, never>;
export interface SettingsGetStatusResponse {
  success: boolean;
  hasGlobalSettings: boolean;
  hasCredentials: boolean;
  dataDir: string;
  needsMigration: boolean;
}

export type SettingsGetGlobalRequest = Record<string, never>;
export interface SettingsGetGlobalResponse {
  success: boolean;
  settings?: GlobalSettings;
  error?: string;
}

export type SettingsUpdateGlobalRequest = Record<string, unknown>;
export interface SettingsUpdateGlobalResponse {
  success: boolean;
  settings?: GlobalSettings;
  error?: string;
}

export type SettingsGetCredentialsRequest = Record<string, never>;
export interface SettingsGetCredentialsResponse {
  success: boolean;
  credentials?: MaskedCredentials;
  error?: string;
}

export interface SettingsUpdateCredentialsRequest {
  version?: number;
  apiKeys?: Partial<Credentials['apiKeys']>;
}
export interface SettingsUpdateCredentialsResponse {
  success: boolean;
  credentials?: MaskedCredentials;
  error?: string;
}

export interface SettingsGetProjectRequest {
  projectPath: string;
}
export interface SettingsGetProjectResponse {
  success: boolean;
  settings?: ProjectSettings;
  error?: string;
}

export interface SettingsUpdateProjectRequest {
  projectPath: string;
  updates: Record<string, unknown>;
}
export interface SettingsUpdateProjectResponse {
  success: boolean;
  settings?: ProjectSettings;
  error?: string;
}

export interface SettingsMigrationData {
  'automaker-storage'?: string;
  'automaker-setup'?: string;
  'worktree-panel-collapsed'?: string;
  'file-browser-recent-folders'?: string;
  'automaker:lastProjectDir'?: string;
}
export interface SettingsMigrateRequest {
  data: SettingsMigrationData;
}
export interface SettingsMigrateResponse {
  success: boolean;
  migratedGlobalSettings: boolean;
  migratedCredentials: boolean;
  migratedProjectCount: number;
  errors: string[];
}

export interface SettingsDiscoverAgentsRequest {
  projectPath?: string;
  sources?: Array<'user' | 'project'>;
}
export interface SettingsDiscoverAgentsResponse {
  success: boolean;
  agents?: Array<{
    name: string;
    definition: AgentDefinition;
    source: 'user' | 'project';
    filePath: string;
  }>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Projects mount (/api/projects)
// ---------------------------------------------------------------------------

export type ProjectsGetOverviewRequest = Record<string, never>;
export type ProjectsGetOverviewResponse =
  | ({ success: true } & MultiProjectOverview)
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Context mount (/api/context)
// ---------------------------------------------------------------------------

export interface ContextDescribeImageRequest {
  imagePath: string;
}
export interface ContextDescribeImageResponse {
  success: boolean;
  description?: string;
  error?: string;
}

export interface ContextDescribeFileRequest {
  filePath: string;
}
export interface ContextDescribeFileResponse {
  success: boolean;
  description?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Spec Regeneration mount (/api/spec-regeneration)
// ---------------------------------------------------------------------------

export interface SpecRegenerationCreateRequest {
  projectPath: string;
  projectOverview: string;
  generateFeatures?: boolean;
  analyzeProject?: boolean;
  maxFeatures?: number;
}
export interface SpecRegenerationCreateResponse {
  success: boolean;
  error?: string;
}

export interface SpecRegenerationGenerateRequest {
  projectPath: string;
  projectDefinition: string;
  generateFeatures?: boolean;
  analyzeProject?: boolean;
  maxFeatures?: number;
}
export interface SpecRegenerationGenerateResponse {
  success: boolean;
  error?: string;
}

export interface SpecRegenerationGenerateFeaturesRequest {
  projectPath: string;
  maxFeatures?: number;
}
export interface SpecRegenerationGenerateFeaturesResponse {
  success: boolean;
  error?: string;
}

export interface SpecRegenerationSyncRequest {
  projectPath: string;
}
export interface SpecRegenerationSyncResponse {
  success: boolean;
  error?: string;
}

export interface SpecRegenerationStopRequest {
  projectPath?: string;
}
export interface SpecRegenerationStopResponse {
  success: boolean;
  error?: string;
}

export interface SpecRegenerationStatusRequest {
  projectPath?: string;
}
export interface SpecRegenerationStatusResponse {
  success: boolean;
  isRunning?: boolean;
  projectPath?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Backlog Plan mount (/api/backlog-plan)
// ---------------------------------------------------------------------------

/** A proposed backlog change as carried over the wire (feature is free-form). */
export interface BacklogPlanChange {
  type: 'add' | 'update' | 'delete';
  featureId?: string;
  feature?: Record<string, unknown>;
  reason: string;
}
export interface BacklogPlanDependencyUpdate {
  featureId: string;
  removedDependencies: string[];
  addedDependencies: string[];
}
export interface BacklogPlanResultShape {
  changes: BacklogPlanChange[];
  summary: string;
  dependencyUpdates: BacklogPlanDependencyUpdate[];
}

export interface BacklogPlanGenerateRequest {
  projectPath: string;
  prompt: string;
  model?: string;
  branchName?: string;
}
export interface BacklogPlanGenerateResponse {
  success: boolean;
  error?: string;
}

export type BacklogPlanStopRequest = Record<string, never>;
export interface BacklogPlanStopResponse {
  success: boolean;
  error?: string;
}

export interface BacklogPlanStatusRequest {
  projectPath?: string;
}
export interface BacklogPlanSavedPlan {
  savedAt: string;
  prompt: string;
  model?: string;
  result: BacklogPlanResultShape;
}
export interface BacklogPlanStatusResponse {
  success: boolean;
  isRunning?: boolean;
  savedPlan?: BacklogPlanSavedPlan | null;
  error?: string;
}

export interface BacklogPlanApplyRequest {
  projectPath: string;
  plan: BacklogPlanResultShape;
  branchName?: string;
}
export interface BacklogPlanApplyResponse {
  success: boolean;
  appliedChanges?: string[];
  error?: string;
}

export interface BacklogPlanClearRequest {
  projectPath: string;
}
export interface BacklogPlanClearResponse {
  success: boolean;
  error?: string;
}

/**
 * The registry. Add one entry per operation, named `<namespace>.<method>` where
 * the namespace matches the client's API namespace.
 */
export const OPERATIONS = {
  'features.list': {
    method: 'GET',
    mount: '/api/features',
    path: '/list',
    request: null as unknown as FeaturesListRequest,
    response: null as unknown as FeaturesListResponse,
    pathParams: ['projectPath'],
  },
  'features.listPost': {
    method: 'POST',
    mount: '/api/features',
    path: '/list',
    request: null as unknown as FeaturesListRequest,
    response: null as unknown as FeaturesListResponse,
    pathParams: ['projectPath'],
  },
  'features.get': {
    method: 'POST',
    mount: '/api/features',
    path: '/get',
    request: null as unknown as FeaturesGetRequest,
    response: null as unknown as FeaturesGetResponse,
    pathParams: ['projectPath'],
  },
  'features.create': {
    method: 'POST',
    mount: '/api/features',
    path: '/create',
    request: null as unknown as FeaturesCreateRequest,
    response: null as unknown as FeaturesCreateResponse,
    pathParams: ['projectPath'],
    emittedEvents: ['feature:created'],
  },
  'features.update': {
    method: 'POST',
    mount: '/api/features',
    path: '/update',
    request: null as unknown as FeaturesUpdateRequest,
    response: null as unknown as FeaturesUpdateResponse,
    pathParams: ['projectPath'],
    emittedEvents: ['feature:completed'],
  },
  'features.bulkUpdate': {
    method: 'POST',
    mount: '/api/features',
    path: '/bulk-update',
    request: null as unknown as FeaturesBulkUpdateRequest,
    response: null as unknown as FeaturesBulkUpdateResponse,
    pathParams: ['projectPath'],
  },
  'features.bulkDelete': {
    method: 'POST',
    mount: '/api/features',
    path: '/bulk-delete',
    request: null as unknown as FeaturesBulkDeleteRequest,
    response: null as unknown as FeaturesBulkDeleteResponse,
    pathParams: ['projectPath'],
  },
  'features.delete': {
    method: 'POST',
    mount: '/api/features',
    path: '/delete',
    request: null as unknown as FeaturesDeleteRequest,
    response: null as unknown as FeaturesDeleteResponse,
    pathParams: ['projectPath'],
  },
  'features.getAgentOutput': {
    method: 'POST',
    mount: '/api/features',
    path: '/agent-output',
    request: null as unknown as FeaturesAgentOutputRequest,
    response: null as unknown as FeaturesAgentOutputResponse,
  },
  'features.rawOutput': {
    method: 'POST',
    mount: '/api/features',
    path: '/raw-output',
    request: null as unknown as FeaturesAgentOutputRequest,
    response: null as unknown as FeaturesAgentOutputResponse,
  },
  'features.generateTitle': {
    method: 'POST',
    mount: '/api/features',
    path: '/generate-title',
    request: null as unknown as FeaturesGenerateTitleRequest,
    response: null as unknown as FeaturesGenerateTitleResponse,
  },
  'features.export': {
    method: 'POST',
    mount: '/api/features',
    path: '/export',
    request: null as unknown as FeaturesExportRequest,
    response: null as unknown as FeaturesExportResponse,
    pathParams: ['projectPath'],
  },
  'features.import': {
    method: 'POST',
    mount: '/api/features',
    path: '/import',
    request: null as unknown as FeaturesImportRequest,
    response: null as unknown as FeaturesImportResponse,
    pathParams: ['projectPath'],
  },
  'features.checkConflicts': {
    method: 'POST',
    mount: '/api/features',
    path: '/check-conflicts',
    request: null as unknown as FeaturesCheckConflictsRequest,
    response: null as unknown as FeaturesCheckConflictsResponse,
    pathParams: ['projectPath'],
  },
  'features.getOrphaned': {
    method: 'POST',
    mount: '/api/features',
    path: '/orphaned',
    request: null as unknown as FeaturesGetOrphanedRequest,
    response: null as unknown as FeaturesGetOrphanedResponse,
    pathParams: ['projectPath'],
  },
  'features.resolveOrphaned': {
    method: 'POST',
    mount: '/api/features',
    path: '/orphaned/resolve',
    request: null as unknown as FeaturesResolveOrphanedRequest,
    response: null as unknown as FeaturesResolveOrphanedResponse,
    pathParams: ['projectPath'],
  },
  'features.bulkResolveOrphaned': {
    method: 'POST',
    mount: '/api/features',
    path: '/orphaned/bulk-resolve',
    request: null as unknown as FeaturesBulkResolveOrphanedRequest,
    response: null as unknown as FeaturesBulkResolveOrphanedResponse,
    pathParams: ['projectPath'],
  },
  'autoMode.start': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/start',
    request: null as unknown as AutoModeStartRequest,
    response: null as unknown as AutoModeStartResponse,
    pathParams: ['projectPath'],
  },
  'autoMode.stop': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/stop',
    request: null as unknown as AutoModeStopRequest,
    response: null as unknown as AutoModeStopResponse,
    pathParams: ['projectPath'],
  },
  'autoMode.stopFeature': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/stop-feature',
    request: null as unknown as AutoModeStopFeatureRequest,
    response: null as unknown as AutoModeStopFeatureResponse,
  },
  'autoMode.status': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/status',
    request: null as unknown as AutoModeStatusRequest,
    response: null as unknown as AutoModeStatusResponse,
    pathParams: ['projectPath?'],
  },
  'autoMode.runFeature': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/run-feature',
    request: null as unknown as AutoModeRunFeatureRequest,
    response: null as unknown as AutoModeRunFeatureResponse,
    pathParams: ['projectPath'],
  },
  'autoMode.verifyFeature': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/verify-feature',
    request: null as unknown as AutoModeVerifyFeatureRequest,
    response: null as unknown as AutoModeVerifyFeatureResponse,
    pathParams: ['projectPath'],
  },
  'autoMode.resumeFeature': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/resume-feature',
    request: null as unknown as AutoModeResumeFeatureRequest,
    response: null as unknown as AutoModeResumeFeatureResponse,
    pathParams: ['projectPath'],
  },
  'autoMode.contextExists': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/context-exists',
    request: null as unknown as AutoModeContextExistsRequest,
    response: null as unknown as AutoModeContextExistsResponse,
    pathParams: ['projectPath'],
  },
  'autoMode.analyzeProject': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/analyze-project',
    request: null as unknown as AutoModeAnalyzeProjectRequest,
    response: null as unknown as AutoModeAnalyzeProjectResponse,
    pathParams: ['projectPath'],
  },
  'autoMode.followUpFeature': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/follow-up-feature',
    request: null as unknown as AutoModeFollowUpFeatureRequest,
    response: null as unknown as AutoModeFollowUpFeatureResponse,
    pathParams: ['projectPath', 'imagePaths[]'],
  },
  'autoMode.commitFeature': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/commit-feature',
    request: null as unknown as AutoModeCommitFeatureRequest,
    response: null as unknown as AutoModeCommitFeatureResponse,
    pathParams: ['projectPath', 'worktreePath?'],
  },
  'autoMode.approvePlan': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/approve-plan',
    request: null as unknown as AutoModeApprovePlanRequest,
    response: null as unknown as AutoModeApprovePlanResponse,
    pathParams: ['projectPath'],
  },
  'autoMode.resumeInterrupted': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/resume-interrupted',
    request: null as unknown as AutoModeResumeInterruptedRequest,
    response: null as unknown as AutoModeResumeInterruptedResponse,
    pathParams: ['projectPath'],
  },
  'autoMode.reconcile': {
    method: 'POST',
    mount: '/api/auto-mode',
    path: '/reconcile',
    request: null as unknown as AutoModeReconcileRequest,
    response: null as unknown as AutoModeReconcileResponse,
    pathParams: ['projectPath'],
  },
  'runningAgents.getAll': {
    method: 'GET',
    mount: '/api/running-agents',
    path: '/',
    request: null as unknown as RunningAgentsGetAllRequest,
    response: null as unknown as RunningAgentsGetAllResponse,
  },
  'worktree.info': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/info',
    request: null as unknown as WorktreeInfoRequest,
    response: null as unknown as WorktreeInfoResponse,
    pathParams: ['projectPath'],
  },
  'worktree.status': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/status',
    request: null as unknown as WorktreeStatusRequest,
    response: null as unknown as WorktreeStatusResponse,
    pathParams: ['projectPath'],
  },
  'worktree.list': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/list',
    request: null as unknown as WorktreeListRequest,
    response: null as unknown as WorktreeListResponse,
  },
  'worktree.diffs': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/diffs',
    request: null as unknown as WorktreeDiffsRequest,
    response: null as unknown as WorktreeDiffsResponse,
    pathParams: ['projectPath'],
  },
  'worktree.fileDiff': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/file-diff',
    request: null as unknown as WorktreeFileDiffRequest,
    response: null as unknown as WorktreeFileDiffResponse,
    pathParams: ['projectPath', 'filePath'],
  },
  'worktree.merge': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/merge',
    request: null as unknown as WorktreeMergeRequest,
    response: null as unknown as WorktreeMergeResponse,
    pathParams: ['projectPath'],
  },
  'worktree.create': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/create',
    request: null as unknown as WorktreeCreateRequest,
    response: null as unknown as WorktreeCreateResponse,
    pathParams: ['projectPath'],
  },
  'worktree.delete': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/delete',
    request: null as unknown as WorktreeDeleteRequest,
    response: null as unknown as WorktreeDeleteResponse,
    pathParams: ['projectPath', 'worktreePath'],
  },
  'worktree.openInEditor': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/open-in-editor',
    request: null as unknown as WorktreeOpenInEditorRequest,
    response: null as unknown as WorktreeOpenInEditorResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.openInTerminal': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/open-in-terminal',
    request: null as unknown as WorktreeOpenInTerminalRequest,
    response: null as unknown as WorktreeOpenInTerminalResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.getDefaultEditor': {
    method: 'GET',
    mount: '/api/worktree',
    path: '/default-editor',
    request: null as unknown as WorktreeGetDefaultEditorRequest,
    response: null as unknown as WorktreeGetDefaultEditorResponse,
  },
  'worktree.getAvailableEditors': {
    method: 'GET',
    mount: '/api/worktree',
    path: '/available-editors',
    request: null as unknown as WorktreeGetAvailableEditorsRequest,
    response: null as unknown as WorktreeGetAvailableEditorsResponse,
  },
  'worktree.refreshEditors': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/refresh-editors',
    request: null as unknown as WorktreeRefreshEditorsRequest,
    response: null as unknown as WorktreeRefreshEditorsResponse,
  },
  'worktree.getAvailableTerminals': {
    method: 'GET',
    mount: '/api/worktree',
    path: '/available-terminals',
    request: null as unknown as WorktreeGetAvailableTerminalsRequest,
    response: null as unknown as WorktreeGetAvailableTerminalsResponse,
  },
  'worktree.getDefaultTerminal': {
    method: 'GET',
    mount: '/api/worktree',
    path: '/default-terminal',
    request: null as unknown as WorktreeGetDefaultTerminalRequest,
    response: null as unknown as WorktreeGetDefaultTerminalResponse,
  },
  'worktree.refreshTerminals': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/refresh-terminals',
    request: null as unknown as WorktreeRefreshTerminalsRequest,
    response: null as unknown as WorktreeRefreshTerminalsResponse,
  },
  'worktree.openInExternalTerminal': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/open-in-external-terminal',
    request: null as unknown as WorktreeOpenInExternalTerminalRequest,
    response: null as unknown as WorktreeOpenInExternalTerminalResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.initGit': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/init-git',
    request: null as unknown as WorktreeInitGitRequest,
    response: null as unknown as WorktreeInitGitResponse,
    pathParams: ['projectPath'],
  },
  'worktree.migrate': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/migrate',
    request: null as unknown as WorktreeMigrateRequest,
    response: null as unknown as WorktreeMigrateResponse,
  },
  'worktree.startDev': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/start-dev',
    request: null as unknown as WorktreeStartDevRequest,
    response: null as unknown as WorktreeStartDevResponse,
    pathParams: ['projectPath', 'worktreePath'],
  },
  'worktree.stopDev': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/stop-dev',
    request: null as unknown as WorktreeStopDevRequest,
    response: null as unknown as WorktreeStopDevResponse,
  },
  'worktree.listDevServers': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/list-dev-servers',
    request: null as unknown as WorktreeListDevServersRequest,
    response: null as unknown as WorktreeListDevServersResponse,
  },
  'worktree.getDevServerLogs': {
    method: 'GET',
    mount: '/api/worktree',
    path: '/dev-server-logs',
    request: null as unknown as WorktreeGetDevServerLogsRequest,
    response: null as unknown as WorktreeGetDevServerLogsResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.startTests': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/start-tests',
    request: null as unknown as WorktreeStartTestsRequest,
    response: null as unknown as WorktreeStartTestsResponse,
    pathParams: ['worktreePath', 'projectPath?'],
  },
  'worktree.stopTests': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/stop-tests',
    request: null as unknown as WorktreeStopTestsRequest,
    response: null as unknown as WorktreeStopTestsResponse,
  },
  'worktree.getTestLogs': {
    method: 'GET',
    mount: '/api/worktree',
    path: '/test-logs',
    request: null as unknown as WorktreeGetTestLogsRequest,
    response: null as unknown as WorktreeGetTestLogsResponse,
    pathParams: ['worktreePath?'],
  },
  'worktree.getInitScript': {
    method: 'GET',
    mount: '/api/worktree',
    path: '/init-script',
    request: null as unknown as WorktreeGetInitScriptRequest,
    response: null as unknown as WorktreeGetInitScriptResponse,
  },
  'worktree.setInitScript': {
    method: 'PUT',
    mount: '/api/worktree',
    path: '/init-script',
    request: null as unknown as WorktreeSetInitScriptRequest,
    response: null as unknown as WorktreeSetInitScriptResponse,
    pathParams: ['projectPath'],
  },
  'worktree.deleteInitScript': {
    method: 'DELETE',
    mount: '/api/worktree',
    path: '/init-script',
    request: null as unknown as WorktreeDeleteInitScriptRequest,
    response: null as unknown as WorktreeDeleteInitScriptResponse,
    pathParams: ['projectPath'],
  },
  'worktree.runInitScript': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/run-init-script',
    request: null as unknown as WorktreeRunInitScriptRequest,
    response: null as unknown as WorktreeRunInitScriptResponse,
    pathParams: ['projectPath', 'worktreePath'],
  },
  'worktree.createPR': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/create-pr',
    request: null as unknown as WorktreeCreatePRRequest,
    response: null as unknown as WorktreeCreatePRResponse,
  },
  'worktree.getPRInfo': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/pr-info',
    request: null as unknown as WorktreeGetPRInfoRequest,
    response: null as unknown as WorktreeGetPRInfoResponse,
  },
  'worktree.updatePRNumber': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/update-pr-number',
    request: null as unknown as WorktreeUpdatePRNumberRequest,
    response: null as unknown as WorktreeUpdatePRNumberResponse,
    pathParams: ['worktreePath', 'projectPath?'],
  },
  'worktree.commit': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/commit',
    request: null as unknown as WorktreeCommitRequest,
    response: null as unknown as WorktreeCommitResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.generateCommitMessage': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/generate-commit-message',
    request: null as unknown as WorktreeGenerateCommitMessageRequest,
    response: null as unknown as WorktreeGenerateCommitMessageResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.push': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/push',
    request: null as unknown as WorktreePushRequest,
    response: null as unknown as WorktreePushResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.pull': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/pull',
    request: null as unknown as WorktreePullRequest,
    response: null as unknown as WorktreePullResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.sync': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/sync',
    request: null as unknown as WorktreeSyncRequest,
    response: null as unknown as WorktreeSyncResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.setTracking': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/set-tracking',
    request: null as unknown as WorktreeSetTrackingRequest,
    response: null as unknown as WorktreeSetTrackingResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.checkoutBranch': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/checkout-branch',
    request: null as unknown as WorktreeCheckoutBranchRequest,
    response: null as unknown as WorktreeCheckoutBranchResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.checkChanges': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/check-changes',
    request: null as unknown as WorktreeCheckChangesRequest,
    response: null as unknown as WorktreeCheckChangesResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.listBranches': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/list-branches',
    request: null as unknown as WorktreeListBranchesRequest,
    response: null as unknown as WorktreeListBranchesResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.switchBranch': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/switch-branch',
    request: null as unknown as WorktreeSwitchBranchRequest,
    response: null as unknown as WorktreeSwitchBranchResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.discardChanges': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/discard-changes',
    request: null as unknown as WorktreeDiscardChangesRequest,
    response: null as unknown as WorktreeDiscardChangesResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.listRemotes': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/list-remotes',
    request: null as unknown as WorktreeListRemotesRequest,
    response: null as unknown as WorktreeListRemotesResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.addRemote': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/add-remote',
    request: null as unknown as WorktreeAddRemoteRequest,
    response: null as unknown as WorktreeAddRemoteResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.getCommitLog': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/commit-log',
    request: null as unknown as WorktreeGetCommitLogRequest,
    response: null as unknown as WorktreeGetCommitLogResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.stashPush': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/stash-push',
    request: null as unknown as WorktreeStashPushRequest,
    response: null as unknown as WorktreeStashPushResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.stashList': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/stash-list',
    request: null as unknown as WorktreeStashListRequest,
    response: null as unknown as WorktreeStashListResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.stashApply': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/stash-apply',
    request: null as unknown as WorktreeStashApplyRequest,
    response: null as unknown as WorktreeStashApplyResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.stashDrop': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/stash-drop',
    request: null as unknown as WorktreeStashDropRequest,
    response: null as unknown as WorktreeStashDropResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.cherryPick': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/cherry-pick',
    request: null as unknown as WorktreeCherryPickRequest,
    response: null as unknown as WorktreeCherryPickResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.generatePRDescription': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/generate-pr-description',
    request: null as unknown as WorktreeGeneratePRDescriptionRequest,
    response: null as unknown as WorktreeGeneratePRDescriptionResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.getBranchCommitLog': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/branch-commit-log',
    request: null as unknown as WorktreeGetBranchCommitLogRequest,
    response: null as unknown as WorktreeGetBranchCommitLogResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.rebase': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/rebase',
    request: null as unknown as WorktreeRebaseRequest,
    response: null as unknown as WorktreeRebaseResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.abortOperation': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/abort-operation',
    request: null as unknown as WorktreeAbortOperationRequest,
    response: null as unknown as WorktreeAbortOperationResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.continueOperation': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/continue-operation',
    request: null as unknown as WorktreeContinueOperationRequest,
    response: null as unknown as WorktreeContinueOperationResponse,
    pathParams: ['worktreePath'],
  },
  'worktree.stageFiles': {
    method: 'POST',
    mount: '/api/worktree',
    path: '/stage-files',
    request: null as unknown as WorktreeStageFilesRequest,
    response: null as unknown as WorktreeStageFilesResponse,
    pathParams: ['worktreePath', 'files[]'],
  },
  'settings.getStatus': {
    method: 'GET',
    mount: '/api/settings',
    path: '/status',
    request: null as unknown as SettingsGetStatusRequest,
    response: null as unknown as SettingsGetStatusResponse,
  },
  'settings.getGlobal': {
    method: 'GET',
    mount: '/api/settings',
    path: '/global',
    request: null as unknown as SettingsGetGlobalRequest,
    response: null as unknown as SettingsGetGlobalResponse,
  },
  'settings.updateGlobal': {
    method: 'PUT',
    mount: '/api/settings',
    path: '/global',
    request: null as unknown as SettingsUpdateGlobalRequest,
    response: null as unknown as SettingsUpdateGlobalResponse,
  },
  'settings.getCredentials': {
    method: 'GET',
    mount: '/api/settings',
    path: '/credentials',
    request: null as unknown as SettingsGetCredentialsRequest,
    response: null as unknown as SettingsGetCredentialsResponse,
  },
  'settings.updateCredentials': {
    method: 'PUT',
    mount: '/api/settings',
    path: '/credentials',
    request: null as unknown as SettingsUpdateCredentialsRequest,
    response: null as unknown as SettingsUpdateCredentialsResponse,
  },
  'settings.getProject': {
    method: 'POST',
    mount: '/api/settings',
    path: '/project',
    request: null as unknown as SettingsGetProjectRequest,
    response: null as unknown as SettingsGetProjectResponse,
    pathParams: ['projectPath'],
  },
  'settings.updateProject': {
    method: 'PUT',
    mount: '/api/settings',
    path: '/project',
    request: null as unknown as SettingsUpdateProjectRequest,
    response: null as unknown as SettingsUpdateProjectResponse,
    pathParams: ['projectPath'],
  },
  'settings.migrate': {
    method: 'POST',
    mount: '/api/settings',
    path: '/migrate',
    request: null as unknown as SettingsMigrateRequest,
    response: null as unknown as SettingsMigrateResponse,
  },
  'settings.discoverAgents': {
    method: 'POST',
    mount: '/api/settings',
    path: '/agents/discover',
    request: null as unknown as SettingsDiscoverAgentsRequest,
    response: null as unknown as SettingsDiscoverAgentsResponse,
  },
  'projects.getOverview': {
    method: 'GET',
    mount: '/api/projects',
    path: '/overview',
    request: null as unknown as ProjectsGetOverviewRequest,
    response: null as unknown as ProjectsGetOverviewResponse,
  },
  'context.describeImage': {
    method: 'POST',
    mount: '/api/context',
    path: '/describe-image',
    request: null as unknown as ContextDescribeImageRequest,
    response: null as unknown as ContextDescribeImageResponse,
  },
  'context.describeFile': {
    method: 'POST',
    mount: '/api/context',
    path: '/describe-file',
    request: null as unknown as ContextDescribeFileRequest,
    response: null as unknown as ContextDescribeFileResponse,
  },
  'specRegeneration.create': {
    method: 'POST',
    mount: '/api/spec-regeneration',
    path: '/create',
    request: null as unknown as SpecRegenerationCreateRequest,
    response: null as unknown as SpecRegenerationCreateResponse,
  },
  'specRegeneration.generate': {
    method: 'POST',
    mount: '/api/spec-regeneration',
    path: '/generate',
    request: null as unknown as SpecRegenerationGenerateRequest,
    response: null as unknown as SpecRegenerationGenerateResponse,
  },
  'specRegeneration.generateFeatures': {
    method: 'POST',
    mount: '/api/spec-regeneration',
    path: '/generate-features',
    request: null as unknown as SpecRegenerationGenerateFeaturesRequest,
    response: null as unknown as SpecRegenerationGenerateFeaturesResponse,
  },
  'specRegeneration.sync': {
    method: 'POST',
    mount: '/api/spec-regeneration',
    path: '/sync',
    request: null as unknown as SpecRegenerationSyncRequest,
    response: null as unknown as SpecRegenerationSyncResponse,
  },
  'specRegeneration.stop': {
    method: 'POST',
    mount: '/api/spec-regeneration',
    path: '/stop',
    request: null as unknown as SpecRegenerationStopRequest,
    response: null as unknown as SpecRegenerationStopResponse,
  },
  'specRegeneration.status': {
    method: 'GET',
    mount: '/api/spec-regeneration',
    path: '/status',
    request: null as unknown as SpecRegenerationStatusRequest,
    response: null as unknown as SpecRegenerationStatusResponse,
  },
  'backlogPlan.generate': {
    method: 'POST',
    mount: '/api/backlog-plan',
    path: '/generate',
    request: null as unknown as BacklogPlanGenerateRequest,
    response: null as unknown as BacklogPlanGenerateResponse,
    pathParams: ['projectPath'],
  },
  'backlogPlan.stop': {
    method: 'POST',
    mount: '/api/backlog-plan',
    path: '/stop',
    request: null as unknown as BacklogPlanStopRequest,
    response: null as unknown as BacklogPlanStopResponse,
  },
  'backlogPlan.status': {
    method: 'GET',
    mount: '/api/backlog-plan',
    path: '/status',
    request: null as unknown as BacklogPlanStatusRequest,
    response: null as unknown as BacklogPlanStatusResponse,
    pathParams: ['projectPath'],
  },
  'backlogPlan.apply': {
    method: 'POST',
    mount: '/api/backlog-plan',
    path: '/apply',
    request: null as unknown as BacklogPlanApplyRequest,
    response: null as unknown as BacklogPlanApplyResponse,
    pathParams: ['projectPath'],
  },
  'backlogPlan.clear': {
    method: 'POST',
    mount: '/api/backlog-plan',
    path: '/clear',
    request: null as unknown as BacklogPlanClearRequest,
    response: null as unknown as BacklogPlanClearResponse,
    pathParams: ['projectPath'],
  },
} as const satisfies Record<string, OperationDefinition<unknown, unknown>>;

export type OperationName = keyof typeof OPERATIONS;
export type OperationOf<N extends OperationName> = (typeof OPERATIONS)[N];
export type RequestOf<N extends OperationName> = (typeof OPERATIONS)[N]['request'];
export type ResponseOf<N extends OperationName> = (typeof OPERATIONS)[N]['response'];
export type MethodOf<N extends OperationName> = (typeof OPERATIONS)[N]['method'];

/** The full request path for an operation: mount + path. */
export function operationPath(name: OperationName): string {
  const def = OPERATIONS[name];
  return `${def.mount}${def.path}`;
}

export function operationMount(name: OperationName): string {
  return OPERATIONS[name].mount;
}

export function operationNames(): OperationName[] {
  return Object.keys(OPERATIONS) as OperationName[];
}

export function operationNamesForMount(mount: string): OperationName[] {
  return operationNames().filter((name) => OPERATIONS[name].mount === mount);
}

export function operationMounts(): string[] {
  return [...new Set(operationNames().map((name) => OPERATIONS[name].mount))];
}

/**
 * Returns a description of every duplicate `METHOD full/path` pair in the
 * registry. Empty when every operation is unique by construction.
 */
export function findDuplicateOperations(): string[] {
  const seen = new Map<string, OperationName>();
  const duplicates: string[] = [];
  for (const name of operationNames()) {
    const key = `${OPERATIONS[name].method} ${operationPath(name)}`;
    const previous = seen.get(key);
    if (previous) {
      duplicates.push(`${key} (declared by ${previous} and ${name})`);
    } else {
      seen.set(key, name);
    }
  }
  return duplicates;
}

/** Throws when two operations share a method and full path. */
export function assertUniqueOperations(): void {
  const duplicates = findDuplicateOperations();
  if (duplicates.length > 0) {
    throw new Error(`Duplicate operation routes:\n${duplicates.join('\n')}`);
  }
}
