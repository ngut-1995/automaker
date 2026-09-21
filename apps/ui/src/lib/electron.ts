// Type definitions for Electron IPC API
import type { SessionListItem, Message } from '@/types/electron';
import type {
  ClaudeUsageResponse,
  CodexUsageResponse,
  ZaiUsageResponse,
  GeminiUsageResponse,
} from '@/store/app-store';
import type {
  IssueValidationVerdict,
  IssueValidationConfidence,
  IssueComplexity,
  IssueValidationInput,
  IssueValidationResult,
  IssueValidationResponse,
  IssueValidationEvent,
  StoredValidation,
  ModelId,
  ThinkingLevel,
  ReasoningEffort,
  GitHubComment,
  IssueCommentsResult,
  Idea,
  IdeaCategory,
  IdeationSession,
  IdeationMessage,
  IdeationPrompt,
  PromptCategory,
  ProjectAnalysisResult,
  AnalysisSuggestion,
  StartSessionOptions,
  CreateIdeaInput,
  UpdateIdeaInput,
  ConvertToFeatureOptions,
  IdeationContextSources,
  Feature,
  IdeationStreamEvent,
  IdeationAnalysisEvent,
  ClaudeTier,
} from '@automaker/types';
import { getJSON, setJSON, removeItem } from './storage';

// Re-export issue validation types for use in components
export type {
  IssueValidationVerdict,
  IssueValidationConfidence,
  IssueComplexity,
  IssueValidationInput,
  IssueValidationResult,
  IssueValidationResponse,
  IssueValidationEvent,
  StoredValidation,
  GitHubComment,
  IssueCommentsResult,
};

// Re-export ideation types
export type {
  Idea,
  IdeaCategory,
  IdeationSession,
  IdeationMessage,
  IdeationPrompt,
  PromptCategory,
  ProjectAnalysisResult,
  AnalysisSuggestion,
  StartSessionOptions,
  CreateIdeaInput,
  UpdateIdeaInput,
  ConvertToFeatureOptions,
};

