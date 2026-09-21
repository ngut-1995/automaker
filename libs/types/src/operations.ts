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
import type { AgentDefinition, ModelDefinition, ReasoningEffort } from './provider.js';
import type {
  Credentials,
  GlobalSettings,
  MCPToolInfo,
  ProjectSettings,
  ThinkingLevel,
} from './settings.js';
import type {
  AnalysisSuggestion,
  ConvertToFeatureOptions,
  CreateIdeaInput,
  Idea,
  IdeaCategory,
  IdeationContextSources,
  IdeationMessage,
  IdeationPrompt,
  IdeationSession,
  ProjectAnalysisResult,
  PromptCategory,
  SendMessageOptions,
  StartSessionOptions,
  UpdateIdeaInput,
} from './ideation.js';
import type { GitHubComment, LinkedPRInfo, StoredValidation } from './issue-validation.js';
import type { ModelId } from './model.js';
import type { AgentSession, SessionListItem } from './session.js';
import type { Notification } from './notification.js';
import type {
  EventHistoryFilter,
  EventReplayResult,
  StoredEvent,
  StoredEventSummary,
} from './event-history.js';
import type { PipelineConfig, PipelineStep } from './pipeline.js';
import type {
  ClaudeUsageResponse,
  CodexUsageResponse,
  GeminiUsage,
  ZaiUsageResponse,
} from './usage.js';

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

// ---------------------------------------------------------------------------
// Ideation mount (/api/ideation)
// ---------------------------------------------------------------------------

export interface IdeationSessionStartRequest {
  projectPath: string;
  options?: StartSessionOptions;
}
export interface IdeationSessionStartResponse {
  success: boolean;
  session?: IdeationSession;
  error?: string;
}

export interface IdeationSessionMessageRequest {
  sessionId: string;
  message: string;
  options?: SendMessageOptions;
}
export interface IdeationSessionMessageResponse {
  success: boolean;
  error?: string;
}

export interface IdeationSessionStopRequest {
  sessionId: string;
  projectPath?: string;
}
export interface IdeationSessionStopResponse {
  success: boolean;
  error?: string;
}

export interface IdeationSessionGetRequest {
  projectPath: string;
  sessionId: string;
}
export interface IdeationSessionGetResponse {
  success: boolean;
  session?: IdeationSession & { isRunning?: boolean };
  messages?: IdeationMessage[];
  error?: string;
}

export interface IdeationIdeasListRequest {
  projectPath: string;
}
export interface IdeationIdeasListResponse {
  success: boolean;
  ideas?: Idea[];
  error?: string;
}

export interface IdeationIdeasCreateRequest {
  projectPath: string;
  idea: CreateIdeaInput;
}
export interface IdeationIdeasCreateResponse {
  success: boolean;
  idea?: Idea;
  error?: string;
}

export interface IdeationIdeasGetRequest {
  projectPath: string;
  ideaId: string;
}
export interface IdeationIdeasGetResponse {
  success: boolean;
  idea?: Idea;
  error?: string;
}

export interface IdeationIdeasUpdateRequest {
  projectPath: string;
  ideaId: string;
  updates: UpdateIdeaInput;
}
export interface IdeationIdeasUpdateResponse {
  success: boolean;
  idea?: Idea;
  error?: string;
}

export interface IdeationIdeasDeleteRequest {
  projectPath: string;
  ideaId: string;
}
export interface IdeationIdeasDeleteResponse {
  success: boolean;
  error?: string;
}

export interface IdeationAnalyzeRequest {
  projectPath: string;
}
export interface IdeationAnalyzeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface IdeationAnalysisRequest {
  projectPath: string;
}
export interface IdeationAnalysisResponse {
  success: boolean;
  result?: ProjectAnalysisResult | null;
  error?: string;
}

export interface IdeationConvertRequest extends ConvertToFeatureOptions {
  projectPath: string;
  ideaId: string;
}
export interface IdeationConvertResponse {
  success: boolean;
  feature?: Feature;
  featureId?: string;
  error?: string;
}

export interface IdeationAddSuggestionRequest {
  projectPath: string;
  suggestion: AnalysisSuggestion;
}
export interface IdeationAddSuggestionResponse {
  success: boolean;
  featureId?: string;
  error?: string;
}

export type IdeationPromptsRequest = Record<string, never>;
export interface IdeationPromptsResponse {
  success: boolean;
  prompts?: IdeationPrompt[];
  categories?: PromptCategory[];
  error?: string;
}

export interface IdeationPromptsByCategoryRequest {
  category: IdeaCategory;
}
export interface IdeationPromptsByCategoryResponse {
  success: boolean;
  prompts?: IdeationPrompt[];
  error?: string;
}

export interface IdeationSuggestionsGenerateRequest {
  projectPath: string;
  promptId: string;
  category: IdeaCategory;
  count?: number;
  contextSources?: IdeationContextSources;
}
export interface IdeationSuggestionsGenerateResponse {
  success: boolean;
  suggestions?: AnalysisSuggestion[];
  error?: string;
}

// ---------------------------------------------------------------------------
// GitHub mount (/api/github)
// ---------------------------------------------------------------------------

export interface GitHubLabelShape {
  name: string;
  color: string;
}
export interface GitHubAuthorShape {
  login: string;
  avatarUrl?: string;
}
export interface GitHubAssigneeShape {
  login: string;
  avatarUrl?: string;
}
export interface GitHubLinkedPullRequestShape {
  number: number;
  title: string;
  state: string;
  url: string;
}
export interface GitHubIssueShape {
  number: number;
  title: string;
  state: string;
  author: GitHubAuthorShape;
  createdAt: string;
  labels: GitHubLabelShape[];
  url: string;
  body: string;
  assignees: GitHubAssigneeShape[];
  linkedPRs?: GitHubLinkedPullRequestShape[];
}
export interface GitHubPRShape {
  number: number;
  title: string;
  state: string;
  author: GitHubAuthorShape;
  createdAt: string;
  labels: GitHubLabelShape[];
  url: string;
  isDraft: boolean;
  headRefName: string;
  reviewDecision: string | null;
  mergeable: string;
  body: string;
}
/** Mirrors the UI's `PRReviewComment` (the contract cannot import from the UI). */
export interface PRReviewCommentShape {
  id: string;
  author: string;
  avatarUrl?: string;
  body: string;
  path?: string;
  line?: number;
  createdAt: string;
  updatedAt?: string;
  isReviewComment: boolean;
  isOutdated?: boolean;
  isResolved?: boolean;
  threadId?: string;
  diffHunk?: string;
  side?: string;
  commitId?: string;
  isBot?: boolean;
}

export interface GitHubCheckRemoteRequest {
  projectPath: string;
}
export interface GitHubCheckRemoteResponse {
  success: boolean;
  hasGitHubRemote?: boolean;
  remoteUrl?: string | null;
  owner?: string | null;
  repo?: string | null;
  error?: string;
}

export interface GitHubListIssuesRequest {
  projectPath: string;
}
export interface GitHubListIssuesResponse {
  success: boolean;
  openIssues?: GitHubIssueShape[];
  closedIssues?: GitHubIssueShape[];
  error?: string;
}

export interface GitHubListPRsRequest {
  projectPath: string;
}
export interface GitHubListPRsResponse {
  success: boolean;
  openPRs?: GitHubPRShape[];
  mergedPRs?: GitHubPRShape[];
  error?: string;
}

export interface GitHubGetIssueCommentsRequest {
  projectPath: string;
  issueNumber: number;
  cursor?: string;
}
export interface GitHubGetIssueCommentsResponse {
  success: boolean;
  comments?: GitHubComment[];
  totalCount?: number;
  hasNextPage?: boolean;
  endCursor?: string;
  error?: string;
}

export interface GitHubGetPRReviewCommentsRequest {
  projectPath: string;
  prNumber: number;
}
export interface GitHubGetPRReviewCommentsResponse {
  success: boolean;
  comments?: PRReviewCommentShape[];
  totalCount?: number;
  error?: string;
}

export interface GitHubResolveReviewThreadRequest {
  projectPath: string;
  threadId: string;
  resolve: boolean;
}
export interface GitHubResolveReviewThreadResponse {
  success: boolean;
  isResolved?: boolean;
  error?: string;
}

export interface GitHubValidateIssueRequest {
  projectPath: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  issueLabels?: string[];
  model?: ModelId;
  thinkingLevel?: ThinkingLevel;
  reasoningEffort?: ReasoningEffort;
  providerId?: string;
  comments?: GitHubComment[];
  linkedPRs?: LinkedPRInfo[];
}
export interface GitHubValidateIssueResponse {
  success: boolean;
  message?: string;
  issueNumber?: number;
  error?: string;
}

export interface GitHubGetValidationStatusRequest {
  projectPath: string;
  issueNumber?: number;
}
export interface GitHubGetValidationStatusResponse {
  success: boolean;
  isRunning?: boolean;
  startedAt?: string;
  runningIssues?: number[];
  error?: string;
}

export interface GitHubStopValidationRequest {
  projectPath: string;
  issueNumber: number;
}
export interface GitHubStopValidationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface GitHubGetValidationsRequest {
  projectPath: string;
  issueNumber?: number;
}
export interface GitHubGetValidationsResponse {
  success: boolean;
  validation?: StoredValidation | null;
  validations?: StoredValidation[];
  isStale?: boolean;
  error?: string;
}

export interface GitHubDeleteValidationRequest {
  projectPath: string;
  issueNumber: number;
}
export interface GitHubDeleteValidationResponse {
  success: boolean;
  deleted?: boolean;
  error?: string;
}

