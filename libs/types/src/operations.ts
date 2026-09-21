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
