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