export interface GitHubMarkValidationViewedRequest {
  projectPath: string;
  issueNumber: number;
}
export interface GitHubMarkValidationViewedResponse {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Git mount (/api/git)
// ---------------------------------------------------------------------------

export interface GitDiffsRequest {
  projectPath: string;
}
export interface GitDiffsResponse {
  success: boolean;
  diff?: string;
  files?: WorktreeFileStatus[];
  hasChanges?: boolean;
  error?: string;
  mergeState?: MergeStateInfo;
}

export interface GitFileDiffRequest {
  projectPath: string;
  filePath: string;
}
export interface GitFileDiffResponse {
  success: boolean;
  diff?: string;
  filePath?: string;
  error?: string;
}

export interface GitStageFilesRequest {
  projectPath: string;
  files: string[];
  operation: 'stage' | 'unstage';
}
export interface GitStageFilesResponse {
  success: boolean;
  result?: {
    operation: 'stage' | 'unstage';
    filesCount: number;
  };
  error?: string;
}

/** Mirrors the UI's `GitFileDetails` (the contract cannot import from the UI). */
export interface GitFileDetailsShape {
  branch: string;
  lastCommitHash: string;
  lastCommitMessage: string;
  lastCommitAuthor: string;
  lastCommitTimestamp: string;
  linesAdded: number;
  linesRemoved: number;
  isConflicted: boolean;
  isStaged: boolean;
  isUnstaged: boolean;
  statusLabel: string;
}

export interface GitDetailsRequest {
  projectPath: string;
  filePath?: string;
}
export interface GitDetailsResponse {
  success: boolean;
  details?: GitFileDetailsShape;
  error?: string;
}

/** Mirrors the UI's `EnhancedFileStatus` (the contract cannot import from the UI). */
export interface GitEnhancedFileStatusShape {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  isConflicted: boolean;
  isStaged: boolean;
  isUnstaged: boolean;
  linesAdded: number;
  linesRemoved: number;
  statusLabel: string;
}

export interface GitEnhancedStatusRequest {
  projectPath: string;
}
export interface GitEnhancedStatusResponse {
  success: boolean;
  branch?: string;
  files?: GitEnhancedFileStatusShape[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Templates mount (/api/templates)
// ---------------------------------------------------------------------------

export interface TemplatesCloneRequest {
  repoUrl: string;
  projectName: string;
  parentDir: string;
}
export interface TemplatesCloneResponse {
  success: boolean;
  projectPath?: string;
  projectName?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Models mount (/api/models)
// ---------------------------------------------------------------------------

/** Mirrors the UI's `ModelDefinition` (the contract cannot import from the UI). */
export interface ModelDefinitionShape {
  id: string;
  name: string;
  modelString: string;
  provider: string;
  description: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
  tier?: 'basic' | 'standard' | 'premium' | string;
  default?: boolean;
  hasReasoning?: boolean;
}

/** Mirrors the UI's `ProviderStatus` (the contract cannot import from the UI). */
export interface ModelProviderStatusShape {
  status: 'installed' | 'not_installed' | 'api_key_only';
  method?: string;
  version?: string;
  path?: string;
  recommendation?: string;
  installCommands?: {
    macos?: string;
    windows?: string;
    linux?: string;
    npm?: string;
  };
}

export type ModelsAvailableRequest = Record<string, never>;
export interface ModelsAvailableResponse {
  success: boolean;
  models?: ModelDefinitionShape[];
  error?: string;
}

export type ModelsProvidersRequest = Record<string, never>;
export interface ModelsProvidersResponse {
  success: boolean;
  providers?: Record<string, ModelProviderStatusShape>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Filesystem mount (/api/fs)
// ---------------------------------------------------------------------------

export interface FsFileEntryShape {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface FsFileStatsShape {
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtime: Date;
}

export interface FsReadRequest {
  filePath: string;
}
export interface FsReadResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface FsWriteRequest {
  filePath: string;
  content: string;
}
export interface FsWriteResponse {
  success: boolean;
  error?: string;
}

export interface FsMkdirRequest {
  dirPath: string;
}
export type FsMkdirResponse = FsWriteResponse;

export interface FsReaddirRequest {
  dirPath: string;
}
export interface FsReaddirResponse {
  success: boolean;
  entries?: FsFileEntryShape[];
  error?: string;
}

export interface FsExistsRequest {
  filePath: string;
}
export interface FsExistsResponse {
  success: boolean;
  exists: boolean;
  error?: string;
}

export interface FsStatRequest {
  filePath: string;
}
export interface FsStatResponse {
  success: boolean;
  stats?: FsFileStatsShape;
  error?: string;
}

export interface FsDeleteRequest {
  filePath: string;
}
export type FsDeleteResponse = FsWriteResponse;

export interface FsValidatePathRequest {
  filePath: string;
}
export interface FsValidatePathResponse {
  success: boolean;
  path?: string;
  isAllowed?: boolean;
  error?: string;
}

export interface FsResolveDirectoryRequest {
  directoryName: string;
  sampleFiles?: string[];
  fileCount?: number;
}
export interface FsResolveDirectoryResponse {
  success: boolean;
  path?: string;
  error?: string;
}

export interface FsSaveImageRequest {
  data: string;
  filename: string;
  mimeType?: string;
  projectPath?: string;
}
export interface FsSaveImageResponse {
  success: boolean;
  path?: string;
  error?: string;
}

export interface FsBrowseRequest {
  dirPath?: string;
}
export interface FsDirectoryEntryShape {
  name: string;
  path: string;
}
export interface FsBrowseResponse {
  success: boolean;
  currentPath?: string;
  parentPath?: string | null;
  directories?: FsDirectoryEntryShape[];
  drives?: string[];
  warning?: string;
  error?: string;
}

export interface FsImageRequest {
  path: string;
  projectPath?: string;
}
export type FsImageResponse = unknown;

export interface FsSaveBoardBackgroundRequest {
  data: string;
  filename: string;
  mimeType?: string;
  projectPath: string;
}
export type FsSaveBoardBackgroundResponse = FsSaveImageResponse;

export interface FsDeleteBoardBackgroundRequest {
  projectPath: string;
}
export type FsDeleteBoardBackgroundResponse = FsWriteResponse;

export interface FsProjectFileEntryShape {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  isFile: boolean;
}
export interface FsBrowseProjectFilesRequest {
  projectPath: string;
  relativePath?: string;
}
export interface FsBrowseProjectFilesResponse {
  success: boolean;
  currentRelativePath?: string;
  parentRelativePath?: string | null;
  entries?: FsProjectFileEntryShape[];
  warning?: string;
  error?: string;
}

export interface FsCopyRequest {
  sourcePath: string;
  destinationPath: string;
  overwrite?: boolean;
}
export interface FsCopyResponse {
  success: boolean;
  exists?: boolean;
  error?: string;
}
export type FsMoveRequest = FsCopyRequest;
export type FsMoveResponse = FsCopyResponse;

export interface FsDownloadRequest {
  filePath: string;
}
export type FsDownloadResponse = void;

// ---------------------------------------------------------------------------
// Terminal mount (/api/terminal)
// ---------------------------------------------------------------------------

export interface TerminalPlatformInfoShape {
  platform: string;
  isWSL: boolean;
  defaultShell: string;
  arch: string;
}

export type TerminalStatusRequest = Record<string, never>;
export interface TerminalStatusResponse {
  success: boolean;
  data?: {
    enabled: boolean;
    passwordRequired: boolean;
    platform: TerminalPlatformInfoShape;
  };
  error?: string;
}

export interface TerminalAuthRequest {
  password?: string;
}
export interface TerminalAuthResponse {
  success: boolean;
  data?: {
    authenticated: boolean;
    passwordRequired?: boolean;
    token?: string;
    expiresIn?: number;
  };
  error?: string;
}

export interface TerminalLogoutRequest {
  token?: string;
}
export interface TerminalLogoutResponse {
  success: boolean;
}

export interface TerminalSessionShape {
  id: string;
  cwd: string;
  createdAt: Date;
  shell: string;
}

export type TerminalSessionsRequest = Record<string, never>;
export interface TerminalSessionsResponse {
  success: boolean;
  data?: TerminalSessionShape[];
  error?: string;
}

export interface TerminalCreateSessionRequest {
  cwd?: string;
  cols?: number;
  rows?: number;
  shell?: string;
}
export interface TerminalCreateSessionResponse {
  success: boolean;
  data?: {
    id: string;
    cwd: string;
    shell: string;
    createdAt: Date;
  };
  error?: string;
  details?: string;
  currentSessions?: number;
  maxSessions?: number;
}

export interface TerminalDeleteSessionRequest {
  id: string;
}
export interface TerminalDeleteSessionResponse {
  success: boolean;
  error?: string;
}

export interface TerminalResizeSessionRequest {
  id: string;
  cols: number;
  rows: number;
}
export type TerminalResizeSessionResponse = TerminalDeleteSessionResponse;

export type TerminalGetSettingsRequest = Record<string, never>;
export interface TerminalGetSettingsResponse {
  success: boolean;
  data?: {
    maxSessions: number;
    currentSessions: number;
  };
  error?: string;
  details?: string;
}

export interface TerminalUpdateSettingsRequest {
  maxSessions?: number;
}
export type TerminalUpdateSettingsResponse = TerminalGetSettingsResponse;

// ---------------------------------------------------------------------------
// Workspace mount (/api/workspace)
// ---------------------------------------------------------------------------

export type WorkspaceConfigRequest = Record<string, never>;
export interface WorkspaceConfigResponse {
  success: boolean;
  configured: boolean;
  workspaceDir?: string;
  defaultDir?: string | null;
  error?: string;
}

export type WorkspaceDirectoriesRequest = Record<string, never>;
export interface WorkspaceDirectoriesResponse {
  success: boolean;
  directories?: FsDirectoryEntryShape[];
  error?: string;
}

// ---------------------------------------------------------------------------
// MCP mount (/api/mcp)
// ---------------------------------------------------------------------------

export interface McpTestServerRequest {
  serverId: string;
}
export interface McpTestServerResponse {
  success: boolean;
  tools?: MCPToolInfo[];
  error?: string;
  connectionTime?: number;
  serverInfo?: {
    name?: string;
    version?: string;
  };
}

export interface McpListToolsRequest {
  serverId: string;
}
export interface McpListToolsResponse {
  success: boolean;
  tools?: MCPToolInfo[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Health mount (/api/health)
// ---------------------------------------------------------------------------

export type HealthCheckRequest = Record<string, never>;
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version: string;
}

export type HealthEnvironmentRequest = Record<string, never>;
export interface HealthEnvironmentResponse {
  isContainerized: boolean;
  skipSandboxWarning?: boolean;
}

export type HealthDetailedRequest = Record<string, never>;
export interface HealthDetailedResponse {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  dataDir: string;
  auth: {
    enabled: boolean;
    method: string;
  };
  env: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

// ---------------------------------------------------------------------------
// Auth mount (/api/auth)
// ---------------------------------------------------------------------------

export type AuthStatusRequest = Record<string, never>;
export interface AuthStatusResponse {
  success: boolean;
  authenticated: boolean;
  required: boolean;
  error?: string;
}

export interface AuthLoginRequest {
  apiKey: string;
}
export interface AuthLoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  error?: string;
  retryAfter?: number;
}

export type AuthTokenRequest = Record<string, never>;
export interface AuthTokenResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  error?: string;
}

export type AuthLogoutRequest = Record<string, never>;
export interface AuthLogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Sessions mount (/api/sessions)
// ---------------------------------------------------------------------------

export interface SessionsListRequest {
  includeArchived?: boolean;
}
export interface SessionsListResponse {
  success: boolean;
  sessions?: SessionListItem[];
  error?: string;
}

export interface SessionsCreateRequest {
  name: string;
  projectPath?: string;
  workingDirectory?: string;
  model?: string;
}
export interface SessionsCreateResponse {
  success: boolean;
  session?: AgentSession;
  sessionId?: string;
  error?: string;
}

export interface SessionsUpdateRequest {
  sessionId: string;
  name?: string;
  tags?: string[];
  model?: string;
}
export interface SessionsUpdateResponse {
  success: boolean;
  session?: AgentSession;
  error?: string;
}

export interface SessionsArchiveRequest {
  sessionId: string;
}
export interface SessionsArchiveResponse {
  success: boolean;
  error?: string;
}

export interface SessionsUnarchiveRequest {
  sessionId: string;
}
export interface SessionsUnarchiveResponse {
  success: boolean;
  error?: string;
}

export interface SessionsDeleteRequest {
  sessionId: string;
}
export interface SessionsDeleteResponse {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Agent mount (/api/agent)
// ---------------------------------------------------------------------------

/** Image attachment shape carried on an agent message. */
export interface AgentMessageImage {
  id?: string;
  data: string;
  mimeType: string;
  filename: string;
  size?: number;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
  images?: AgentMessageImage[];
}

export interface AgentQueuedPrompt {
  id: string;
  message: string;
  imagePaths?: string[];
  model?: string;
  thinkingLevel?: string;
  addedAt: string;
}

export interface AgentStartRequest {
  sessionId: string;
  workingDirectory?: string;
}
export interface AgentStartResponse {
  success: boolean;
  messages?: AgentMessage[];
  sessionId?: string;
  error?: string;
}

export interface AgentSendRequest {
  sessionId: string;
  message: string;
  workingDirectory?: string;
  imagePaths?: string[];
  model?: string;
  thinkingLevel?: string;
}
export interface AgentSendResponse {
  success: boolean;
  error?: string;
}

export interface AgentHistoryRequest {
  sessionId: string;
}
export interface AgentHistoryResponse {
  success: boolean;
  messages?: AgentMessage[];
  isRunning?: boolean;
  error?: string;
}

export interface AgentStopRequest {
  sessionId: string;
}
export interface AgentStopResponse {
  success: boolean;
  error?: string;
}

export interface AgentClearRequest {
  sessionId: string;
}
export interface AgentClearResponse {
  success: boolean;
  error?: string;
}

export interface AgentModelRequest {
  sessionId: string;
  model: string;
}
export interface AgentModelResponse {
  success: boolean;
  error?: string;
}

export interface AgentQueueAddRequest {
  sessionId: string;
  message: string;
  imagePaths?: string[];
  model?: string;
  thinkingLevel?: string;
}
export interface AgentQueueAddResponse {
  success: boolean;
  queuedPrompt?: AgentQueuedPrompt;
  error?: string;
}

export interface AgentQueueListRequest {
  sessionId: string;
}
export interface AgentQueueListResponse {
  success: boolean;
  queue?: AgentQueuedPrompt[];
  error?: string;
}

export interface AgentQueueRemoveRequest {
  sessionId: string;
  promptId: string;
}
export interface AgentQueueRemoveResponse {
  success: boolean;
  error?: string;
}

export interface AgentQueueClearRequest {
  sessionId: string;
}
export interface AgentQueueClearResponse {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Notifications mount (/api/notifications)
// ---------------------------------------------------------------------------

export interface NotificationsListRequest {
  projectPath: string;
}
export interface NotificationsListResponse {
  success: boolean;
  notifications?: Notification[];
  error?: string;
}

export interface NotificationsUnreadCountRequest {
  projectPath: string;
}
export interface NotificationsUnreadCountResponse {
  success: boolean;
  count?: number;
  error?: string;
}

export interface NotificationsMarkReadRequest {
  projectPath: string;
  notificationId?: string;
}
export interface NotificationsMarkReadResponse {
  success: boolean;
  notification?: Notification;
  count?: number;
  error?: string;
}

export interface NotificationsDismissRequest {
  projectPath: string;
  notificationId?: string;
}
export interface NotificationsDismissResponse {
  success: boolean;
  dismissed?: boolean;
  count?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Event History mount (/api/event-history)
// ---------------------------------------------------------------------------

export interface EventHistoryListRequest {
  projectPath: string;
  filter?: EventHistoryFilter;
}
export interface EventHistoryListResponse {
  success: boolean;
  events?: StoredEventSummary[];
  total?: number;
  error?: string;
}

export interface EventHistoryGetRequest {
  projectPath: string;
  eventId: string;
}
export interface EventHistoryGetResponse {
  success: boolean;
  event?: StoredEvent;
  error?: string;
}

export interface EventHistoryDeleteRequest {
  projectPath: string;
  eventId: string;
}
export interface EventHistoryDeleteResponse {
  success: boolean;
  error?: string;
}

export interface EventHistoryClearRequest {
  projectPath: string;
}
export interface EventHistoryClearResponse {
  success: boolean;
  cleared?: number;
  error?: string;
}

export interface EventHistoryReplayRequest {
  projectPath: string;
  eventId: string;
  hookIds?: string[];
}
export interface EventHistoryReplayResponse {
  success: boolean;
  result?: EventReplayResult;
  error?: string;
}

// ---------------------------------------------------------------------------
// Pipeline mount (/api/pipeline)
// ---------------------------------------------------------------------------

export interface PipelineGetConfigRequest {
  projectPath: string;
}
export interface PipelineGetConfigResponse {
  success: boolean;
  config?: PipelineConfig;
  error?: string;
}

export interface PipelineSaveConfigRequest {
  projectPath: string;
  config: PipelineConfig;
}
export interface PipelineSaveConfigResponse {
  success: boolean;
  error?: string;
}

export interface PipelineStepInput {
  name: string;
  order: number;
  instructions: string;
  colorClass: string;
}

export interface PipelineAddStepRequest {
  projectPath: string;
  step: PipelineStepInput;
}
export interface PipelineAddStepResponse {
  success: boolean;
  step?: PipelineStep;
  error?: string;
}

export interface PipelineUpdateStepRequest {
  projectPath: string;
  stepId: string;
  updates: Partial<PipelineStepInput>;
}
export interface PipelineUpdateStepResponse {
  success: boolean;
  step?: PipelineStep;
  error?: string;
}

export interface PipelineDeleteStepRequest {
  projectPath: string;
  stepId: string;
}
export interface PipelineDeleteStepResponse {
  success: boolean;
  error?: string;
}

export interface PipelineReorderStepsRequest {
  projectPath: string;
  stepIds: string[];
}
export interface PipelineReorderStepsResponse {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Enhance Prompt mount (/api/enhance-prompt)
// ---------------------------------------------------------------------------

export interface EnhancePromptRequest {
  originalText: string;
  enhancementMode: string;
  model?: string;
  thinkingLevel?: string;
  projectPath?: string;
}
export interface EnhancePromptResponse {
  success: boolean;
  enhancedText?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Claude usage mount (/api/claude)
// ---------------------------------------------------------------------------

export type ClaudeGetUsageRequest = Record<string, never>;
export type ClaudeGetUsageResponse = ClaudeUsageResponse;

// ---------------------------------------------------------------------------
// Codex usage mount (/api/codex)
// ---------------------------------------------------------------------------

export type CodexGetUsageRequest = Record<string, never>;
export type CodexGetUsageResponse = CodexUsageResponse;

export interface CodexModelInfo {
  id: string;
  label: string;
  description: string;
  hasThinking: boolean;
  supportsVision: boolean;
  tier: 'premium' | 'standard' | 'basic';
  isDefault: boolean;
}

export interface CodexGetModelsRequest {
  refresh?: boolean;
}
export interface CodexGetModelsResponse {
  success: boolean;
  models?: CodexModelInfo[];
  cachedAt?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// z.ai usage mount (/api/zai)
// ---------------------------------------------------------------------------

export type ZaiGetStatusRequest = Record<string, never>;
export interface ZaiGetStatusResponse {
  success: boolean;
  available: boolean;
  message?: string;
  hasApiKey?: boolean;
  hasEnvApiKey?: boolean;
  error?: string;
}

export type ZaiGetUsageRequest = Record<string, never>;
export type ZaiGetUsageResponse = ZaiUsageResponse;

export interface ZaiConfigureRequest {
  apiToken?: string;
  apiHost?: string;
}
export interface ZaiConfigureResponse {
  success: boolean;
  message?: string;
  isAvailable?: boolean;
  error?: string;
}

export interface ZaiVerifyRequest {
  apiKey: string;
}
export interface ZaiVerifyResponse {
  success: boolean;
  authenticated: boolean;
  message?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Gemini usage mount (/api/gemini)
// ---------------------------------------------------------------------------

export type GeminiGetUsageRequest = Record<string, never>;
export type GeminiGetUsageResponse = GeminiUsage;

export type GeminiGetStatusRequest = Record<string, never>;
export interface GeminiGetStatusResponse {
  success: boolean;
  installed?: boolean;
  version?: string | null;
  path?: string | null;
  authenticated?: boolean;
  authMethod?: string;
  hasCredentialsFile?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Setup mount (/api/setup)
// ---------------------------------------------------------------------------

/** Generic success/message payload shared by install, auth-connect and cache ops. */
export interface SetupSuccessMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/** Payload for CLI auth operations that may open a terminal. */
export interface SetupAuthCommandResponse {
  success: boolean;
  token?: string;
  requiresManualAuth?: boolean;
  terminalOpened?: boolean;
  command?: string;
  message?: string;
  error?: string;
  output?: string;
}

/** Payload for CLI deauth operations. */
export interface SetupDeauthResponse {
  success: boolean;
  requiresManualDeauth?: boolean;
  command?: string;
  message?: string;
  error?: string;
}

export type SetupClaudeStatusRequest = Record<string, never>;
export interface SetupClaudeAuthStatus {
  authenticated: boolean;
  method: string;
  hasCredentialsFile?: boolean;
  hasToken?: boolean;
  hasStoredOAuthToken?: boolean;
  hasStoredApiKey?: boolean;
  hasEnvApiKey?: boolean;
  hasEnvOAuthToken?: boolean;
  hasCliAuth?: boolean;
  hasRecentActivity?: boolean;
}
export interface SetupClaudeStatusResponse {
  success: boolean;
  status?: string;
  installed?: boolean;
  method?: string;
  version?: string;
  path?: string;
  auth?: SetupClaudeAuthStatus;
  error?: string;
}

export type SetupInstallClaudeRequest = Record<string, never>;
export type SetupInstallClaudeResponse = SetupSuccessMessageResponse;

export type SetupAuthClaudeRequest = Record<string, never>;
export type SetupAuthClaudeResponse = SetupAuthCommandResponse;

export type SetupDeauthClaudeRequest = Record<string, never>;
export type SetupDeauthClaudeResponse = SetupDeauthResponse;

export interface SetupStoreApiKeyRequest {
  provider: string;
  apiKey: string;
}
export interface SetupStoreApiKeyResponse {
  success: boolean;
  error?: string;
}

export interface SetupDeleteApiKeyRequest {
  provider: string;
}
export interface SetupDeleteApiKeyResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export type SetupApiKeysRequest = Record<string, never>;
export interface SetupApiKeysResponse {
  success: boolean;
  hasAnthropicKey: boolean;
  hasGoogleKey: boolean;
  hasOpenaiKey: boolean;
}

export type SetupPlatformRequest = Record<string, never>;
export interface SetupPlatformResponse {
  success: boolean;
  platform: string;
  arch: string;
  homeDir: string;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
}

export interface SetupVerifyClaudeAuthRequest {
  authMethod?: 'cli' | 'api_key';
  apiKey?: string;
}
export interface SetupVerifyClaudeAuthResponse {
  success: boolean;
  authenticated: boolean;
  authType?: 'oauth' | 'api_key' | 'cli';
  error?: string;
}

export interface SetupVerifyCodexAuthRequest {
  authMethod: 'cli' | 'api_key';
  apiKey?: string;
}
export interface SetupVerifyCodexAuthResponse {
  success: boolean;
  authenticated: boolean;
  error?: string;
}

export type SetupGhStatusRequest = Record<string, never>;
export interface SetupGhStatusResponse {
  success: boolean;
  installed: boolean;
  authenticated: boolean;
  version: string | null;
  path: string | null;
  user: string | null;
  error?: string;
}

export type SetupCursorStatusRequest = Record<string, never>;
export interface SetupCursorStatusResponse {
  success: boolean;
  installed?: boolean;
  version?: string | null;
  path?: string | null;
  auth?: {
    authenticated: boolean;
    method: string;
  };
  installCommand?: string;
  loginCommand?: string;
  error?: string;
}

export type SetupAuthCursorRequest = Record<string, never>;
export type SetupAuthCursorResponse = SetupAuthCommandResponse;

export type SetupDeauthCursorRequest = Record<string, never>;
export type SetupDeauthCursorResponse = SetupDeauthResponse;

export type SetupCodexStatusRequest = Record<string, never>;
export interface SetupCodexAuthStatus {
  authenticated: boolean;
  method: string;
  hasAuthFile?: boolean;
  hasOAuthToken?: boolean;
  hasApiKey?: boolean;
  hasStoredApiKey?: boolean;
  hasEnvApiKey?: boolean;
}
export interface SetupCodexStatusResponse {
  success: boolean;
  status?: string;
  installed?: boolean;
  method?: string;
  version?: string;
  path?: string;
  auth?: SetupCodexAuthStatus;
  error?: string;
}

export type SetupInstallCodexRequest = Record<string, never>;
export type SetupInstallCodexResponse = SetupSuccessMessageResponse;

export type SetupAuthCodexRequest = Record<string, never>;
export type SetupAuthCodexResponse = SetupAuthCommandResponse;

export type SetupDeauthCodexRequest = Record<string, never>;
export type SetupDeauthCodexResponse = SetupDeauthResponse;

export type SetupOpencodeStatusRequest = Record<string, never>;
export interface SetupInstallCommands {
  macos?: string;
  linux?: string;
  npm?: string;
  windows?: string;
}
export interface SetupOpencodeStatusResponse {
  success: boolean;
  status?: string;
  installed?: boolean;
  method?: string;
  version?: string;
  path?: string;
  recommendation?: string;
  installCommands?: SetupInstallCommands;
  auth?: SetupCodexAuthStatus;
  error?: string;
}

export type SetupAuthOpencodeRequest = Record<string, never>;
export type SetupAuthOpencodeResponse = SetupAuthCommandResponse;

export type SetupDeauthOpencodeRequest = Record<string, never>;
export type SetupDeauthOpencodeResponse = SetupDeauthResponse;

export type SetupGeminiStatusRequest = Record<string, never>;
export interface SetupGeminiStatusResponse {
  success: boolean;
  status?: string;
  installed?: boolean;
  method?: string;
  version?: string;
  path?: string;
  recommendation?: string;
  installCommands?: SetupInstallCommands;
  auth?: {
    authenticated: boolean;
    method: string;
    hasApiKey?: boolean;
    hasEnvApiKey?: boolean;
    error?: string;
  };
  loginCommand?: string;
  installCommand?: string;
  error?: string;
}

export type SetupAuthGeminiRequest = Record<string, never>;
export type SetupAuthGeminiResponse = SetupAuthCommandResponse;

export type SetupDeauthGeminiRequest = Record<string, never>;
export type SetupDeauthGeminiResponse = SetupDeauthResponse;

export type SetupCopilotStatusRequest = Record<string, never>;
export interface SetupCopilotStatusResponse {
  success: boolean;
  status?: string;
  installed?: boolean;
  method?: string;
  version?: string;
  path?: string;
  recommendation?: string;
  auth?: {
    authenticated: boolean;
    method: string;
    login?: string;
    host?: string;
    error?: string;
  };
  loginCommand?: string;
  installCommand?: string;
  error?: string;
}

export type SetupAuthCopilotRequest = Record<string, never>;
export type SetupAuthCopilotResponse = SetupSuccessMessageResponse;

export type SetupDeauthCopilotRequest = Record<string, never>;
export type SetupDeauthCopilotResponse = SetupSuccessMessageResponse;

export interface SetupGetCopilotModelsRequest {
  refresh?: boolean;
}
export interface SetupCopilotModelsResponse {
  success: boolean;
  models?: ModelDefinition[];
  count?: number;
  cached?: boolean;
  error?: string;
}
export type SetupRefreshCopilotModelsRequest = Record<string, never>;
export type SetupRefreshCopilotModelsResponse = Omit<SetupCopilotModelsResponse, 'cached'>;
export type SetupClearCopilotCacheRequest = Record<string, never>;
export type SetupClearCopilotCacheResponse = SetupSuccessMessageResponse;

export interface SetupGetOpencodeModelsRequest {
  refresh?: boolean;
}
export interface SetupOpencodeModelInfo {
  id: string;
  name: string;
  modelString: string;
  provider: string;
  description: string;
  supportsTools: boolean;
  supportsVision: boolean;
  tier: string;
  default?: boolean;
}

/**
 * The OpenCode models handler returns full `ModelDefinition`s from the
 * provider, so the response carries that shape rather than the narrower
 * `SetupOpencodeModelInfo` projection.
 */
export interface SetupOpencodeModelsResponse {
  success: boolean;
  models?: ModelDefinition[];
  count?: number;
  cached?: boolean;
  error?: string;
}
export type SetupRefreshOpencodeModelsRequest = Record<string, never>;
export type SetupRefreshOpencodeModelsResponse = Omit<SetupOpencodeModelsResponse, 'cached'>;

export type SetupGetOpencodeProvidersRequest = Record<string, never>;
export interface SetupOpencodeProviderInfo {
  id: string;
  name: string;
  authenticated: boolean;
  authMethod?: 'oauth' | 'api_key';
}
export interface SetupOpencodeProvidersResponse {
  success: boolean;
  providers?: SetupOpencodeProviderInfo[];
  authenticated?: SetupOpencodeProviderInfo[];
  error?: string;
}

export type SetupClearOpencodeCacheRequest = Record<string, never>;
export type SetupClearOpencodeCacheResponse = SetupSuccessMessageResponse;

export interface SetupGetCursorConfigRequest {
  projectPath: string;
}
export interface SetupCursorConfigShape {
  defaultModel?: string;
  models?: string[];
  mcpServers?: string[];
  rules?: string[];
}
export interface SetupCursorModelOption {
  id: string;
  label: string;
  description: string;
  hasThinking: boolean;
  tier: 'free' | 'pro';
}
export interface SetupGetCursorConfigResponse {
  success: boolean;
  config?: SetupCursorConfigShape;
  availableModels?: SetupCursorModelOption[];
  error?: string;
}

export interface SetupSetCursorDefaultModelRequest {
  projectPath: string;
  model: string;
}
export interface SetupSetCursorDefaultModelResponse {
  success: boolean;
  model?: string;
  error?: string;
}

export interface SetupSetCursorModelsRequest {
  projectPath: string;
  models: string[];
}
export interface SetupSetCursorModelsResponse {
  success: boolean;
  models?: string[];
  error?: string;
}

export interface SetupGetCursorPermissionsRequest {
  projectPath?: string;
}
export interface SetupCursorPermissionsShape {
  allow: string[];
  deny: string[];
}
export interface SetupCursorPermissionProfileInfo {
  id: string;
  name: string;
  description: string;
  permissions: SetupCursorPermissionsShape;
}
export interface SetupGetCursorPermissionsResponse {
  success: boolean;
  globalPermissions?: SetupCursorPermissionsShape | null;
  projectPermissions?: SetupCursorPermissionsShape | null;
  effectivePermissions?: SetupCursorPermissionsShape | null;
  activeProfile?: 'strict' | 'development' | 'custom' | null;
  hasProjectConfig?: boolean;
  availableProfiles?: SetupCursorPermissionProfileInfo[];
  error?: string;
}

export interface SetupApplyCursorPermissionProfileRequest {
  profileId: 'strict' | 'development';
  scope: 'global' | 'project';
  projectPath?: string;
}
export interface SetupApplyCursorPermissionProfileResponse {
  success: boolean;
  message?: string;
  scope?: string;
  profileId?: string;
  error?: string;
}

export interface SetupSetCursorCustomPermissionsRequest {
  projectPath: string;
  permissions: SetupCursorPermissionsShape;
}
export interface SetupSetCursorCustomPermissionsResponse {
  success: boolean;
  message?: string;
  permissions?: SetupCursorPermissionsShape;
  error?: string;
}

export interface SetupDeleteCursorProjectPermissionsRequest {
  projectPath: string;
}
export interface SetupDeleteCursorProjectPermissionsResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SetupGetCursorExampleConfigRequest {
  profileId?: 'strict' | 'development';
}
export interface SetupGetCursorExampleConfigResponse {
  success: boolean;
  profileId?: string;
  config?: string;
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
  'ideation.sessionStart': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/session/start',
    request: null as unknown as IdeationSessionStartRequest,
    response: null as unknown as IdeationSessionStartResponse,
    pathParams: ['projectPath'],
  },
  'ideation.sessionMessage': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/session/message',
    request: null as unknown as IdeationSessionMessageRequest,
    response: null as unknown as IdeationSessionMessageResponse,
  },
  'ideation.sessionStop': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/session/stop',
    request: null as unknown as IdeationSessionStopRequest,
    response: null as unknown as IdeationSessionStopResponse,
  },
  'ideation.sessionGet': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/session/get',
    request: null as unknown as IdeationSessionGetRequest,
    response: null as unknown as IdeationSessionGetResponse,
    pathParams: ['projectPath'],
  },
  'ideation.ideasList': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/ideas/list',
    request: null as unknown as IdeationIdeasListRequest,
    response: null as unknown as IdeationIdeasListResponse,
    pathParams: ['projectPath'],
  },
  'ideation.ideasCreate': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/ideas/create',
    request: null as unknown as IdeationIdeasCreateRequest,
    response: null as unknown as IdeationIdeasCreateResponse,
    pathParams: ['projectPath'],
  },
  'ideation.ideasGet': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/ideas/get',
    request: null as unknown as IdeationIdeasGetRequest,
    response: null as unknown as IdeationIdeasGetResponse,
    pathParams: ['projectPath'],
  },
  'ideation.ideasUpdate': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/ideas/update',
    request: null as unknown as IdeationIdeasUpdateRequest,
    response: null as unknown as IdeationIdeasUpdateResponse,
    pathParams: ['projectPath'],
  },
  'ideation.ideasDelete': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/ideas/delete',
    request: null as unknown as IdeationIdeasDeleteRequest,
    response: null as unknown as IdeationIdeasDeleteResponse,
    pathParams: ['projectPath'],
  },
  'ideation.analyze': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/analyze',
    request: null as unknown as IdeationAnalyzeRequest,
    response: null as unknown as IdeationAnalyzeResponse,
    pathParams: ['projectPath'],
  },
  'ideation.analysis': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/analysis',
    request: null as unknown as IdeationAnalysisRequest,
    response: null as unknown as IdeationAnalysisResponse,
    pathParams: ['projectPath'],
  },
  'ideation.convert': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/convert',
    request: null as unknown as IdeationConvertRequest,
    response: null as unknown as IdeationConvertResponse,
    pathParams: ['projectPath'],
  },
  'ideation.addSuggestion': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/add-suggestion',
    request: null as unknown as IdeationAddSuggestionRequest,
    response: null as unknown as IdeationAddSuggestionResponse,
    pathParams: ['projectPath'],
  },
  'ideation.prompts': {
    method: 'GET',
    mount: '/api/ideation',
    path: '/prompts',
    request: null as unknown as IdeationPromptsRequest,
    response: null as unknown as IdeationPromptsResponse,
  },
  'ideation.promptsByCategory': {
    method: 'GET',
    mount: '/api/ideation',
    path: '/prompts/:category',
    request: null as unknown as IdeationPromptsByCategoryRequest,
    response: null as unknown as IdeationPromptsByCategoryResponse,
  },
  'ideation.suggestionsGenerate': {
    method: 'POST',
    mount: '/api/ideation',
    path: '/suggestions/generate',
    request: null as unknown as IdeationSuggestionsGenerateRequest,
    response: null as unknown as IdeationSuggestionsGenerateResponse,
    pathParams: ['projectPath'],
  },
  'github.checkRemote': {
    method: 'POST',
    mount: '/api/github',
    path: '/check-remote',
    request: null as unknown as GitHubCheckRemoteRequest,
    response: null as unknown as GitHubCheckRemoteResponse,
    pathParams: ['projectPath'],
  },
  'github.listIssues': {
    method: 'POST',
    mount: '/api/github',
    path: '/issues',
    request: null as unknown as GitHubListIssuesRequest,
    response: null as unknown as GitHubListIssuesResponse,
    pathParams: ['projectPath'],
  },
  'github.listPRs': {
    method: 'POST',
    mount: '/api/github',
    path: '/prs',
    request: null as unknown as GitHubListPRsRequest,
    response: null as unknown as GitHubListPRsResponse,
    pathParams: ['projectPath'],
  },
  'github.getIssueComments': {
    method: 'POST',
    mount: '/api/github',
    path: '/issue-comments',
    request: null as unknown as GitHubGetIssueCommentsRequest,
    response: null as unknown as GitHubGetIssueCommentsResponse,
    pathParams: ['projectPath'],
  },
  'github.getPRReviewComments': {
    method: 'POST',
    mount: '/api/github',
    path: '/pr-review-comments',
    request: null as unknown as GitHubGetPRReviewCommentsRequest,
    response: null as unknown as GitHubGetPRReviewCommentsResponse,
    pathParams: ['projectPath'],
  },
  'github.resolveReviewThread': {
    method: 'POST',
    mount: '/api/github',
    path: '/resolve-pr-comment',
    request: null as unknown as GitHubResolveReviewThreadRequest,
    response: null as unknown as GitHubResolveReviewThreadResponse,
    pathParams: ['projectPath'],
  },
  'github.validateIssue': {
    method: 'POST',
    mount: '/api/github',
    path: '/validate-issue',
    request: null as unknown as GitHubValidateIssueRequest,
    response: null as unknown as GitHubValidateIssueResponse,
    pathParams: ['projectPath'],
  },
  'github.getValidationStatus': {
    method: 'POST',
    mount: '/api/github',
    path: '/validation-status',
    request: null as unknown as GitHubGetValidationStatusRequest,
    response: null as unknown as GitHubGetValidationStatusResponse,
    pathParams: ['projectPath'],
  },
  'github.stopValidation': {
    method: 'POST',
    mount: '/api/github',
    path: '/validation-stop',
    request: null as unknown as GitHubStopValidationRequest,
    response: null as unknown as GitHubStopValidationResponse,
    pathParams: ['projectPath'],
  },
  'github.getValidations': {
    method: 'POST',
    mount: '/api/github',
    path: '/validations',
    request: null as unknown as GitHubGetValidationsRequest,
    response: null as unknown as GitHubGetValidationsResponse,
    pathParams: ['projectPath'],
  },
  'github.deleteValidation': {
    method: 'POST',
    mount: '/api/github',
    path: '/validation-delete',
    request: null as unknown as GitHubDeleteValidationRequest,
    response: null as unknown as GitHubDeleteValidationResponse,
    pathParams: ['projectPath'],
  },
  'github.markValidationViewed': {
    method: 'POST',
    mount: '/api/github',
    path: '/validation-mark-viewed',
    request: null as unknown as GitHubMarkValidationViewedRequest,
    response: null as unknown as GitHubMarkValidationViewedResponse,
    pathParams: ['projectPath'],
  },
  'git.diffs': {
    method: 'POST',
    mount: '/api/git',
    path: '/diffs',
    request: null as unknown as GitDiffsRequest,
    response: null as unknown as GitDiffsResponse,
    pathParams: ['projectPath'],
  },
  'git.fileDiff': {
    method: 'POST',
    mount: '/api/git',
    path: '/file-diff',
    request: null as unknown as GitFileDiffRequest,
    response: null as unknown as GitFileDiffResponse,
    pathParams: ['projectPath', 'filePath'],
  },
  'git.stageFiles': {
    method: 'POST',
    mount: '/api/git',
    path: '/stage-files',
    request: null as unknown as GitStageFilesRequest,
    response: null as unknown as GitStageFilesResponse,
    pathParams: ['projectPath', 'files[]'],
  },
  'git.details': {
    method: 'POST',
    mount: '/api/git',
    path: '/details',
    request: null as unknown as GitDetailsRequest,
    response: null as unknown as GitDetailsResponse,
    pathParams: ['projectPath', 'filePath?'],
  },
  'git.enhancedStatus': {
    method: 'POST',
    mount: '/api/git',
    path: '/enhanced-status',
    request: null as unknown as GitEnhancedStatusRequest,
    response: null as unknown as GitEnhancedStatusResponse,
    pathParams: ['projectPath'],
  },
  'templates.clone': {
    method: 'POST',
    mount: '/api/templates',
    path: '/clone',
    request: null as unknown as TemplatesCloneRequest,
    response: null as unknown as TemplatesCloneResponse,
  },
  'models.available': {
    method: 'GET',
    mount: '/api/models',
    path: '/available',
    request: null as unknown as ModelsAvailableRequest,
    response: null as unknown as ModelsAvailableResponse,
  },
  'models.providers': {
    method: 'GET',
    mount: '/api/models',
    path: '/providers',
    request: null as unknown as ModelsProvidersRequest,
    response: null as unknown as ModelsProvidersResponse,
  },
  'fs.read': {
    method: 'POST',
    mount: '/api/fs',
    path: '/read',
    request: null as unknown as FsReadRequest,
    response: null as unknown as FsReadResponse,
  },
  'fs.write': {
    method: 'POST',
    mount: '/api/fs',
    path: '/write',
    request: null as unknown as FsWriteRequest,
    response: null as unknown as FsWriteResponse,
  },
  'fs.mkdir': {
    method: 'POST',
    mount: '/api/fs',
    path: '/mkdir',
    request: null as unknown as FsMkdirRequest,
    response: null as unknown as FsMkdirResponse,
  },
  'fs.readdir': {
    method: 'POST',
    mount: '/api/fs',
    path: '/readdir',
    request: null as unknown as FsReaddirRequest,
    response: null as unknown as FsReaddirResponse,
  },
  'fs.exists': {
    method: 'POST',
    mount: '/api/fs',
    path: '/exists',
    request: null as unknown as FsExistsRequest,
    response: null as unknown as FsExistsResponse,
  },
  'fs.stat': {
    method: 'POST',
    mount: '/api/fs',
    path: '/stat',
    request: null as unknown as FsStatRequest,
    response: null as unknown as FsStatResponse,
  },
  'fs.delete': {
    method: 'POST',
    mount: '/api/fs',
    path: '/delete',
    request: null as unknown as FsDeleteRequest,
    response: null as unknown as FsDeleteResponse,
  },
  'fs.validatePath': {
    method: 'POST',
    mount: '/api/fs',
    path: '/validate-path',
    request: null as unknown as FsValidatePathRequest,
    response: null as unknown as FsValidatePathResponse,
  },
  'fs.resolveDirectory': {
    method: 'POST',
    mount: '/api/fs',
    path: '/resolve-directory',
    request: null as unknown as FsResolveDirectoryRequest,
    response: null as unknown as FsResolveDirectoryResponse,
  },
  'fs.saveImage': {
    method: 'POST',
    mount: '/api/fs',
    path: '/save-image',
    request: null as unknown as FsSaveImageRequest,
    response: null as unknown as FsSaveImageResponse,
  },
  'fs.browse': {
    method: 'POST',
    mount: '/api/fs',
    path: '/browse',
    request: null as unknown as FsBrowseRequest,
    response: null as unknown as FsBrowseResponse,
  },
  'fs.image': {
    method: 'GET',
    mount: '/api/fs',
    path: '/image',
    request: null as unknown as FsImageRequest,
    response: null as unknown as FsImageResponse,
  },
  'fs.saveBoardBackground': {
    method: 'POST',
    mount: '/api/fs',
    path: '/save-board-background',
    request: null as unknown as FsSaveBoardBackgroundRequest,
    response: null as unknown as FsSaveBoardBackgroundResponse,
  },
  'fs.deleteBoardBackground': {
    method: 'POST',
    mount: '/api/fs',
    path: '/delete-board-background',
    request: null as unknown as FsDeleteBoardBackgroundRequest,
    response: null as unknown as FsDeleteBoardBackgroundResponse,
  },
  'fs.browseProjectFiles': {
    method: 'POST',
    mount: '/api/fs',
    path: '/browse-project-files',
    request: null as unknown as FsBrowseProjectFilesRequest,
    response: null as unknown as FsBrowseProjectFilesResponse,
  },
  'fs.copy': {
    method: 'POST',
    mount: '/api/fs',
    path: '/copy',
    request: null as unknown as FsCopyRequest,
    response: null as unknown as FsCopyResponse,
  },
  'fs.move': {
    method: 'POST',
    mount: '/api/fs',
    path: '/move',
    request: null as unknown as FsMoveRequest,
    response: null as unknown as FsMoveResponse,
  },
  'fs.download': {
    method: 'POST',
    mount: '/api/fs',
    path: '/download',
    request: null as unknown as FsDownloadRequest,
    response: null as unknown as FsDownloadResponse,
  },
  'terminal.status': {
    method: 'GET',
    mount: '/api/terminal',
    path: '/status',
    request: null as unknown as TerminalStatusRequest,
    response: null as unknown as TerminalStatusResponse,
  },
  'terminal.auth': {
    method: 'POST',
    mount: '/api/terminal',
    path: '/auth',
    request: null as unknown as TerminalAuthRequest,
    response: null as unknown as TerminalAuthResponse,
  },
  'terminal.logout': {
    method: 'POST',
    mount: '/api/terminal',
    path: '/logout',
    request: null as unknown as TerminalLogoutRequest,
    response: null as unknown as TerminalLogoutResponse,
  },
  'terminal.sessions': {
    method: 'GET',
    mount: '/api/terminal',
    path: '/sessions',
    request: null as unknown as TerminalSessionsRequest,
    response: null as unknown as TerminalSessionsResponse,
  },
  'terminal.createSession': {
    method: 'POST',
    mount: '/api/terminal',
    path: '/sessions',
    request: null as unknown as TerminalCreateSessionRequest,
    response: null as unknown as TerminalCreateSessionResponse,
  },
  'terminal.deleteSession': {
    method: 'DELETE',
    mount: '/api/terminal',
    path: '/sessions/:id',
    request: null as unknown as TerminalDeleteSessionRequest,
    response: null as unknown as TerminalDeleteSessionResponse,
  },
  'terminal.resizeSession': {
    method: 'POST',
    mount: '/api/terminal',
    path: '/sessions/:id/resize',
    request: null as unknown as TerminalResizeSessionRequest,
    response: null as unknown as TerminalResizeSessionResponse,
  },
  'terminal.getSettings': {
    method: 'GET',
    mount: '/api/terminal',
    path: '/settings',
    request: null as unknown as TerminalGetSettingsRequest,
    response: null as unknown as TerminalGetSettingsResponse,
  },
  'terminal.updateSettings': {
    method: 'PUT',
    mount: '/api/terminal',
    path: '/settings',
    request: null as unknown as TerminalUpdateSettingsRequest,
    response: null as unknown as TerminalUpdateSettingsResponse,
  },
  'workspace.config': {
    method: 'GET',
    mount: '/api/workspace',
    path: '/config',
    request: null as unknown as WorkspaceConfigRequest,
    response: null as unknown as WorkspaceConfigResponse,
  },
  'workspace.directories': {
    method: 'GET',
    mount: '/api/workspace',
    path: '/directories',
    request: null as unknown as WorkspaceDirectoriesRequest,
    response: null as unknown as WorkspaceDirectoriesResponse,
  },
  'mcp.testServer': {
    method: 'POST',
    mount: '/api/mcp',
    path: '/test',
    request: null as unknown as McpTestServerRequest,
    response: null as unknown as McpTestServerResponse,
  },
  'mcp.listTools': {
    method: 'POST',
    mount: '/api/mcp',
    path: '/tools',
    request: null as unknown as McpListToolsRequest,
    response: null as unknown as McpListToolsResponse,
  },
  'health.check': {
    method: 'GET',
    mount: '/api/health',
    path: '/',
    request: null as unknown as HealthCheckRequest,
    response: null as unknown as HealthCheckResponse,
  },
  'health.environment': {
    method: 'GET',
    mount: '/api/health',
    path: '/environment',
    request: null as unknown as HealthEnvironmentRequest,
    response: null as unknown as HealthEnvironmentResponse,
  },
  // Authenticated: registered on a second router mounted at /api/health *after*
  // the auth middleware so it keeps its current protection.
  'health.detailed': {
    method: 'GET',
    mount: '/api/health',
    path: '/detailed',
    request: null as unknown as HealthDetailedRequest,
    response: null as unknown as HealthDetailedResponse,
  },
  'auth.status': {
    method: 'GET',
    mount: '/api/auth',
    path: '/status',
    request: null as unknown as AuthStatusRequest,
    response: null as unknown as AuthStatusResponse,
  },
  'auth.login': {
    method: 'POST',
    mount: '/api/auth',
    path: '/login',
    request: null as unknown as AuthLoginRequest,
    response: null as unknown as AuthLoginResponse,
  },
  'auth.token': {
    method: 'GET',
    mount: '/api/auth',
    path: '/token',
    request: null as unknown as AuthTokenRequest,
    response: null as unknown as AuthTokenResponse,
  },
  'auth.logout': {
    method: 'POST',
    mount: '/api/auth',
    path: '/logout',
    request: null as unknown as AuthLogoutRequest,
    response: null as unknown as AuthLogoutResponse,
  },
  'sessions.list': {
    method: 'GET',
    mount: '/api/sessions',
    path: '/',
    request: null as unknown as SessionsListRequest,
    response: null as unknown as SessionsListResponse,
  },
  'sessions.create': {
    method: 'POST',
    mount: '/api/sessions',
    path: '/',
    request: null as unknown as SessionsCreateRequest,
    response: null as unknown as SessionsCreateResponse,
  },
  'sessions.update': {
    method: 'PUT',
    mount: '/api/sessions',
    path: '/:sessionId',
    request: null as unknown as SessionsUpdateRequest,
    response: null as unknown as SessionsUpdateResponse,
  },
  'sessions.archive': {
    method: 'POST',
    mount: '/api/sessions',
    path: '/:sessionId/archive',
    request: null as unknown as SessionsArchiveRequest,
    response: null as unknown as SessionsArchiveResponse,
  },
  'sessions.unarchive': {
    method: 'POST',
    mount: '/api/sessions',
    path: '/:sessionId/unarchive',
    request: null as unknown as SessionsUnarchiveRequest,
    response: null as unknown as SessionsUnarchiveResponse,
  },
  'sessions.delete': {
    method: 'DELETE',
    mount: '/api/sessions',
    path: '/:sessionId',
    request: null as unknown as SessionsDeleteRequest,
    response: null as unknown as SessionsDeleteResponse,
  },
  'agent.start': {
    method: 'POST',
    mount: '/api/agent',
    path: '/start',
    request: null as unknown as AgentStartRequest,
    response: null as unknown as AgentStartResponse,
    pathParams: ['workingDirectory?'],
  },
  'agent.send': {
    method: 'POST',
    mount: '/api/agent',
    path: '/send',
    request: null as unknown as AgentSendRequest,
    response: null as unknown as AgentSendResponse,
    pathParams: ['workingDirectory?', 'imagePaths[]'],
  },
  'agent.getHistory': {
    method: 'POST',
    mount: '/api/agent',
    path: '/history',
    request: null as unknown as AgentHistoryRequest,
    response: null as unknown as AgentHistoryResponse,
  },
  'agent.stop': {
    method: 'POST',
    mount: '/api/agent',
    path: '/stop',
    request: null as unknown as AgentStopRequest,
    response: null as unknown as AgentStopResponse,
  },
  'agent.clear': {
    method: 'POST',
    mount: '/api/agent',
    path: '/clear',
    request: null as unknown as AgentClearRequest,
    response: null as unknown as AgentClearResponse,
  },
  'agent.model': {
    method: 'POST',
    mount: '/api/agent',
    path: '/model',
    request: null as unknown as AgentModelRequest,
    response: null as unknown as AgentModelResponse,
  },
  'agent.queueAdd': {
    method: 'POST',
    mount: '/api/agent',
    path: '/queue/add',
    request: null as unknown as AgentQueueAddRequest,
    response: null as unknown as AgentQueueAddResponse,
    pathParams: ['imagePaths[]'],
  },
  'agent.queueList': {
    method: 'POST',
    mount: '/api/agent',
    path: '/queue/list',
    request: null as unknown as AgentQueueListRequest,
    response: null as unknown as AgentQueueListResponse,
  },
  'agent.queueRemove': {
    method: 'POST',
    mount: '/api/agent',
    path: '/queue/remove',
    request: null as unknown as AgentQueueRemoveRequest,
    response: null as unknown as AgentQueueRemoveResponse,
  },
  'agent.queueClear': {
    method: 'POST',
    mount: '/api/agent',
    path: '/queue/clear',
    request: null as unknown as AgentQueueClearRequest,
    response: null as unknown as AgentQueueClearResponse,
  },
  'notifications.list': {
    method: 'POST',
    mount: '/api/notifications',
    path: '/list',
    request: null as unknown as NotificationsListRequest,
    response: null as unknown as NotificationsListResponse,
    pathParams: ['projectPath'],
  },
  'notifications.unreadCount': {
    method: 'POST',
    mount: '/api/notifications',
    path: '/unread-count',
    request: null as unknown as NotificationsUnreadCountRequest,
    response: null as unknown as NotificationsUnreadCountResponse,
    pathParams: ['projectPath'],
  },
  'notifications.markRead': {
    method: 'POST',
    mount: '/api/notifications',
    path: '/mark-read',
    request: null as unknown as NotificationsMarkReadRequest,
    response: null as unknown as NotificationsMarkReadResponse,
    pathParams: ['projectPath'],
  },
  'notifications.dismiss': {
    method: 'POST',
    mount: '/api/notifications',
    path: '/dismiss',
    request: null as unknown as NotificationsDismissRequest,
    response: null as unknown as NotificationsDismissResponse,
    pathParams: ['projectPath'],
  },
  'eventHistory.list': {
    method: 'POST',
    mount: '/api/event-history',
    path: '/list',
    request: null as unknown as EventHistoryListRequest,
    response: null as unknown as EventHistoryListResponse,
    pathParams: ['projectPath'],
  },
  'eventHistory.get': {
    method: 'POST',
    mount: '/api/event-history',
    path: '/get',
    request: null as unknown as EventHistoryGetRequest,
    response: null as unknown as EventHistoryGetResponse,
    pathParams: ['projectPath'],
  },
  'eventHistory.delete': {
    method: 'POST',
    mount: '/api/event-history',
    path: '/delete',
    request: null as unknown as EventHistoryDeleteRequest,
    response: null as unknown as EventHistoryDeleteResponse,
    pathParams: ['projectPath'],
  },
  'eventHistory.clear': {
    method: 'POST',
    mount: '/api/event-history',
    path: '/clear',
    request: null as unknown as EventHistoryClearRequest,
    response: null as unknown as EventHistoryClearResponse,
    pathParams: ['projectPath'],
  },
  'eventHistory.replay': {
    method: 'POST',
    mount: '/api/event-history',
    path: '/replay',
    request: null as unknown as EventHistoryReplayRequest,
    response: null as unknown as EventHistoryReplayResponse,
    pathParams: ['projectPath'],
  },
  'pipeline.getConfig': {
    method: 'POST',
    mount: '/api/pipeline',
    path: '/config',
    request: null as unknown as PipelineGetConfigRequest,
    response: null as unknown as PipelineGetConfigResponse,
    pathParams: ['projectPath'],
  },
  'pipeline.saveConfig': {
    method: 'POST',
    mount: '/api/pipeline',
    path: '/config/save',
    request: null as unknown as PipelineSaveConfigRequest,
    response: null as unknown as PipelineSaveConfigResponse,
    pathParams: ['projectPath'],
  },
  'pipeline.addStep': {
    method: 'POST',
    mount: '/api/pipeline',
    path: '/steps/add',
    request: null as unknown as PipelineAddStepRequest,
    response: null as unknown as PipelineAddStepResponse,
    pathParams: ['projectPath'],
  },
  'pipeline.updateStep': {
    method: 'POST',
    mount: '/api/pipeline',
    path: '/steps/update',
    request: null as unknown as PipelineUpdateStepRequest,
    response: null as unknown as PipelineUpdateStepResponse,
    pathParams: ['projectPath'],
  },
  'pipeline.deleteStep': {
    method: 'POST',
    mount: '/api/pipeline',
    path: '/steps/delete',
    request: null as unknown as PipelineDeleteStepRequest,
    response: null as unknown as PipelineDeleteStepResponse,
    pathParams: ['projectPath'],
  },
  'pipeline.reorderSteps': {
    method: 'POST',
    mount: '/api/pipeline',
    path: '/steps/reorder',
    request: null as unknown as PipelineReorderStepsRequest,
    response: null as unknown as PipelineReorderStepsResponse,
    pathParams: ['projectPath'],
  },
  'enhancePrompt.enhance': {
    method: 'POST',
    mount: '/api/enhance-prompt',
    path: '/',
    request: null as unknown as EnhancePromptRequest,
    response: null as unknown as EnhancePromptResponse,
  },
  'claude.getUsage': {
    method: 'GET',
    mount: '/api/claude',
    path: '/usage',
    request: null as unknown as ClaudeGetUsageRequest,
    response: null as unknown as ClaudeGetUsageResponse,
  },
  'codex.getUsage': {
    method: 'GET',
    mount: '/api/codex',
    path: '/usage',
    request: null as unknown as CodexGetUsageRequest,
    response: null as unknown as CodexGetUsageResponse,
  },
  'codex.getModels': {
    method: 'GET',
    mount: '/api/codex',
    path: '/models',
    request: null as unknown as CodexGetModelsRequest,
    response: null as unknown as CodexGetModelsResponse,
  },
  'zai.getStatus': {
    method: 'GET',
    mount: '/api/zai',
    path: '/status',
    request: null as unknown as ZaiGetStatusRequest,
    response: null as unknown as ZaiGetStatusResponse,
  },
  'zai.getUsage': {
    method: 'GET',
    mount: '/api/zai',
    path: '/usage',
    request: null as unknown as ZaiGetUsageRequest,
    response: null as unknown as ZaiGetUsageResponse,
  },
  'zai.configure': {
    method: 'POST',
    mount: '/api/zai',
    path: '/configure',
    request: null as unknown as ZaiConfigureRequest,
    response: null as unknown as ZaiConfigureResponse,
  },
  'zai.verify': {
    method: 'POST',
    mount: '/api/zai',
    path: '/verify',
    request: null as unknown as ZaiVerifyRequest,
    response: null as unknown as ZaiVerifyResponse,
  },
  'gemini.getUsage': {
    method: 'GET',
    mount: '/api/gemini',
    path: '/usage',
    request: null as unknown as GeminiGetUsageRequest,
    response: null as unknown as GeminiGetUsageResponse,
  },
  'gemini.getStatus': {
    method: 'GET',
    mount: '/api/gemini',
    path: '/status',
    request: null as unknown as GeminiGetStatusRequest,
    response: null as unknown as GeminiGetStatusResponse,
  },
  'setup.getClaudeStatus': {
    method: 'GET',
    mount: '/api/setup',
    path: '/claude-status',
    request: null as unknown as SetupClaudeStatusRequest,
    response: null as unknown as SetupClaudeStatusResponse,
  },
  'setup.installClaude': {
    method: 'POST',
    mount: '/api/setup',
    path: '/install-claude',
    request: null as unknown as SetupInstallClaudeRequest,
    response: null as unknown as SetupInstallClaudeResponse,
  },
  'setup.authClaude': {
    method: 'POST',
    mount: '/api/setup',
    path: '/auth-claude',
    request: null as unknown as SetupAuthClaudeRequest,
    response: null as unknown as SetupAuthClaudeResponse,
  },
  'setup.deauthClaude': {
    method: 'POST',
    mount: '/api/setup',
    path: '/deauth-claude',
    request: null as unknown as SetupDeauthClaudeRequest,
    response: null as unknown as SetupDeauthClaudeResponse,
  },
  'setup.storeApiKey': {
    method: 'POST',
    mount: '/api/setup',
    path: '/store-api-key',
    request: null as unknown as SetupStoreApiKeyRequest,
    response: null as unknown as SetupStoreApiKeyResponse,
  },
  'setup.deleteApiKey': {
    method: 'POST',
    mount: '/api/setup',
    path: '/delete-api-key',
    request: null as unknown as SetupDeleteApiKeyRequest,
    response: null as unknown as SetupDeleteApiKeyResponse,
  },
  'setup.getApiKeys': {
    method: 'GET',
    mount: '/api/setup',
    path: '/api-keys',
    request: null as unknown as SetupApiKeysRequest,
    response: null as unknown as SetupApiKeysResponse,
  },
  'setup.getPlatform': {
    method: 'GET',
    mount: '/api/setup',
    path: '/platform',
    request: null as unknown as SetupPlatformRequest,
    response: null as unknown as SetupPlatformResponse,
  },
  'setup.verifyClaudeAuth': {
    method: 'POST',
    mount: '/api/setup',
    path: '/verify-claude-auth',
    request: null as unknown as SetupVerifyClaudeAuthRequest,
    response: null as unknown as SetupVerifyClaudeAuthResponse,
  },
  'setup.verifyCodexAuth': {
    method: 'POST',
    mount: '/api/setup',
    path: '/verify-codex-auth',
    request: null as unknown as SetupVerifyCodexAuthRequest,
    response: null as unknown as SetupVerifyCodexAuthResponse,
  },
  'setup.getGhStatus': {
    method: 'GET',
    mount: '/api/setup',
    path: '/gh-status',
    request: null as unknown as SetupGhStatusRequest,
    response: null as unknown as SetupGhStatusResponse,
  },
  'setup.getCursorStatus': {
    method: 'GET',
    mount: '/api/setup',
    path: '/cursor-status',
    request: null as unknown as SetupCursorStatusRequest,
    response: null as unknown as SetupCursorStatusResponse,
  },
  'setup.authCursor': {
    method: 'POST',
    mount: '/api/setup',
    path: '/auth-cursor',
    request: null as unknown as SetupAuthCursorRequest,
    response: null as unknown as SetupAuthCursorResponse,
  },
  'setup.deauthCursor': {
    method: 'POST',
    mount: '/api/setup',
    path: '/deauth-cursor',
    request: null as unknown as SetupDeauthCursorRequest,
    response: null as unknown as SetupDeauthCursorResponse,
  },
  'setup.getCodexStatus': {
    method: 'GET',
    mount: '/api/setup',
    path: '/codex-status',
    request: null as unknown as SetupCodexStatusRequest,
    response: null as unknown as SetupCodexStatusResponse,
  },
  'setup.installCodex': {
    method: 'POST',
    mount: '/api/setup',
    path: '/install-codex',
    request: null as unknown as SetupInstallCodexRequest,
    response: null as unknown as SetupInstallCodexResponse,
  },
  'setup.authCodex': {
    method: 'POST',
    mount: '/api/setup',
    path: '/auth-codex',
    request: null as unknown as SetupAuthCodexRequest,
    response: null as unknown as SetupAuthCodexResponse,
  },
  'setup.deauthCodex': {
    method: 'POST',
    mount: '/api/setup',
    path: '/deauth-codex',
    request: null as unknown as SetupDeauthCodexRequest,
    response: null as unknown as SetupDeauthCodexResponse,
  },
  'setup.getOpencodeStatus': {
    method: 'GET',
    mount: '/api/setup',
    path: '/opencode-status',
    request: null as unknown as SetupOpencodeStatusRequest,
    response: null as unknown as SetupOpencodeStatusResponse,
  },
  'setup.authOpencode': {
    method: 'POST',
    mount: '/api/setup',
    path: '/auth-opencode',
    request: null as unknown as SetupAuthOpencodeRequest,
    response: null as unknown as SetupAuthOpencodeResponse,
  },
  'setup.deauthOpencode': {
    method: 'POST',
    mount: '/api/setup',
    path: '/deauth-opencode',
    request: null as unknown as SetupDeauthOpencodeRequest,
    response: null as unknown as SetupDeauthOpencodeResponse,
  },
  'setup.getGeminiStatus': {
    method: 'GET',
    mount: '/api/setup',
    path: '/gemini-status',
    request: null as unknown as SetupGeminiStatusRequest,
    response: null as unknown as SetupGeminiStatusResponse,
  },
  'setup.authGemini': {
    method: 'POST',
    mount: '/api/setup',
    path: '/auth-gemini',
    request: null as unknown as SetupAuthGeminiRequest,
    response: null as unknown as SetupAuthGeminiResponse,
  },
  'setup.deauthGemini': {
    method: 'POST',
    mount: '/api/setup',
    path: '/deauth-gemini',
    request: null as unknown as SetupDeauthGeminiRequest,
    response: null as unknown as SetupDeauthGeminiResponse,
  },
  'setup.getCopilotStatus': {
    method: 'GET',
    mount: '/api/setup',
    path: '/copilot-status',
    request: null as unknown as SetupCopilotStatusRequest,
    response: null as unknown as SetupCopilotStatusResponse,
  },
  'setup.authCopilot': {
    method: 'POST',
    mount: '/api/setup',
    path: '/auth-copilot',
    request: null as unknown as SetupAuthCopilotRequest,
    response: null as unknown as SetupAuthCopilotResponse,
  },
  'setup.deauthCopilot': {
    method: 'POST',
    mount: '/api/setup',
    path: '/deauth-copilot',
    request: null as unknown as SetupDeauthCopilotRequest,
    response: null as unknown as SetupDeauthCopilotResponse,
  },
  'setup.getCopilotModels': {
    method: 'GET',
    mount: '/api/setup',
    path: '/copilot/models',
    request: null as unknown as SetupGetCopilotModelsRequest,
    response: null as unknown as SetupCopilotModelsResponse,
  },
  'setup.refreshCopilotModels': {
    method: 'POST',
    mount: '/api/setup',
    path: '/copilot/models/refresh',
    request: null as unknown as SetupRefreshCopilotModelsRequest,
    response: null as unknown as SetupRefreshCopilotModelsResponse,
  },
  'setup.clearCopilotCache': {
    method: 'POST',
    mount: '/api/setup',
    path: '/copilot/cache/clear',
    request: null as unknown as SetupClearCopilotCacheRequest,
    response: null as unknown as SetupClearCopilotCacheResponse,
  },
  'setup.getOpencodeModels': {
    method: 'GET',
    mount: '/api/setup',
    path: '/opencode/models',
    request: null as unknown as SetupGetOpencodeModelsRequest,
    response: null as unknown as SetupOpencodeModelsResponse,
  },
  'setup.refreshOpencodeModels': {
    method: 'POST',
    mount: '/api/setup',
    path: '/opencode/models/refresh',
    request: null as unknown as SetupRefreshOpencodeModelsRequest,
    response: null as unknown as SetupRefreshOpencodeModelsResponse,
  },
  'setup.getOpencodeProviders': {
    method: 'GET',
    mount: '/api/setup',
    path: '/opencode/providers',
    request: null as unknown as SetupGetOpencodeProvidersRequest,
    response: null as unknown as SetupOpencodeProvidersResponse,
  },
  'setup.clearOpencodeCache': {
    method: 'POST',
    mount: '/api/setup',
    path: '/opencode/cache/clear',
    request: null as unknown as SetupClearOpencodeCacheRequest,
    response: null as unknown as SetupClearOpencodeCacheResponse,
  },
  'setup.getCursorConfig': {
    method: 'GET',
    mount: '/api/setup',
    path: '/cursor-config',
    request: null as unknown as SetupGetCursorConfigRequest,
    response: null as unknown as SetupGetCursorConfigResponse,
  },
  'setup.setCursorDefaultModel': {
    method: 'POST',
    mount: '/api/setup',
    path: '/cursor-config/default-model',
    request: null as unknown as SetupSetCursorDefaultModelRequest,
    response: null as unknown as SetupSetCursorDefaultModelResponse,
  },
  'setup.setCursorModels': {
    method: 'POST',
    mount: '/api/setup',
    path: '/cursor-config/models',
    request: null as unknown as SetupSetCursorModelsRequest,
    response: null as unknown as SetupSetCursorModelsResponse,
  },
  'setup.getCursorPermissions': {
    method: 'GET',
    mount: '/api/setup',
    path: '/cursor-permissions',
    request: null as unknown as SetupGetCursorPermissionsRequest,
    response: null as unknown as SetupGetCursorPermissionsResponse,
  },
  'setup.applyCursorPermissionProfile': {
    method: 'POST',
    mount: '/api/setup',
    path: '/cursor-permissions/profile',
    request: null as unknown as SetupApplyCursorPermissionProfileRequest,
    response: null as unknown as SetupApplyCursorPermissionProfileResponse,
  },
  'setup.setCursorCustomPermissions': {
    method: 'POST',
    mount: '/api/setup',
    path: '/cursor-permissions/custom',
    request: null as unknown as SetupSetCursorCustomPermissionsRequest,
    response: null as unknown as SetupSetCursorCustomPermissionsResponse,
  },
  'setup.deleteCursorProjectPermissions': {
    method: 'DELETE',
    mount: '/api/setup',
    path: '/cursor-permissions',
    request: null as unknown as SetupDeleteCursorProjectPermissionsRequest,
    response: null as unknown as SetupDeleteCursorProjectPermissionsResponse,
  },
  'setup.getCursorExampleConfig': {
    method: 'GET',
    mount: '/api/setup',
    path: '/cursor-permissions/example',
    request: null as unknown as SetupGetCursorExampleConfigRequest,
    response: null as unknown as SetupGetCursorExampleConfigResponse,
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