// Ideation API interface
export interface IdeationAPI {
  // Session management
  startSession: (
    projectPath: string,
    options?: StartSessionOptions
  ) => Promise<{ success: boolean; session?: IdeationSession; error?: string }>;
  getSession: (
    projectPath: string,
    sessionId: string
  ) => Promise<{
    success: boolean;
    session?: IdeationSession;
    messages?: IdeationMessage[];
    error?: string;
  }>;
  sendMessage: (
    sessionId: string,
    message: string,
    options?: { imagePaths?: string[]; model?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  stopSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;

  // Ideas CRUD
  listIdeas: (projectPath: string) => Promise<{ success: boolean; ideas?: Idea[]; error?: string }>;
  createIdea: (
    projectPath: string,
    idea: CreateIdeaInput
  ) => Promise<{ success: boolean; idea?: Idea; error?: string }>;
  getIdea: (
    projectPath: string,
    ideaId: string
  ) => Promise<{ success: boolean; idea?: Idea; error?: string }>;
  updateIdea: (
    projectPath: string,
    ideaId: string,
    updates: UpdateIdeaInput
  ) => Promise<{ success: boolean; idea?: Idea; error?: string }>;
  deleteIdea: (
    projectPath: string,
    ideaId: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Project analysis
  analyzeProject: (
    projectPath: string
  ) => Promise<{ success: boolean; analysis?: ProjectAnalysisResult; error?: string }>;

  // Generate suggestions from a prompt
  generateSuggestions: (
    projectPath: string,
    promptId: string,
    category: IdeaCategory,
    count?: number,
    contextSources?: IdeationContextSources
  ) => Promise<{ success: boolean; suggestions?: AnalysisSuggestion[]; error?: string }>;

  // Convert to feature
  convertToFeature: (
    projectPath: string,
    ideaId: string,
    options?: ConvertToFeatureOptions
  ) => Promise<{ success: boolean; feature?: Feature; featureId?: string; error?: string }>;

  // Add suggestion directly to board as feature
  addSuggestionToBoard: (
    projectPath: string,
    suggestion: AnalysisSuggestion
  ) => Promise<{ success: boolean; featureId?: string; error?: string }>;

  // Get guided prompts (single source of truth from backend)
  getPrompts: () => Promise<{
    success: boolean;
    prompts?: IdeationPrompt[];
    categories?: PromptCategory[];
    error?: string;
  }>;

  // Event subscriptions
  onStream: (callback: (event: IdeationStreamEvent) => void) => () => void;
  onAnalysisEvent: (callback: (event: IdeationAnalysisEvent) => void) => () => void;
}

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface FileStats {
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtime: Date;
}

export interface DialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface FileResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface WriteResult {
  success: boolean;
  error?: string;
}

export interface ReaddirResult {
  success: boolean;
  entries?: FileEntry[];
  error?: string;
}

export interface StatResult {
  success: boolean;
  stats?: FileStats;
  error?: string;
}

// Options for creating a pull request
export interface CreatePROptions {
  projectPath?: string;
  commitMessage?: string;
  prTitle?: string;
  prBody?: string;
  baseBranch?: string;
  draft?: boolean;
  remote?: string;
  /** Remote to create the PR against (e.g. upstream). If not specified, inferred from repo setup. */
  targetRemote?: string;
}

// Re-export types from electron.d.ts for external use
export type {
  AutoModeEvent,
  ModelDefinition,
  ProviderStatus,
  WorktreeAPI,
  GitAPI,
  WorktreeInfo,
  WorktreeStatus,
  FileDiffsResult,
  FileDiffResult,
  FileStatus,
} from '@/types/electron';

// Import types for internal use in this file
import type {
  AutoModeEvent,
  WorktreeAPI,
  GitAPI,
  ModelDefinition,
  ProviderStatus,
} from '@/types/electron';

// Import HTTP API client (ES module)
import { getHttpApiClient, getServerUrlSync } from './http-api-client';

// Running Agent type
export interface RunningAgent {
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

export interface RunningAgentsResult {
  success: boolean;
  runningAgents?: RunningAgent[];
  totalCount?: number;
  error?: string;
}

export interface RunningAgentsAPI {
  getAll: () => Promise<RunningAgentsResult>;
}

// GitHub types
export interface GitHubLabel {
  name: string;
  color: string;
}

export interface GitHubAuthor {
  login: string;
  avatarUrl?: string;
}

export interface GitHubAssignee {
  login: string;
  avatarUrl?: string;
}

export interface LinkedPullRequest {
  number: number;
  title: string;
  state: string;
  url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  author: GitHubAuthor;
  createdAt: string;
  labels: GitHubLabel[];
  url: string;
  body: string;
  assignees: GitHubAssignee[];
  linkedPRs?: LinkedPullRequest[];
}

export interface GitHubPR {
  number: number;
  title: string;
  state: string;
  author: GitHubAuthor;
  createdAt: string;
  labels: GitHubLabel[];
  url: string;
  isDraft: boolean;
  headRefName: string;
  reviewDecision: string | null;
  mergeable: string;
  body: string;
}

export interface GitHubRemoteStatus {
  hasGitHubRemote: boolean;
  remoteUrl: string | null;
  owner: string | null;
  repo: string | null;
}

/** A review comment on a pull request (inline code comment or general PR comment) */
export interface PRReviewComment {
  id: string;
  author: string;
  avatarUrl?: string;
  body: string;
  /** File path for inline review comments */
  path?: string;
  /** Line number for inline review comments */
  line?: number;
  createdAt: string;
  updatedAt?: string;
  /** Whether this is an inline code review comment (vs general PR comment) */
  isReviewComment: boolean;
  /** Whether this comment is outdated (code has changed since) */
  isOutdated?: boolean;
  /** Whether the review thread containing this comment has been resolved */
  isResolved?: boolean;
  /** The GraphQL node ID of the review thread (used for resolve/unresolve mutations) */
  threadId?: string;
  /** The diff hunk context for the comment */
  diffHunk?: string;
  /** The side of the diff (LEFT or RIGHT) */
  side?: string;
  /** The commit ID the comment was made on */
  commitId?: string;
  /** Whether the comment author is a bot/app account */
  isBot?: boolean;
}

export interface GitHubAPI {
  checkRemote: (projectPath: string) => Promise<{
    success: boolean;
    hasGitHubRemote?: boolean;
    remoteUrl?: string | null;
    owner?: string | null;
    repo?: string | null;
    error?: string;
  }>;
  listIssues: (projectPath: string) => Promise<{
    success: boolean;
    openIssues?: GitHubIssue[];
    closedIssues?: GitHubIssue[];
    error?: string;
  }>;
  listPRs: (projectPath: string) => Promise<{
    success: boolean;
    openPRs?: GitHubPR[];
    mergedPRs?: GitHubPR[];
    error?: string;
  }>;
  /** Start async validation of a GitHub issue */
  validateIssue: (
    projectPath: string,
    issue: IssueValidationInput,
    model?: ModelId,
    thinkingLevel?: ThinkingLevel,
    reasoningEffort?: ReasoningEffort,
    providerId?: string
  ) => Promise<{ success: boolean; message?: string; issueNumber?: number; error?: string }>;
  /** Check validation status for an issue or all issues */
  getValidationStatus: (
    projectPath: string,
    issueNumber?: number
  ) => Promise<{
    success: boolean;
    isRunning?: boolean;
    startedAt?: string;
    runningIssues?: number[];
    error?: string;
  }>;
  /** Stop a running validation */
  stopValidation: (
    projectPath: string,
    issueNumber: number
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  /** Get stored validations for a project */
  getValidations: (
    projectPath: string,
    issueNumber?: number
  ) => Promise<{
    success: boolean;
    validation?: StoredValidation | null;
    validations?: StoredValidation[];
    isStale?: boolean;
    error?: string;
  }>;
  /** Mark a validation as viewed by the user */
  markValidationViewed: (
    projectPath: string,
    issueNumber: number
  ) => Promise<{ success: boolean; error?: string }>;
  /** Subscribe to validation events */
  onValidationEvent: (callback: (event: IssueValidationEvent) => void) => () => void;
  /** Fetch comments for a specific issue */
  getIssueComments: (
    projectPath: string,
    issueNumber: number,
    cursor?: string
  ) => Promise<{
    success: boolean;
    comments?: GitHubComment[];
    totalCount?: number;
    hasNextPage?: boolean;
    endCursor?: string;
    error?: string;
  }>;
  /** Fetch review comments for a specific pull request */
  getPRReviewComments: (
    projectPath: string,
    prNumber: number
  ) => Promise<{
    success: boolean;
    comments?: PRReviewComment[];
    totalCount?: number;
    error?: string;
  }>;
  /** Resolve or unresolve a PR review thread */
  resolveReviewThread: (
    projectPath: string,
    threadId: string,
    resolve: boolean
  ) => Promise<{
    success: boolean;
    isResolved?: boolean;
    error?: string;
  }>;
}

// Spec Regeneration types
export type SpecRegenerationEvent =
  | { type: 'spec_regeneration_progress'; content: string; projectPath: string }
  | {
      type: 'spec_regeneration_tool';
      tool: string;
      input: unknown;
      projectPath: string;
    }
  | { type: 'spec_regeneration_complete'; message: string; projectPath: string }
  | { type: 'spec_regeneration_error'; error: string; projectPath: string };

export interface SpecRegenerationAPI {
  create: (
    projectPath: string,
    projectOverview: string,
    generateFeatures?: boolean,
    analyzeProject?: boolean,
    maxFeatures?: number
  ) => Promise<{ success: boolean; error?: string }>;
  generate: (
    projectPath: string,
    projectDefinition: string,
    generateFeatures?: boolean,
    analyzeProject?: boolean,
    maxFeatures?: number
  ) => Promise<{ success: boolean; error?: string }>;
  generateFeatures: (
    projectPath: string,
    maxFeatures?: number
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;
  sync: (projectPath: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  stop: (projectPath?: string) => Promise<{ success: boolean; error?: string }>;
  status: (projectPath?: string) => Promise<{
    success: boolean;
    isRunning?: boolean;
    currentPhase?: string;
    projectPath?: string;
    error?: string;
  }>;
  onEvent: (callback: (event: SpecRegenerationEvent) => void) => () => void;
}

// Features API types
export interface FeaturesAPI {
  getAll: (
    projectPath: string
  ) => Promise<{ success: boolean; features?: Feature[]; error?: string }>;
  get: (
    projectPath: string,
    featureId: string
  ) => Promise<{ success: boolean; feature?: Feature; error?: string }>;
  create: (
    projectPath: string,
    feature: Feature
  ) => Promise<{ success: boolean; feature?: Feature; error?: string }>;
  update: (
    projectPath: string,
    featureId: string,
    updates: Partial<Feature>,
    descriptionHistorySource?: 'enhance' | 'edit',
    enhancementMode?: 'improve' | 'technical' | 'simplify' | 'acceptance' | 'ux-reviewer',
    preEnhancementDescription?: string
  ) => Promise<{ success: boolean; feature?: Feature; error?: string }>;
  delete: (projectPath: string, featureId: string) => Promise<{ success: boolean; error?: string }>;
  getAgentOutput: (
    projectPath: string,
    featureId: string
  ) => Promise<{ success: boolean; content?: string | null; error?: string }>;
  generateTitle: (
    description: string,
    projectPath?: string
  ) => Promise<{ success: boolean; title?: string; error?: string }>;
  getOrphaned: (projectPath: string) => Promise<{
    success: boolean;
    orphanedFeatures?: Array<{ feature: Feature; missingBranch: string }>;
    error?: string;
  }>;
  resolveOrphaned: (
    projectPath: string,
    featureId: string,
    action: 'delete' | 'create-worktree' | 'move-to-branch',
    targetBranch?: string | null
  ) => Promise<{
    success: boolean;
    action?: string;
    worktreePath?: string;
    branchName?: string;
    error?: string;
  }>;
  bulkResolveOrphaned: (
    projectPath: string,
    featureIds: string[],
    action: 'delete' | 'create-worktree' | 'move-to-branch',
    targetBranch?: string | null
  ) => Promise<{
    success: boolean;
    resolvedCount?: number;
    failedCount?: number;
    results?: Array<{ featureId: string; success: boolean; action?: string; error?: string }>;
    error?: string;
  }>;
}

export interface AutoModeAPI {
  start: (
    projectPath: string,
    branchName?: string | null,
    maxConcurrency?: number
  ) => Promise<{ success: boolean; error?: string }>;
  stop: (
    projectPath: string,
    branchName?: string | null
  ) => Promise<{ success: boolean; error?: string; runningFeatures?: number }>;
  stopFeature: (featureId: string) => Promise<{ success: boolean; error?: string }>;
  status: (
    projectPath?: string,
    branchName?: string | null
  ) => Promise<{
    success: boolean;
    isRunning?: boolean;
    isAutoLoopRunning?: boolean;
    currentFeatureId?: string | null;
    runningFeatures?: string[];
    runningProjects?: string[];
    runningCount?: number;
    maxConcurrency?: number;
    error?: string;
  }>;
  runFeature: (
    projectPath: string,
    featureId: string,
    useWorktrees?: boolean,
    worktreePath?: string
  ) => Promise<{ success: boolean; passes?: boolean; error?: string }>;
  verifyFeature: (
    projectPath: string,
    featureId: string
  ) => Promise<{ success: boolean; passes?: boolean; error?: string }>;
  resumeFeature: (
    projectPath: string,
    featureId: string,
    useWorktrees?: boolean
  ) => Promise<{ success: boolean; passes?: boolean; error?: string }>;
  contextExists: (
    projectPath: string,
    featureId: string
  ) => Promise<{ success: boolean; exists?: boolean; error?: string }>;
  analyzeProject: (
    projectPath: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  followUpFeature: (
    projectPath: string,
    featureId: string,
    prompt: string,
    imagePaths?: string[],
    useWorktrees?: boolean
  ) => Promise<{ success: boolean; passes?: boolean; error?: string }>;
  commitFeature: (
    projectPath: string,
    featureId: string,
    worktreePath?: string
  ) => Promise<{ success: boolean; error?: string }>;
  approvePlan: (
    projectPath: string,
    featureId: string,
    approved: boolean,
    editedPlan?: string,
    feedback?: string
  ) => Promise<{ success: boolean; error?: string }>;
  resumeInterrupted: (
    projectPath: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  reconcile: (projectPath: string) => Promise<{
    success: boolean;
    reconciledCount?: number;
    message?: string;
    error?: string;
  }>;
  onEvent: (callback: (event: AutoModeEvent) => void) => () => void;
}

export interface SaveImageResult {
  success: boolean;
  path?: string;
  error?: string;
}

// Notifications API interface
import type {
  Notification,
  StoredEvent,
  StoredEventSummary,
  EventHistoryFilter,
  EventReplayResult,
} from '@automaker/types';

export interface NotificationsAPI {
  list: (projectPath: string) => Promise<{
    success: boolean;
    notifications?: Notification[];
    error?: string;
  }>;
  getUnreadCount: (projectPath: string) => Promise<{
    success: boolean;
    count?: number;
    error?: string;
  }>;
  markAsRead: (
    projectPath: string,
    notificationId?: string
  ) => Promise<{
    success: boolean;
    notification?: Notification;
    count?: number;
    error?: string;
  }>;
  dismiss: (
    projectPath: string,
    notificationId?: string
  ) => Promise<{
    success: boolean;
    dismissed?: boolean;
    count?: number;
    error?: string;
  }>;
}

// Event History API interface
export interface EventHistoryAPI {
  list: (
    projectPath: string,
    filter?: EventHistoryFilter
  ) => Promise<{
    success: boolean;
    events?: StoredEventSummary[];
    total?: number;
    error?: string;
  }>;
  get: (
    projectPath: string,
    eventId: string
  ) => Promise<{
    success: boolean;
    event?: StoredEvent;
    error?: string;
  }>;
  delete: (
    projectPath: string,
    eventId: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;
  clear: (projectPath: string) => Promise<{
    success: boolean;
    cleared?: number;
    error?: string;
  }>;
  replay: (
    projectPath: string,
    eventId: string,
    hookIds?: string[]
  ) => Promise<{
    success: boolean;
    result?: EventReplayResult;
    error?: string;
  }>;
}

export interface ElectronAPI {
  ping: () => Promise<string>;
  getApiKey?: () => Promise<string | null>;
  quit?: () => Promise<void>;
  openExternalLink: (url: string) => Promise<{ success: boolean; error?: string }>;
  openDirectory: () => Promise<DialogResult>;
  openFile: (options?: object) => Promise<DialogResult>;
  readFile: (filePath: string) => Promise<FileResult>;
  writeFile: (filePath: string, content: string) => Promise<WriteResult>;
  mkdir: (dirPath: string) => Promise<WriteResult>;
  readdir: (dirPath: string) => Promise<ReaddirResult>;
  exists: (filePath: string) => Promise<boolean>;
  stat: (filePath: string) => Promise<StatResult>;
  deleteFile: (filePath: string) => Promise<WriteResult>;
  trashItem?: (filePath: string) => Promise<WriteResult>;
  copyItem?: (
    sourcePath: string,
    destinationPath: string,
    overwrite?: boolean
  ) => Promise<WriteResult & { exists?: boolean }>;
  moveItem?: (
    sourcePath: string,
    destinationPath: string,
    overwrite?: boolean
  ) => Promise<WriteResult & { exists?: boolean }>;
  downloadItem?: (filePath: string) => Promise<void>;
  getPath: (name: string) => Promise<string>;
  openInEditor?: (
    filePath: string,
    line?: number,
    column?: number
  ) => Promise<{ success: boolean; error?: string }>;
  saveImageToTemp?: (
    data: string,
    filename: string,
    mimeType: string,
    projectPath?: string
  ) => Promise<SaveImageResult>;
  platform?: 'darwin' | 'win32' | 'linux';
  isElectron?: boolean;
  checkClaudeCli?: () => Promise<{
    success: boolean;
    status?: string;
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
    error?: string;
  }>;
  model?: {
    getAvailable: () => Promise<{
      success: boolean;
      models?: ModelDefinition[];
      error?: string;
    }>;
    checkProviders: () => Promise<{
      success: boolean;
      providers?: Record<string, ProviderStatus>;
      error?: string;
    }>;
  };
  worktree?: WorktreeAPI;
  git?: GitAPI;
  specRegeneration?: SpecRegenerationAPI;
  autoMode?: AutoModeAPI;
  features?: FeaturesAPI;
  runningAgents?: RunningAgentsAPI;
  github?: GitHubAPI;
  enhancePrompt?: {
    enhance: (
      originalText: string,
      enhancementMode: string,
      model?: string,
      thinkingLevel?: string,
      projectPath?: string
    ) => Promise<{
      success: boolean;
      enhancedText?: string;
      error?: string;
    }>;
  };
  templates?: {
    clone: (
      repoUrl: string,
      projectName: string,
      parentDir: string
    ) => Promise<{ success: boolean; projectPath?: string; error?: string }>;
  };
  backlogPlan?: {
    generate: (
      projectPath: string,
      prompt: string,
      model?: string,
      branchName?: string
    ) => Promise<{ success: boolean; error?: string }>;
    stop: () => Promise<{ success: boolean; error?: string }>;
    status: (projectPath: string) => Promise<{
      success: boolean;
      isRunning?: boolean;
      savedPlan?: {
        savedAt: string;
        prompt: string;
        model?: string;
        result: {
          changes: Array<{
            type: 'add' | 'update' | 'delete';
            featureId?: string;
            feature?: Record<string, unknown>;
            reason: string;
          }>;
          summary: string;
          dependencyUpdates: Array<{
            featureId: string;
            removedDependencies: string[];
            addedDependencies: string[];
          }>;
        };
      } | null;
      error?: string;
    }>;
    apply: (
      projectPath: string,
      plan: {
        changes: Array<{
          type: 'add' | 'update' | 'delete';
          featureId?: string;
          feature?: Record<string, unknown>;
          reason: string;
        }>;
        summary: string;
        dependencyUpdates: Array<{
          featureId: string;
          removedDependencies: string[];
          addedDependencies: string[];
        }>;
      },
      branchName?: string
    ) => Promise<{ success: boolean; appliedChanges?: string[]; error?: string }>;
    clear: (projectPath: string) => Promise<{ success: boolean; error?: string }>;
    onEvent: (callback: (data: unknown) => void) => () => void;
  };
  // Setup API surface is implemented by the main process and mirrored by HttpApiClient.
  // Keep this intentionally loose to avoid tight coupling between front-end and server types.
  setup?: SetupAPI;
  agent?: {
    start: (
      sessionId: string,
      workingDirectory?: string
    ) => Promise<{
      success: boolean;
      messages?: Message[];
      error?: string;
    }>;
    send: (
      sessionId: string,
      message: string,
      workingDirectory?: string,
      imagePaths?: string[],
      model?: string
    ) => Promise<{ success: boolean; error?: string }>;
    getHistory: (sessionId: string) => Promise<{
      success: boolean;
      messages?: Message[];
      isRunning?: boolean;
      error?: string;
    }>;
    stop: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
    clear: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
    queueList: (sessionId: string) => Promise<{
      success: boolean;
      queue?: Array<{
        id: string;
        message: string;
        imagePaths?: string[];
        model?: string;
        thinkingLevel?: string;
        addedAt: string;
      }>;
      error?: string;
    }>;
    onStream: (callback: (data: unknown) => void) => () => void;
  };
  sessions?: {
    list: (includeArchived?: boolean) => Promise<{
      success: boolean;
      sessions?: SessionListItem[];
      error?: string;
    }>;
    create: (
      name: string,
      projectPath: string,
      workingDirectory?: string
    ) => Promise<{
      success: boolean;
      session?: {
        id: string;
        name: string;
        projectPath: string;
        workingDirectory?: string;
        createdAt: string;
        updatedAt: string;
      };
      error?: string;
    }>;
    update: (
      sessionId: string,
      name?: string,
      tags?: string[]
    ) => Promise<{ success: boolean; error?: string }>;
    archive: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
    unarchive: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
    delete: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  };
  claude?: {
    getUsage: () => Promise<ClaudeUsageResponse>;
  };
  context?: {
    describeImage: (imagePath: string) => Promise<{
      success: boolean;
      description?: string;
      error?: string;
    }>;
    describeFile: (filePath: string) => Promise<{
      success: boolean;
      description?: string;
      error?: string;
    }>;
  };
  ideation?: IdeationAPI;
  notifications?: NotificationsAPI;
  eventHistory?: EventHistoryAPI;
  codex?: {
    getUsage: () => Promise<CodexUsageResponse>;
    getModels: (refresh?: boolean) => Promise<{
      success: boolean;
      models?: Array<{
        id: string;
        label: string;
        description: string;
        hasThinking: boolean;
        supportsVision: boolean;
        tier: 'premium' | 'standard' | 'basic';
        isDefault: boolean;
      }>;
      cachedAt?: number;
      error?: string;
    }>;
  };
  zai?: {
    getUsage: () => Promise<ZaiUsageResponse>;
    verify: (apiKey: string) => Promise<{
      success: boolean;
      authenticated: boolean;
      message?: string;
      error?: string;
    }>;
  };
  gemini?: {
    getUsage: () => Promise<GeminiUsageResponse>;
  };
  settings?: {
    getStatus: () => Promise<{
      success: boolean;
      hasGlobalSettings: boolean;
      hasCredentials: boolean;
      dataDir: string;
      needsMigration: boolean;
    }>;
    getGlobal: () => Promise<{
      success: boolean;
      settings?: Record<string, unknown>;
      error?: string;
    }>;
    updateGlobal: (updates: Record<string, unknown>) => Promise<{
      success: boolean;
      settings?: Record<string, unknown>;
      error?: string;
    }>;
    getCredentials: () => Promise<{
      success: boolean;
      credentials?: {
        anthropic: { configured: boolean; masked: string };
        google: { configured: boolean; masked: string };
        openai: { configured: boolean; masked: string };
      };
      error?: string;
    }>;
    updateCredentials: (updates: {
      apiKeys?: { anthropic?: string; google?: string; openai?: string };
    }) => Promise<{
      success: boolean;
      credentials?: {
        anthropic: { configured: boolean; masked: string };
        google: { configured: boolean; masked: string };
        openai: { configured: boolean; masked: string };
      };
      error?: string;
    }>;
    getProject: (projectPath: string) => Promise<{
      success: boolean;
      settings?: Record<string, unknown>;
      error?: string;
    }>;
    updateProject: (
      projectPath: string,
      updates: Record<string, unknown>
    ) => Promise<{
      success: boolean;
      settings?: Record<string, unknown>;
      error?: string;
    }>;
    migrate: (data: Record<string, string>) => Promise<{
      success: boolean;
      migratedGlobalSettings: boolean;
      migratedCredentials: boolean;
      migratedProjectCount: number;
      errors: string[];
    }>;
    discoverAgents: (
      projectPath?: string,
      sources?: Array<'user' | 'project'>
    ) => Promise<{
      success: boolean;
      agents?: Array<{
        name: string;
        definition: {
          description: string;
          prompt: string;
          tools?: string[];
          model?: ClaudeTier | 'inherit';
        };
        source: 'user' | 'project';
        filePath: string;
      }>;
      error?: string;
    }>;
  };
}

// Note: Window interface is declared in @/types/electron.d.ts
// Do not redeclare here to avoid type conflicts

// Local storage keys
const STORAGE_KEYS = {
  PROJECTS: 'automaker_projects',
  CURRENT_PROJECT: 'automaker_current_project',
  TRASHED_PROJECTS: 'automaker_trashed_projects',
} as const;

// Check if we're in Electron (for UI indicators only)
export const isElectron = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.isElectron === true) {
    return true;
  }

  return !!window.electronAPI?.isElectron;
};

// Check if backend server is available
let serverAvailable: boolean | null = null;
let serverCheckPromise: Promise<boolean> | null = null;

export const checkServerAvailable = async (): Promise<boolean> => {
  if (serverAvailable !== null) return serverAvailable;
  if (serverCheckPromise) return serverCheckPromise;

  serverCheckPromise = (async () => {
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || getServerUrlSync();
      const response = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      serverAvailable = response.ok;
    } catch {
      serverAvailable = false;
    }
    return serverAvailable;
  })();

  return serverCheckPromise;
};

// Reset server check (useful for retrying connection)
export const resetServerCheck = (): void => {
  serverAvailable = null;
  serverCheckPromise = null;
};

// Cached HTTP client instance
let httpClientInstance: ElectronAPI | null = null;

/**
 * Get the HTTP API client
 *
 * All API calls go through HTTP to the backend server.
 * This is the only transport mode supported.
 */
export const getElectronAPI = (): ElectronAPI => {
  if (typeof window === 'undefined') {
    throw new Error('Cannot get API during SSR');
  }

  if (!httpClientInstance) {
    httpClientInstance = getHttpApiClient();
  }
  return httpClientInstance!;
};

// Async version (same as sync since HTTP client is synchronously instantiated)
export const getElectronAPIAsync = async (): Promise<ElectronAPI> => {
  return getElectronAPI();
};

// Check if backend is connected (for showing connection status in UI)
export const isBackendConnected = async (): Promise<boolean> => {
  return await checkServerAvailable();
};

/**
 * Get the current API mode being used
 * Always returns "http" since that's the only mode now
 */
export const getCurrentApiMode = (): 'http' => {
  return 'http';
};

// Debug helpers
if (typeof window !== 'undefined') {
  window.__checkApiMode = () => {
    console.log('Current API mode:', getCurrentApiMode());
    console.log('isElectron():', isElectron());
  };
}

// Install progress event type used by useCliInstallation hook
interface InstallProgressEvent {
  cli?: string;
  data?: string;
  type?: string;
}

// Setup API interface
interface SetupAPI {
  getClaudeStatus: () => Promise<{
    success: boolean;
    status?: string;
    installed?: boolean;
    method?: string;
    version?: string;
    path?: string;
    auth?: {
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
    };
    error?: string;
  }>;
  installClaude: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  authClaude: () => Promise<{
    success: boolean;
    token?: string;
    requiresManualAuth?: boolean;
    terminalOpened?: boolean;
    command?: string;
    error?: string;
    message?: string;
    output?: string;
  }>;
  deauthClaude?: () => Promise<{
    success: boolean;
    requiresManualDeauth?: boolean;
    command?: string;
    message?: string;
    error?: string;
  }>;
  storeApiKey: (provider: string, apiKey: string) => Promise<{ success: boolean; error?: string }>;
  saveApiKey?: (provider: string, apiKey: string) => Promise<{ success: boolean; error?: string }>;
  getApiKeys: () => Promise<{
    success: boolean;
    hasAnthropicKey: boolean;
    hasGoogleKey: boolean;
    hasOpenaiKey: boolean;
  }>;
  deleteApiKey: (
    provider: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  getPlatform: () => Promise<{
    success: boolean;
    platform: string;
    arch: string;
    homeDir: string;
    isWindows: boolean;
    isMac: boolean;
    isLinux: boolean;
  }>;
  verifyClaudeAuth: (authMethod?: 'cli' | 'api_key') => Promise<{
    success: boolean;
    authenticated: boolean;
    authType?: 'oauth' | 'api_key' | 'cli';
    error?: string;
  }>;
  getGhStatus?: () => Promise<{
    success: boolean;
    installed: boolean;
    authenticated: boolean;
    version: string | null;
    path: string | null;
    user: string | null;
    error?: string;
  }>;
  // Cursor CLI methods
  getCursorStatus?: () => Promise<{
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
  }>;
  authCursor?: () => Promise<{
    success: boolean;
    token?: string;
    requiresManualAuth?: boolean;
    terminalOpened?: boolean;
    command?: string;
    message?: string;
    output?: string;
  }>;
  deauthCursor?: () => Promise<{
    success: boolean;
    requiresManualDeauth?: boolean;
    command?: string;
    message?: string;
    error?: string;
  }>;
  // Codex CLI methods
  getCodexStatus?: () => Promise<{
    success: boolean;
    status?: string;
    installed?: boolean;
    method?: string;
    version?: string;
    path?: string;
    auth?: {
      authenticated: boolean;
      method: string;
      hasAuthFile?: boolean;
      hasOAuthToken?: boolean;
      hasApiKey?: boolean;
      hasStoredApiKey?: boolean;
      hasEnvApiKey?: boolean;
    };
    error?: string;
  }>;
  installCodex?: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  authCodex?: () => Promise<{
    success: boolean;
    token?: string;
    requiresManualAuth?: boolean;
    terminalOpened?: boolean;
    command?: string;
    error?: string;
    message?: string;
    output?: string;
  }>;
  deauthCodex?: () => Promise<{
    success: boolean;
    requiresManualDeauth?: boolean;
    command?: string;
    message?: string;
    error?: string;
  }>;
  verifyCodexAuth?: (
    authMethod: 'cli' | 'api_key',
    apiKey?: string
  ) => Promise<{
    success: boolean;
    authenticated: boolean;
    error?: string;
  }>;
  // OpenCode CLI methods
  getOpencodeStatus?: () => Promise<{
    success: boolean;
    status?: string;
    installed?: boolean;
    method?: string;
    version?: string;
    path?: string;
    recommendation?: string;
    installCommands?: {
      macos?: string;
      linux?: string;
      npm?: string;
    };
    auth?: {
      authenticated: boolean;
      method: string;
      hasAuthFile?: boolean;
      hasOAuthToken?: boolean;
      hasApiKey?: boolean;
      hasStoredApiKey?: boolean;
      hasEnvApiKey?: boolean;
    };
    error?: string;
  }>;
  authOpencode?: () => Promise<{
    success: boolean;
    token?: string;
    requiresManualAuth?: boolean;
    terminalOpened?: boolean;
    command?: string;
    message?: string;
    output?: string;
  }>;
  deauthOpencode?: () => Promise<{
    success: boolean;
    requiresManualDeauth?: boolean;
    command?: string;
    message?: string;
    error?: string;
  }>;
  getOpencodeModels?: (refresh?: boolean) => Promise<{
    success: boolean;
    models?: Array<{
      id: string;
      name: string;
      modelString: string;
      provider: string;
      description: string;
      supportsTools: boolean;
      supportsVision: boolean;
      tier: string;
      default?: boolean;
    }>;
    count?: number;
    cached?: boolean;
    error?: string;
  }>;
  refreshOpencodeModels?: () => Promise<{
    success: boolean;
    models?: Array<{
      id: string;
      name: string;
      modelString: string;
      provider: string;
      description: string;
      supportsTools: boolean;
      supportsVision: boolean;
      tier: string;
      default?: boolean;
    }>;
    count?: number;
    error?: string;
  }>;
  getOpencodeProviders?: () => Promise<{
    success: boolean;
    providers?: Array<{
      id: string;
      name: string;
      authenticated: boolean;
      authMethod?: 'oauth' | 'api_key';
    }>;
    authenticated?: Array<{
      id: string;
      name: string;
      authenticated: boolean;
      authMethod?: 'oauth' | 'api_key';
    }>;
    error?: string;
  }>;
  clearOpencodeCache?: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  // Gemini CLI methods
  getGeminiStatus?: () => Promise<{
    success: boolean;
    status?: string;
    installed?: boolean;
    method?: string;
    version?: string;
    path?: string;
    recommendation?: string;
    installCommands?: {
      macos?: string;
      linux?: string;
      npm?: string;
    };
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
  }>;
  authGemini?: () => Promise<{
    success: boolean;
    requiresManualAuth?: boolean;
    command?: string;
    message?: string;
    error?: string;
  }>;
  deauthGemini?: () => Promise<{
    success: boolean;
    requiresManualDeauth?: boolean;
    command?: string;
    message?: string;
    error?: string;
  }>;
  // Copilot SDK methods
  getCopilotStatus?: () => Promise<{
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
  }>;
  onInstallProgress?: (
    callback: (progress: InstallProgressEvent) => void
  ) => (() => void) | undefined;
  onAuthProgress?: (callback: (progress: InstallProgressEvent) => void) => (() => void) | undefined;
}

// Utility functions for project management

export interface Project {
  id: string;
  name: string;
  path: string;
  lastOpened?: string;
  theme?: string; // Per-project theme override (uses ThemeMode from app-store)
  fontFamilySans?: string; // Per-project UI/sans font override
  fontFamilyMono?: string; // Per-project code/mono font override
  isFavorite?: boolean; // Pin project to top of dashboard
  icon?: string; // Lucide icon name for project identification
  customIconPath?: string; // Path to custom uploaded icon image in .automaker/images/
  /**
   * Override the active Claude API profile for this project.
   * - undefined: Use global setting (activeClaudeApiProfileId)
   * - null: Explicitly use Direct Anthropic API (no profile)
   * - string: Use specific profile by ID
   * @deprecated Use phaseModelOverrides instead for per-phase model selection
   */
  activeClaudeApiProfileId?: string | null;
  /**
   * Per-phase model overrides for this project.
   * Keys are phase names (e.g., 'enhancementModel'), values are PhaseModelEntry.
   * If a phase is not present, the global setting is used.
   */
  phaseModelOverrides?: Partial<import('@automaker/types').PhaseModelConfig>;
  /**
   * Override the default model for new feature cards in this project.
   * If not specified, falls back to the global defaultFeatureModel setting.
   */
  defaultFeatureModel?: import('@automaker/types').PhaseModelEntry;
}

export interface TrashedProject extends Project {
  trashedAt: string;
  deletedFromDisk?: boolean;
}

export const getStoredProjects = (): Project[] => {
  return getJSON<Project[]>(STORAGE_KEYS.PROJECTS) ?? [];
};

export const saveProjects = (projects: Project[]): void => {
  setJSON(STORAGE_KEYS.PROJECTS, projects);
};

export const getCurrentProject = (): Project | null => {
  return getJSON<Project>(STORAGE_KEYS.CURRENT_PROJECT);
};

export const setCurrentProject = (project: Project | null): void => {
  if (project) {
    setJSON(STORAGE_KEYS.CURRENT_PROJECT, project);
  } else {
    removeItem(STORAGE_KEYS.CURRENT_PROJECT);
  }
};

export const addProject = (project: Project): void => {
  const projects = getStoredProjects();
  const existing = projects.findIndex((p) => p.path === project.path);
  if (existing >= 0) {
    projects[existing] = { ...project, lastOpened: new Date().toISOString() };
  } else {
    projects.push({ ...project, lastOpened: new Date().toISOString() });
  }
  saveProjects(projects);
};

export const removeProject = (projectId: string): void => {
  const projects = getStoredProjects().filter((p) => p.id !== projectId);
  saveProjects(projects);
};

export const getStoredTrashedProjects = (): TrashedProject[] => {
  return getJSON<TrashedProject[]>(STORAGE_KEYS.TRASHED_PROJECTS) ?? [];
};

export const saveTrashedProjects = (projects: TrashedProject[]): void => {
  setJSON(STORAGE_KEYS.TRASHED_PROJECTS, projects);
};
