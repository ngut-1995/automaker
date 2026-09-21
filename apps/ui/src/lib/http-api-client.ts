/**
 * HTTP API Client for web mode
 *
 * This client provides the same API as the Electron IPC bridge,
 * but communicates with the backend server via HTTP/WebSocket.
 */

import { createLogger } from '@automaker/utils/logger';
import type {
  ElectronAPI,
  FileResult,
  WriteResult,
  ReaddirResult,
  StatResult,
  DialogResult,
  SaveImageResult,
  AutoModeAPI,
  FeaturesAPI,
  SpecRegenerationAPI,
  AutoModeEvent,
  SpecRegenerationEvent,
  GitHubAPI,
  IssueValidationInput,
  IssueValidationEvent,
  IdeationAPI,
  IdeaCategory,
  AnalysisSuggestion,
  StartSessionOptions,
  CreateIdeaInput,
  UpdateIdeaInput,
  ConvertToFeatureOptions,
  NotificationsAPI,
  EventHistoryAPI,
  CreatePROptions,
} from './electron';
import type {
  IdeationContextSources,
  EventHistoryFilter,
  IdeationStreamEvent,
  IdeationAnalysisEvent,
  Notification,
  OperationName,
  OperationDefinition,
  RequestOf,
  ResponseOf,
  EventType,
} from '@automaker/types';
import { OPERATIONS, operationPath } from '@automaker/types';
import type { Message, SessionListItem } from '@/types/electron';
import type {
  ClaudeUsageResponse,
  CodexUsageResponse,
  GeminiUsage,
  ZaiUsageResponse,
} from '@/store/app-store';
import type { WorktreeAPI, GitAPI } from '@/types/electron';
import type {
  ModelId,
  ModelDefinition,
  ThinkingLevel,
  ReasoningEffort,
  Feature,
} from '@automaker/types';
import { getGlobalFileBrowser } from '@/contexts/file-browser-context';

const logger = createLogger('HttpClient');
const NO_STORE_CACHE_MODE: RequestCache = 'no-store';

/**
 * Error thrown for a non-ok HTTP response. Carries the status and the parsed
 * body so callers (e.g. the terminal session-limit flow) can react to a
 * specific server response without re-implementing the transport.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Options accepted by the shared transport and the JSON helpers on top of it. */
interface TransportOptions {
  body?: unknown;
  signal?: AbortSignal;
  /** Extra headers merged over the auth headers (e.g. X-Terminal-Token). */
  headers?: Record<string, string>;
  /**
   * When true, a 401/403 is returned to the caller instead of triggering the
   * global logout cascade. Used by the auth-bootstrap flows, which must not
   * redirect the user mid-login.
   */
  allowUnauthorized?: boolean;
}

/**
 * Append a request object to a path as a query string (used by GET operations).
 * Undefined and null values are omitted.
 */
const appendQuery = (path: string, input: unknown): string => {
  if (!input || typeof input !== 'object') return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

/** Matches `:param` segments in a contract path. */
const PATH_PARAM_PATTERN = /:([A-Za-z0-9_]+)/g;

/**
 * Substitute any `:param` segment in a contract path with the matching request
 * value. Most contract paths are static, so this is a no-op for them.
 */
const resolvePathParams = (path: string, input: unknown): string => {
  if (!input || typeof input !== 'object') return path;
  return path.replace(PATH_PARAM_PATTERN, (token, key: string) => {
    const value = (input as Record<string, unknown>)[key];
    return value === undefined || value === null ? token : encodeURIComponent(String(value));
  });
};

/**
 * Drop values already consumed as `:param` segments so they are not repeated in
 * the query string of a GET request.
 */
const queryInputWithoutPathParams = (path: string, input: unknown): unknown => {
  if (!input || typeof input !== 'object') return input;
  const keys = [...path.matchAll(PATH_PARAM_PATTERN)].map((match) => match[1]);
  if (keys.length === 0) return input;
  const rest = { ...(input as Record<string, unknown>) };
  for (const key of keys) delete rest[key];
  return rest;
};

/**
 * Build the header that carries a terminal session token. Terminal operations
 * below the public status/auth/logout routes are protected by
 * `terminalAuthMiddleware`, which reads `X-Terminal-Token`.
 */
const terminalTokenHeaders = (token?: string): Record<string, string> | undefined =>
  token ? { 'X-Terminal-Token': token } : undefined;

// Cached server URL (set during initialization in Electron mode)
let cachedServerUrl: string | null = null;

/**
 * Notify the UI that the current session is no longer valid.
 * Used to redirect the user to a logged-out route on 401/403 responses.
 */
const notifyLoggedOut = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('automaker:logged-out'));
  } catch {
    // Ignore - navigation will still be handled by failed requests in most cases
  }
};

/** Guards the logout call inside handleUnauthorized against re-entry. */
let handlingUnauthorized = false;

/**
 * Handle an unauthorized response in cookie/session auth flows.
 * Clears in-memory token and attempts to clear the cookie (best-effort),
 * then notifies the UI to redirect. The logout goes through the contract-
 * backed client; the transport used there does not re-enter this handler.
 */
const handleUnauthorized = (): void => {
  clearSessionToken();
  // Best-effort cookie clear (avoid throwing)
  if (!handlingUnauthorized) {
    handlingUnauthorized = true;
    void getHttpApiClient()
      .logout()
      .catch(() => {})
      .finally(() => {
        handlingUnauthorized = false;
      });
  }
  notifyLoggedOut();
};

/**
 * Notify the UI that the server is offline/unreachable.
 * Used to redirect the user to the login page which will show server unavailable.
 */
const notifyServerOffline = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('automaker:server-offline'));
  } catch {
    // Ignore
  }
};

/**
 * Check if an error is a connection error (server offline/unreachable).
 * These are typically TypeError with 'Failed to fetch' or similar network errors.
 */
export const isConnectionError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('connection refused')
    );
  }
  // Check for error objects with message property
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message).toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('connection refused')
    );
  }
  return false;
};

/**
 * Handle a server offline error by verifying the server is actually down
 * before redirecting to login. Uses debouncing to coalesce rapid errors
 * and a health check to confirm the server isn't just experiencing a
 * transient network blip.
 */
let serverOfflineCheckPending = false;

export const handleServerOffline = (): void => {
  // Debounce: if a check is already in progress, skip
  if (serverOfflineCheckPending) return;
  serverOfflineCheckPending = true;

  // Wait briefly to let transient errors settle, then verify with a health check
  setTimeout(() => {
    (async () => {
      try {
        await getHttpApiClient().health.check(AbortSignal.timeout(5000));
        logger.info('Server health check passed, ignoring transient connection error');
        return;
      } catch {
        // Health check failed - server is genuinely offline
      }

      logger.error('Server appears to be offline, redirecting to login...');
      notifyServerOffline();
    })().finally(() => {
      serverOfflineCheckPending = false;
    });
  }, 2000);
};

/**
 * Initialize server URL from Electron IPC.
 * Must be called early in Electron mode before making API requests.
 */
export const initServerUrl = async (): Promise<void> => {
  const electron = typeof window !== 'undefined' ? window.electronAPI : null;
  if (electron?.getServerUrl) {
    try {
      cachedServerUrl = await electron.getServerUrl();
      logger.info('Server URL from Electron:', cachedServerUrl);
    } catch (error) {
      logger.warn('Failed to get server URL from Electron:', error);
    }
  }
};

// Server URL - uses cached value from IPC or environment variable
const getServerUrl = (): string => {
  // Use cached URL from Electron IPC if available
  if (cachedServerUrl) {
    return cachedServerUrl;
  }

  if (typeof window !== 'undefined') {
    const envUrl = import.meta.env.VITE_SERVER_URL;
    if (envUrl) return envUrl;

    // In web mode (not Electron), use relative URL to leverage Vite proxy
    // This avoids CORS issues since requests appear same-origin
    if (!window.isElectron) {
      return '';
    }
  }
  // Use VITE_HOSTNAME if set, otherwise default to localhost
  const hostname = import.meta.env.VITE_HOSTNAME || 'localhost';
  return `http://${hostname}:3008`;
};

/**
 * Get the server URL (exported for use in other modules)
 */
export const getServerUrlSync = (): string => getServerUrl();

// Cached API key for authentication (Electron mode only)
let cachedApiKey: string | null = null;
let apiKeyInitialized = false;
let apiKeyInitPromise: Promise<void> | null = null;

// Cached session token for authentication (Web mode - explicit header auth)
// Persisted to localStorage to survive page reloads
let cachedSessionToken: string | null = null;
const SESSION_TOKEN_KEY = 'automaker:sessionToken';

// Initialize cached session token from localStorage on module load
// This ensures web mode survives page reloads with valid authentication
const initSessionToken = (): void => {
  if (typeof window === 'undefined') return; // Skip in SSR
  try {
    cachedSessionToken = window.localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    // localStorage might be disabled or unavailable
    cachedSessionToken = null;
  }
};

// Initialize on module load
initSessionToken();

// Get API key for Electron mode (returns cached value after initialization)
// Exported for use in WebSocket connections that need auth
export const getApiKey = (): string | null => cachedApiKey;

/**
 * Wait for API key initialization to complete.
 * Returns immediately if already initialized.
 */
export const waitForApiKeyInit = (): Promise<void> => {
  if (apiKeyInitialized) return Promise.resolve();
  if (apiKeyInitPromise) return apiKeyInitPromise;
  // If not started yet, start it now
  return initApiKey();
};

// Get session token for Web mode (returns cached value after login)
export const getSessionToken = (): string | null => cachedSessionToken;

// Set session token (called after login) - persists to localStorage for page reload survival
export const setSessionToken = (token: string | null): void => {
  cachedSessionToken = token;
  if (typeof window === 'undefined') return; // Skip in SSR
  try {
    if (token) {
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // localStorage might be disabled; continue with in-memory cache
  }
};

// Clear session token (called on logout)
export const clearSessionToken = (): void => {
  cachedSessionToken = null;
  if (typeof window === 'undefined') return; // Skip in SSR
  try {
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // localStorage might be disabled
  }
};

/**
 * Check if we're running in Electron mode
 */
export const isElectronMode = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Prefer a stable runtime marker from preload.
  // In some dev/electron setups, method availability can be temporarily undefined
  // during early startup, but `isElectron` remains reliable.
  const api = window.electronAPI;
  return api?.isElectron === true || !!api?.getApiKey;
};

// Cached external server mode flag
let cachedExternalServerMode: boolean | null = null;

/**
 * Check if running in external server mode (Docker API)
 * In this mode, Electron uses session-based auth like web mode
 */
export const checkExternalServerMode = async (): Promise<boolean> => {
  if (cachedExternalServerMode !== null) {
    return cachedExternalServerMode;
  }

  if (typeof window !== 'undefined') {
    const api = window.electronAPI;
    if (api?.isExternalServerMode) {
      try {
        cachedExternalServerMode = Boolean(await api.isExternalServerMode());
        return cachedExternalServerMode;
      } catch (error) {
        logger.warn('Failed to check external server mode:', error);
      }
    }
  }

  cachedExternalServerMode = false;
  return false;
};

/**
 * Get cached external server mode (synchronous, returns null if not yet checked)
 */
export const isExternalServerMode = (): boolean | null => cachedExternalServerMode;

/**
 * Initialize API key and server URL for Electron mode authentication.
 * In web mode, authentication uses HTTP-only cookies instead.
 *
 * This should be called early in app initialization.
 */
export const initApiKey = async (): Promise<void> => {
  // Return existing promise if already in progress
  if (apiKeyInitPromise) return apiKeyInitPromise;

  // Return immediately if already initialized
  if (apiKeyInitialized) return;

  // Create and store the promise so concurrent calls wait for the same initialization
  apiKeyInitPromise = (async () => {
    try {
      // Initialize server URL from Electron IPC first (needed for API requests)
      await initServerUrl();

      // Only Electron mode uses API key header auth
      if (typeof window !== 'undefined' && window.electronAPI?.getApiKey) {
        try {
          cachedApiKey = await window.electronAPI.getApiKey();
          if (cachedApiKey) {
            logger.info('Using API key from Electron');
            return;
          }
        } catch (error) {
          logger.warn('Failed to get API key from Electron:', error);
        }
      }

      // In web mode, authentication is handled via HTTP-only cookies
      logger.info('Web mode - using cookie-based authentication');
    } finally {
      // Mark as initialized after completion, regardless of success or failure
      apiKeyInitialized = true;
    }
  })();

  return apiKeyInitPromise;
};

/**
 * Check authentication status with the server.
 * Delegates to the contract-backed client method.
 */
export const checkAuthStatus = (): Promise<{
  authenticated: boolean;
  required: boolean;
}> => getHttpApiClient().checkAuthStatus();

/**
 * Login with API key (for web mode).
 * Delegates to the contract-backed client method, which stores the session
 * token and verifies the session after a successful login.
 */
export const login = (
  apiKey: string
): Promise<{ success: boolean; error?: string; token?: string }> =>
  getHttpApiClient().login(apiKey);

/**
 * Check if the session cookie is still valid.
 * Delegates to the contract-backed client method.
 */
export const fetchSessionToken = (): Promise<boolean> => getHttpApiClient().fetchSessionToken();

/**
 * Logout (for web mode).
 * Delegates to the contract-backed client method.
 */
export const logout = (): Promise<{ success: boolean }> => getHttpApiClient().logout();

/**
 * Verify that the current session is still valid.
 * Delegates to the contract-backed client method.
 */
export const verifySession = (): Promise<boolean> => getHttpApiClient().verifySession();

/**
 * Check if the server is running in a containerized (sandbox) environment.
 * Delegates to the contract-backed client method.
 */
export const checkSandboxEnvironment = (): Promise<{
  isContainerized: boolean;
  skipSandboxWarning?: boolean;
  error?: string;
}> => getHttpApiClient().checkSandboxEnvironment();

/**
 * Dev server log event payloads for WebSocket streaming
 */

/** Shared base for dev server events that carry URL/port information */
interface DevServerUrlEvent {
  worktreePath: string;
  url: string;
  port: number;
  timestamp: string;
}

export interface DevServerStartingEvent {
  worktreePath: string;
  timestamp: string;
}

export type DevServerStartedEvent = DevServerUrlEvent;

export interface DevServerOutputEvent {
  worktreePath: string;
  content: string;
  timestamp: string;
}

export interface DevServerStoppedEvent {
  worktreePath: string;
  port: number;
  exitCode: number | null;
  error?: string;
  timestamp: string;
}

export type DevServerUrlDetectedEvent = DevServerUrlEvent;

export type DevServerLogEvent =
  | { type: 'dev-server:starting'; payload: DevServerStartingEvent }
  | { type: 'dev-server:started'; payload: DevServerStartedEvent }
  | { type: 'dev-server:output'; payload: DevServerOutputEvent }
  | { type: 'dev-server:stopped'; payload: DevServerStoppedEvent }
  | { type: 'dev-server:url-detected'; payload: DevServerUrlDetectedEvent };

/**
 * Test runner event payloads for WebSocket streaming
 */
export type TestRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'error';

export interface TestRunnerStartedEvent {
  sessionId: string;
  worktreePath: string;
  /** The test command being run (from project settings) */
  command: string;
  testFile?: string;
  timestamp: string;
}

export interface TestRunnerOutputEvent {
  sessionId: string;
  worktreePath: string;
  content: string;
  timestamp: string;
}

export interface TestRunnerCompletedEvent {
  sessionId: string;
  worktreePath: string;
  /** The test command that was run */
  command: string;
  status: TestRunStatus;
  testFile?: string;
  exitCode: number | null;
  duration: number;
  timestamp: string;
}

export type TestRunnerEvent =
  | { type: 'test-runner:started'; payload: TestRunnerStartedEvent }
  | { type: 'test-runner:output'; payload: TestRunnerOutputEvent }
  | { type: 'test-runner:completed'; payload: TestRunnerCompletedEvent };

/**
 * Response type for fetching dev server logs
 */
export interface DevServerLogsResponse {
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

/**
 * Response type for fetching test logs
 */
export interface TestLogsResponse {
  success: boolean;
  result?: {
    sessionId: string;
    worktreePath: string;
    /** The test command that was/is being run */
    command: string;
    status: TestRunStatus;
    testFile?: string;
    logs: string;
    startedAt: string;
    finishedAt: string | null;
    exitCode: number | null;
  };
  error?: string;
}

type EventCallback = (payload: unknown) => void;

interface EnhancePromptResult {
  success: boolean;
  enhancedText?: string;
  error?: string;
}

/**
 * HTTP API Client that implements ElectronAPI interface
 */
export class HttpApiClient implements ElectronAPI {
  private serverUrl: string;
  private ws: WebSocket | null = null;
  private eventCallbacks: Map<EventType, Set<EventCallback>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  /** Consecutive reconnect failure count for exponential backoff */
  private reconnectAttempts = 0;
  /** Visibility change handler reference for cleanup */
  private visibilityHandler: (() => void) | null = null;

  constructor() {
    this.serverUrl = getServerUrl();
    // Electron mode: connect WebSocket immediately once API key is ready.
    // Web mode: defer WebSocket connection until a consumer subscribes to events,
    // to avoid noisy 401s on first-load/login/setup routes.
    if (isElectronMode()) {
      waitForApiKeyInit()
        .then(() => {
          this.connectWebSocket();
        })
        .catch((error) => {
          logger.error('API key initialization failed:', error);
          // Still attempt WebSocket connection - it may work with cookie auth
          this.connectWebSocket();
        });
    }

    // OPTIMIZATION: Reconnect WebSocket immediately when tab becomes visible
    // This eliminates the reconnection delay after tab discard/background
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // If WebSocket is disconnected, reconnect immediately
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          logger.info('Tab became visible - attempting immediate WebSocket reconnect');
          // Clear any pending reconnect timer
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          this.reconnectAttempts = 0; // Reset backoff on visibility change
          // Use silent mode: a 401 during visibility-change reconnect should NOT
          // trigger a full logout cascade. The session is verified separately via
          // verifySession() in __root.tsx's fast-hydrate path.
          this.connectWebSocket({ silent: true });
        }
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  /**
   * Fetch a short-lived WebSocket token from the server.
   * Used for secure WebSocket authentication without exposing session tokens in URLs.
   *
   * @param options.silent - When true, a 401/403 will NOT trigger handleUnauthorized().
   *   Use this for background reconnections (e.g., visibility-change) where a transient
   *   auth failure should not force a full logout cascade. The actual session validity
   *   is verified separately via verifySession() in the fast-hydrate path.
   */
  private async fetchWsToken(options?: { silent?: boolean }): Promise<string | null> {
    try {
      const response = await this.transport(operationPath('auth.token'), 'GET', {
        allowUnauthorized: true,
      });

      if (response.status === 401 || response.status === 403) {
        if (options?.silent) {
          logger.debug('fetchWsToken: 401/403 during silent reconnect — skipping logout');
        } else {
          handleUnauthorized();
        }
        return null;
      }

      if (!response.ok) {
        logger.warn('Failed to fetch wsToken:', response.status);
        return null;
      }

      const data = await response.json();
      if (data.success && data.token) {
        return data.token;
      }

      return null;
    } catch (error) {
      logger.error('Error fetching wsToken:', error);
      return null;
    }
  }

  private connectWebSocket(options?: { silent?: boolean }): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    // Wait for API key initialization to complete before attempting connection
    // This prevents race conditions during app startup
    waitForApiKeyInit()
      .then(() => this.doConnectWebSocketInternal(options))
      .catch((error) => {
        logger.error('Failed to initialize for WebSocket connection:', error);
        this.isConnecting = false;
      });
  }

  private doConnectWebSocketInternal(options?: { silent?: boolean }): void {
    // Electron mode typically authenticates with the injected API key.
    // However, in external-server/cookie-auth flows, the API key may be unavailable.
    // In that case, fall back to the same wsToken/cookie authentication used in web mode
    // so the UI still receives real-time events (running tasks, logs, etc.).
    if (isElectronMode()) {
      const apiKey = getApiKey();
      if (!apiKey) {
        logger.warn('Electron mode: API key missing, attempting wsToken/cookie auth for WebSocket');
        this.fetchWsToken(options)
          .then((wsToken) => {
            const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/api/events';
            if (wsToken) {
              this.establishWebSocket(`${wsUrl}?wsToken=${encodeURIComponent(wsToken)}`);
            } else {
              // Fallback: try connecting without token (will fail if not authenticated)
              logger.warn('No wsToken available, attempting WebSocket connection anyway');
              this.establishWebSocket(wsUrl);
            }
          })
          .catch((error) => {
            logger.error('Failed to prepare WebSocket connection (electron fallback):', error);
            this.isConnecting = false;
          });
        return;
      }

      const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/api/events';
      this.establishWebSocket(`${wsUrl}?apiKey=${encodeURIComponent(apiKey)}`);
      return;
    }

    // In web mode, fetch a short-lived wsToken first
    this.fetchWsToken(options)
      .then((wsToken) => {
        const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/api/events';
        if (wsToken) {
          this.establishWebSocket(`${wsUrl}?wsToken=${encodeURIComponent(wsToken)}`);
        } else {
          // Fallback: try connecting without token (will fail if not authenticated)
          logger.warn('No wsToken available, attempting connection anyway');
          this.establishWebSocket(wsUrl);
        }
      })
      .catch((error) => {
        logger.error('Failed to prepare WebSocket connection:', error);
        this.isConnecting = false;
      });
  }

  /**
   * Establish the actual WebSocket connection
   */
  private establishWebSocket(wsUrl: string): void {
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        logger.info('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0; // Reset backoff on successful connection
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Only log non-high-frequency events to avoid progressive memory growth
          // from accumulated console entries. High-frequency events (dev-server output,
          // test runner output, agent progress) fire 10+ times/sec and would generate
          // thousands of console entries per minute.
          const isHighFrequency =
            data.type === 'dev-server:output' ||
            data.type === 'test-runner:output' ||
            data.type === 'feature:progress' ||
            (data.type === 'auto-mode:event' && data.payload?.type === 'auto_mode_progress');
          if (!isHighFrequency) {
            logger.info('WebSocket message:', data.type);
          }
          const callbacks = this.eventCallbacks.get(data.type);
          if (callbacks) {
            callbacks.forEach((cb) => cb(data.payload));
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        logger.info('WebSocket disconnected');
        this.isConnecting = false;
        this.ws = null;

        // OPTIMIZATION: Exponential backoff instead of fixed 5-second delay
        // First attempt: immediate (0ms), then 500ms → 1s → 2s → 5s max
        if (!this.reconnectTimer) {
          const backoffDelays = [0, 500, 1000, 2000, 5000];
          const delayMs =
            backoffDelays[Math.min(this.reconnectAttempts, backoffDelays.length - 1)] ?? 5000;
          this.reconnectAttempts++;

          if (delayMs === 0) {
            // Immediate reconnect on first attempt
            this.connectWebSocket();
          } else {
            logger.info(
              `WebSocket reconnecting in ${delayMs}ms (attempt ${this.reconnectAttempts})`
            );
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.connectWebSocket();
            }, delayMs);
          }
        }
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      logger.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
    }
  }

  private subscribeToEvent(type: EventType, callback: EventCallback): () => void {
    if (!this.eventCallbacks.has(type)) {
      this.eventCallbacks.set(type, new Set());
    }
    this.eventCallbacks.get(type)!.add(callback);

    // Ensure WebSocket is connected
    this.connectWebSocket();

    return () => {
      const callbacks = this.eventCallbacks.get(type);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Electron mode: use API key
    const apiKey = getApiKey();
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
      return headers;
    }

    // Web mode: use session token if available
    const sessionToken = getSessionToken();
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }

    return headers;
  }

  /**
   * The one low-level transport. Every HTTP request the client makes goes
   * through here (JSON helpers, contract-backed calls and the streaming
   * download); the `fetch` call lives in this method and nowhere else.
   *
   * A 401/403 triggers the global logout cascade unless the caller opts out
   * with `allowUnauthorized` (used by the auth-bootstrap flows).
   */
  private async transport(
    endpoint: string,
    method: string,
    options: TransportOptions = {}
  ): Promise<Response> {
    // Ensure API key is initialized before making request
    await waitForApiKeyInit();
    const response = await fetch(`${this.serverUrl}${endpoint}`, {
      method,
      headers: { ...this.getHeaders(), ...options.headers },
      credentials: 'include', // Include cookies for session auth
      body: options.body ? JSON.stringify(options.body) : undefined,
      ...(method === 'GET' ? { cache: NO_STORE_CACHE_MODE } : {}),
      signal: options.signal,
    });

    if (!options.allowUnauthorized && (response.status === 401 || response.status === 403)) {
      handleUnauthorized();
      throw new Error('Unauthorized');
    }

    return response;
  }

  /** Parse a JSON response, surfacing the server's error message as an ApiError. */
  private async parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorBody: unknown;
      try {
        const errorData = await response.json();
        errorBody = errorData;
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If parsing JSON fails, use status text
      }
      throw new ApiError(errorMessage, response.status, errorBody);
    }

    return response.json();
  }

  private async post<T>(endpoint: string, body?: unknown, options?: TransportOptions): Promise<T> {
    return this.parseJson<T>(await this.transport(endpoint, 'POST', { ...options, body }));
  }

  async get<T>(endpoint: string, options?: TransportOptions): Promise<T> {
    return this.parseJson<T>(await this.transport(endpoint, 'GET', options));
  }

  private async put<T>(endpoint: string, body?: unknown, options?: TransportOptions): Promise<T> {
    return this.parseJson<T>(await this.transport(endpoint, 'PUT', { ...options, body }));
  }

  private async httpDelete<T>(
    endpoint: string,
    body?: unknown,
    options?: TransportOptions
  ): Promise<T> {
    return this.parseJson<T>(await this.transport(endpoint, 'DELETE', { ...options, body }));
  }

  /**
   * The single contract-backed request method.
   *
   * It resolves the path from the contract and types the result by the
   * operation's declared response shape, so a path can never drift from its
   * route and a response-shape change surfaces at its call sites.
   */
  private async request<N extends OperationName>(
    name: N,
    input?: RequestOf<N>,
    options?: TransportOptions
  ): Promise<ResponseOf<N>> {
    const path = operationPath(name);
    const resolvedPath = resolvePathParams(path, input);
    const definition: OperationDefinition<unknown, unknown> = OPERATIONS[name];
    switch (definition.method) {
      case 'GET':
        return this.get<ResponseOf<N>>(
          appendQuery(resolvedPath, queryInputWithoutPathParams(path, input)),
          options
        );
      case 'PUT':
        return this.put<ResponseOf<N>>(resolvedPath, input, options);
      case 'DELETE':
        // Some DELETE operations take query args (e.g. cursor permissions);
        // path params are stripped so they are not repeated.
        return this.httpDelete<ResponseOf<N>>(
          appendQuery(resolvedPath, queryInputWithoutPathParams(path, input)),
          input,
          options
        );
      default:
        return this.post<ResponseOf<N>>(resolvedPath, input, options);
    }
  }

  /**
   * Verify the session by touching a lightweight authenticated operation.
   * Returns false on 401/403 (clearing the token) and throws on other
   * failures so the caller can distinguish "invalid" from "transient".
   */
  async verifySession(): Promise<boolean> {
    const response = await this.transport(operationPath('settings.getStatus'), 'GET', {
      signal: AbortSignal.timeout(2500),
      allowUnauthorized: true,
    });

    if (response.status === 401 || response.status === 403) {
      logger.warn('Session verification failed - session expired or invalid');
      clearSessionToken();
      return false;
    }

    if (!response.ok) {
      logger.warn('Session verification failed with status:', response.status);
      throw new Error(`Session verification failed with status: ${response.status}`);
    }

    logger.info('Session verified successfully');
    return true;
  }

  /** Login with an API key, storing and verifying the returned session token. */
  async login(apiKey: string): Promise<{ success: boolean; error?: string; token?: string }> {
    try {
      const response = await this.transport(operationPath('auth.login'), 'POST', {
        body: { apiKey },
        allowUnauthorized: true,
      });
      const data = await response.json();

      if (data.success && data.token) {
        setSessionToken(data.token);
        logger.info('Session token stored after login');

        const verified = await this.verifySession();
        if (!verified) {
          logger.error('Login appeared successful but session verification failed');
          return { success: false, error: 'Session verification failed. Please try again.' };
        }
        logger.info('Login verified successfully');
      }

      return data;
    } catch (error) {
      logger.error('Login failed:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /** Logout (web mode): clears the cookie and the cached session token. */
  async logout(): Promise<{ success: boolean }> {
    try {
      const response = await this.transport(operationPath('auth.logout'), 'POST', {
        allowUnauthorized: true,
      });
      clearSessionToken();
      logger.info('Session token cleared on logout');
      return await response.json();
    } catch (error) {
      logger.error('Logout failed:', error);
      return { success: false };
    }
  }

  /** Check authentication status with the server. */
  async checkAuthStatus(): Promise<{ authenticated: boolean; required: boolean }> {
    try {
      const data = await this.request('auth.status');
      return {
        authenticated: data.authenticated ?? false,
        required: data.required ?? true,
      };
    } catch (error) {
      logger.error('Failed to check auth status:', error);
      return { authenticated: false, required: true };
    }
  }

  /** Check if the session cookie is still valid. */
  async fetchSessionToken(): Promise<boolean> {
    try {
      const data = await this.request('auth.status');
      if (data.success && data.authenticated) {
        logger.info('Session cookie is valid');
        return true;
      }
      logger.info('Session cookie is not authenticated');
      return false;
    } catch (error) {
      logger.error('Failed to check session:', error);
      return false;
    }
  }

  /** Check if the server is running in a containerized (sandbox) environment. */
  async checkSandboxEnvironment(): Promise<{
    isContainerized: boolean;
    skipSandboxWarning?: boolean;
    error?: string;
  }> {
    try {
      const response = await this.transport(operationPath('health.environment'), 'GET', {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        logger.warn('Failed to check sandbox environment');
        return { isContainerized: false, error: 'Failed to check environment' };
      }

      const data = await response.json();
      return {
        isContainerized: data.isContainerized ?? false,
        skipSandboxWarning: data.skipSandboxWarning ?? false,
      };
    } catch (error) {
      logger.error('Sandbox environment check failed:', error);
      return { isContainerized: false, error: 'Network error' };
    }
  }

  // Health API — derived from the contract.
  health = {
    check: (signal?: AbortSignal) => this.request('health.check', undefined, { signal }),
    environment: () => this.request('health.environment'),
    detailed: () => this.request('health.detailed'),
  };

  // Auth API — derived from the contract.
  auth = {
    status: (options?: { signal?: AbortSignal; allowUnauthorized?: boolean }) =>
      this.request('auth.status', undefined, options),
    login: (apiKey: string) => this.request('auth.login', { apiKey }),
    token: (options?: { allowUnauthorized?: boolean }) =>
      this.request('auth.token', undefined, options),
    logout: () => this.request('auth.logout'),
  };

  // Basic operations
  async ping(): Promise<string> {
    const result = await this.health.check();
    return result.status === 'ok' ? 'pong' : 'error';
  }

  async openExternalLink(url: string): Promise<{ success: boolean; error?: string }> {
    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
    return { success: true };
  }

  async openInEditor(
    filePath: string,
    line?: number,
    column?: number
  ): Promise<{ success: boolean; error?: string }> {
    // Build VS Code URL scheme: vscode://file/path:line:column
    // This works on systems where VS Code's URL handler is registered
    // URL encode the path to handle special characters (spaces, brackets, etc.)
    // Handle both Unix (/) and Windows (\) path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    const encodedPath = normalizedPath.startsWith('/')
      ? '/' + normalizedPath.slice(1).split('/').map(encodeURIComponent).join('/')
      : normalizedPath.split('/').map(encodeURIComponent).join('/');
    let url = `vscode://file${encodedPath}`;
    if (line !== undefined && line > 0) {
      url += `:${line}`;
      if (column !== undefined && column > 0) {
        url += `:${column}`;
      }
    }

    try {
      // Use anchor click approach which is most reliable for custom URL schemes
      // This triggers the browser's URL handler without navigation issues
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open in editor',
      };
    }
  }

  // File picker - uses server-side file browser dialog
  async openDirectory(): Promise<DialogResult> {
    const fileBrowser = getGlobalFileBrowser();

    if (!fileBrowser) {
      logger.error('File browser not initialized');
      return { canceled: true, filePaths: [] };
    }

    const path = await fileBrowser();

    if (!path) {
      return { canceled: true, filePaths: [] };
    }

    // Validate with server
    const result = await this.fs.validatePath(path);

    if (result.success && result.path && result.isAllowed !== false) {
      return { canceled: false, filePaths: [result.path] };
    }

    logger.error('Invalid directory:', result.error || 'Path not allowed');
    return { canceled: true, filePaths: [] };
  }

  async openFile(_options?: object): Promise<DialogResult> {
    const fileBrowser = getGlobalFileBrowser();

    if (!fileBrowser) {
      logger.error('File browser not initialized');
      return { canceled: true, filePaths: [] };
    }

    // For now, use the same directory browser (could be enhanced for file selection)
    const path = await fileBrowser();

    if (!path) {
      return { canceled: true, filePaths: [] };
    }

    if (await this.fs.exists(path)) {
      return { canceled: false, filePaths: [path] };
    }

    logger.error('File not found');
    return { canceled: true, filePaths: [] };
  }

  // File system operations
  async readFile(filePath: string): Promise<FileResult> {
    return this.fs.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<WriteResult> {
    return this.fs.writeFile(filePath, content);
  }

  async mkdir(dirPath: string): Promise<WriteResult> {
    return this.fs.mkdir(dirPath);
  }

  async readdir(dirPath: string): Promise<ReaddirResult> {
    return this.fs.readdir(dirPath);
  }

  async exists(filePath: string): Promise<boolean> {
    return this.fs.exists(filePath);
  }

  async stat(filePath: string): Promise<StatResult> {
    return this.fs.stat(filePath);
  }

  async deleteFile(filePath: string): Promise<WriteResult> {
    return this.fs.deleteFile(filePath);
  }

  async trashItem(filePath: string): Promise<WriteResult> {
    // In web mode, trash is just delete
    return this.deleteFile(filePath);
  }

  async copyItem(
    sourcePath: string,
    destinationPath: string,
    overwrite?: boolean
  ): Promise<WriteResult & { exists?: boolean }> {
    return this.fs.copyItem(sourcePath, destinationPath, overwrite);
  }

  async moveItem(
    sourcePath: string,
    destinationPath: string,
    overwrite?: boolean
  ): Promise<WriteResult & { exists?: boolean }> {
    return this.fs.moveItem(sourcePath, destinationPath, overwrite);
  }

  async downloadItem(filePath: string): Promise<void> {
    return this.fs.downloadItem(filePath);
  }

  async validatePath(filePath: string) {
    return this.fs.validatePath(filePath);
  }

  async resolveDirectory(directoryName: string, sampleFiles?: string[], fileCount?: number) {
    return this.fs.resolveDirectory(directoryName, sampleFiles, fileCount);
  }

  async browse(dirPath?: string) {
    return this.fs.browse(dirPath);
  }

  async browseProjectFiles(projectPath: string, relativePath?: string) {
    return this.fs.browseProjectFiles(projectPath, relativePath);
  }

  getImageUrl(imagePath: string, projectPath?: string, version?: string | number): string {
    return this.fs.getImageUrl(imagePath, projectPath, version);
  }

  async getPath(name: string): Promise<string> {
    // Server provides data directory
    if (name === 'userData') {
      const result = await this.health.detailed();
      return result.dataDir || '/data';
    }
    return `/data/${name}`;
  }

  async saveImageToTemp(
    data: string,
    filename: string,
    mimeType: string,
    projectPath?: string
  ): Promise<SaveImageResult> {
    return this.fs.saveImageToTemp(data, filename, mimeType, projectPath);
  }

  async saveBoardBackground(
    data: string,
    filename: string,
    mimeType: string,
    projectPath: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    return this.fs.saveBoardBackground(data, filename, mimeType, projectPath);
  }

  async deleteBoardBackground(projectPath: string): Promise<{ success: boolean; error?: string }> {
    return this.fs.deleteBoardBackground(projectPath);
  }

  // CLI checks - server-side
  async checkClaudeCli(): Promise<{
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
  }> {
    return this.setup.getClaudeStatus();
  }

  // Model API
  model = {
    getAvailable: async () => {
      return this.request('models.available');
    },
    checkProviders: async () => {
      return this.request('models.providers');
    },
  };

  // Setup API
  setup = {
    getClaudeStatus: (): Promise<{
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
    }> => this.request('setup.getClaudeStatus'),

    installClaude: (): Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }> => this.request('setup.installClaude'),

    authClaude: (): Promise<{
      success: boolean;
      token?: string;
      requiresManualAuth?: boolean;
      terminalOpened?: boolean;
      command?: string;
      error?: string;
      message?: string;
      output?: string;
    }> => this.request('setup.authClaude'),

    deauthClaude: (): Promise<{
      success: boolean;
      requiresManualDeauth?: boolean;
      command?: string;
      message?: string;
      error?: string;
    }> => this.request('setup.deauthClaude'),

    storeApiKey: (
      provider: string,
      apiKey: string
    ): Promise<{
      success: boolean;
      error?: string;
    }> => this.request('setup.storeApiKey', { provider, apiKey }),

    deleteApiKey: (
      provider: string
    ): Promise<{
      success: boolean;
      error?: string;
      message?: string;
    }> => this.request('setup.deleteApiKey', { provider }),

    getApiKeys: (): Promise<{
      success: boolean;
      hasAnthropicKey: boolean;
      hasGoogleKey: boolean;
      hasOpenaiKey: boolean;
    }> => this.request('setup.getApiKeys'),

    getPlatform: (): Promise<{
      success: boolean;
      platform: string;
      arch: string;
      homeDir: string;
      isWindows: boolean;
      isMac: boolean;
      isLinux: boolean;
    }> => this.request('setup.getPlatform'),

    verifyClaudeAuth: (
      authMethod?: 'cli' | 'api_key',
      apiKey?: string
    ): Promise<{
      success: boolean;
      authenticated: boolean;
      authType?: 'oauth' | 'api_key' | 'cli';
      error?: string;
    }> => this.request('setup.verifyClaudeAuth', { authMethod, apiKey }),

    getGhStatus: (): Promise<{
      success: boolean;
      installed: boolean;
      authenticated: boolean;
      version: string | null;
      path: string | null;
      user: string | null;
      error?: string;
    }> => this.request('setup.getGhStatus'),

    // Cursor CLI methods
    getCursorStatus: (): Promise<{
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
    }> => this.request('setup.getCursorStatus'),

    authCursor: (): Promise<{
      success: boolean;
      token?: string;
      requiresManualAuth?: boolean;
      terminalOpened?: boolean;
      command?: string;
      message?: string;
      output?: string;
    }> => this.request('setup.authCursor'),

    deauthCursor: (): Promise<{
      success: boolean;
      requiresManualDeauth?: boolean;
      command?: string;
      message?: string;
      error?: string;
    }> => this.request('setup.deauthCursor'),

    authOpencode: (): Promise<{
      success: boolean;
      token?: string;
      requiresManualAuth?: boolean;
      terminalOpened?: boolean;
      command?: string;
      message?: string;
      output?: string;
    }> => this.request('setup.authOpencode'),

    deauthOpencode: (): Promise<{
      success: boolean;
      requiresManualDeauth?: boolean;
      command?: string;
      message?: string;
      error?: string;
    }> => this.request('setup.deauthOpencode'),

    getCursorConfig: (
      projectPath: string
    ): Promise<{
      success: boolean;
      config?: {
        defaultModel?: string;
        models?: string[];
        mcpServers?: string[];
        rules?: string[];
      };
      availableModels?: Array<{
        id: string;
        label: string;
        description: string;
        hasThinking: boolean;
        tier: 'free' | 'pro';
      }>;
      error?: string;
    }> => this.request('setup.getCursorConfig', { projectPath }),

    setCursorDefaultModel: (
      projectPath: string,
      model: string
    ): Promise<{
      success: boolean;
      model?: string;
      error?: string;
    }> => this.request('setup.setCursorDefaultModel', { projectPath, model }),

    setCursorModels: (
      projectPath: string,
      models: string[]
    ): Promise<{
      success: boolean;
      models?: string[];
      error?: string;
    }> => this.request('setup.setCursorModels', { projectPath, models }),

    // Cursor CLI Permissions
    getCursorPermissions: (
      projectPath?: string
    ): Promise<{
      success: boolean;
      globalPermissions?: { allow: string[]; deny: string[] } | null;
      projectPermissions?: { allow: string[]; deny: string[] } | null;
      effectivePermissions?: { allow: string[]; deny: string[] } | null;
      activeProfile?: 'strict' | 'development' | 'custom' | null;
      hasProjectConfig?: boolean;
      availableProfiles?: Array<{
        id: string;
        name: string;
        description: string;
        permissions: { allow: string[]; deny: string[] };
      }>;
      error?: string;
    }> => this.request('setup.getCursorPermissions', { projectPath }),

    applyCursorPermissionProfile: (
      profileId: 'strict' | 'development',
      scope: 'global' | 'project',
      projectPath?: string
    ): Promise<{
      success: boolean;
      message?: string;
      scope?: string;
      profileId?: string;
      error?: string;
    }> => this.request('setup.applyCursorPermissionProfile', { profileId, scope, projectPath }),

    setCursorCustomPermissions: (
      projectPath: string,
      permissions: { allow: string[]; deny: string[] }
    ): Promise<{
      success: boolean;
      message?: string;
      permissions?: { allow: string[]; deny: string[] };
      error?: string;
    }> => this.request('setup.setCursorCustomPermissions', { projectPath, permissions }),

    deleteCursorProjectPermissions: (
      projectPath: string
    ): Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }> => this.request('setup.deleteCursorProjectPermissions', { projectPath }),

    getCursorExampleConfig: (
      profileId?: 'strict' | 'development'
    ): Promise<{
      success: boolean;
      profileId?: string;
      config?: string;
      error?: string;
    }> => this.request('setup.getCursorExampleConfig', { profileId }),

    // Codex CLI methods
    getCodexStatus: (): Promise<{
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
    }> => this.request('setup.getCodexStatus'),

    installCodex: (): Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }> => this.request('setup.installCodex'),

    authCodex: (): Promise<{
      success: boolean;
      token?: string;
      requiresManualAuth?: boolean;
      terminalOpened?: boolean;
      command?: string;
      error?: string;
      message?: string;
      output?: string;
    }> => this.request('setup.authCodex'),

    deauthCodex: (): Promise<{
      success: boolean;
      requiresManualDeauth?: boolean;
      command?: string;
      message?: string;
      error?: string;
    }> => this.request('setup.deauthCodex'),

    verifyCodexAuth: (
      authMethod: 'cli' | 'api_key',
      apiKey?: string
    ): Promise<{
      success: boolean;
      authenticated: boolean;
      error?: string;
    }> => this.request('setup.verifyCodexAuth', { authMethod, apiKey }),

    // OpenCode CLI methods
    getOpencodeStatus: (): Promise<{
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
    }> => this.request('setup.getOpencodeStatus'),

    // OpenCode Dynamic Model Discovery
    getOpencodeModels: (refresh?: boolean): Promise<ResponseOf<'setup.getOpencodeModels'>> =>
      this.request('setup.getOpencodeModels', { refresh }),

    refreshOpencodeModels: (): Promise<ResponseOf<'setup.refreshOpencodeModels'>> =>
      this.request('setup.refreshOpencodeModels'),

    getOpencodeProviders: (): Promise<{
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
    }> => this.request('setup.getOpencodeProviders'),

    clearOpencodeCache: (): Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }> => this.request('setup.clearOpencodeCache'),

    // Gemini CLI methods
    getGeminiStatus: (): Promise<{
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
    }> => this.request('setup.getGeminiStatus'),

    authGemini: (): Promise<{
      success: boolean;
      requiresManualAuth?: boolean;
      command?: string;
      message?: string;
      error?: string;
    }> => this.request('setup.authGemini'),

    deauthGemini: (): Promise<{
      success: boolean;
      requiresManualDeauth?: boolean;
      command?: string;
      message?: string;
      error?: string;
    }> => this.request('setup.deauthGemini'),

    // Copilot SDK methods
    getCopilotStatus: (): Promise<{
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
    }> => this.request('setup.getCopilotStatus'),

    authCopilot: (): Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }> => this.request('setup.authCopilot'),

    deauthCopilot: (): Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }> => this.request('setup.deauthCopilot'),

    getCopilotModels: (
      refresh?: boolean
    ): Promise<{
      success: boolean;
      models?: ModelDefinition[];
      count?: number;
      cached?: boolean;
      error?: string;
    }> => this.request('setup.getCopilotModels', { refresh }),

    refreshCopilotModels: (): Promise<{
      success: boolean;
      models?: ModelDefinition[];
      count?: number;
      error?: string;
    }> => this.request('setup.refreshCopilotModels'),

    clearCopilotCache: (): Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }> => this.request('setup.clearCopilotCache'),

    onInstallProgress: (
      callback: (progress: { cli?: string; data?: string; type?: string }) => void
    ) => {
      return this.subscribeToEvent('agent:stream', callback as EventCallback);
    },

    onAuthProgress: (
      callback: (progress: { cli?: string; data?: string; type?: string }) => void
    ) => {
      return this.subscribeToEvent('agent:stream', callback as EventCallback);
    },
  };

  // z.ai API — derived from the contract.
  zai = {
    getStatus: (): Promise<{
      success: boolean;
      available: boolean;
      message?: string;
      hasApiKey?: boolean;
      hasEnvApiKey?: boolean;
      error?: string;
    }> => this.request('zai.getStatus'),

    getUsage: (): Promise<ZaiUsageResponse> => this.request('zai.getUsage'),

    configure: (
      apiToken?: string,
      apiHost?: string
    ): Promise<{
      success: boolean;
      message?: string;
      isAvailable?: boolean;
      error?: string;
    }> => this.request('zai.configure', { apiToken, apiHost }),

    verify: (
      apiKey: string
    ): Promise<{
      success: boolean;
      authenticated: boolean;
      message?: string;
      error?: string;
    }> => this.request('zai.verify', { apiKey }),
  };

  // Features API — every method derives its path and response type from the contract.
  features: FeaturesAPI & {
    bulkUpdate: (
      projectPath: string,
      featureIds: string[],
      updates: Partial<Feature>
    ) => Promise<ResponseOf<'features.bulkUpdate'>>;
    bulkDelete: (
      projectPath: string,
      featureIds: string[]
    ) => Promise<ResponseOf<'features.bulkDelete'>>;
    getRawOutput: (
      projectPath: string,
      featureId: string
    ) => Promise<ResponseOf<'features.rawOutput'>>;
    export: (
      projectPath: string,
      options?: Omit<RequestOf<'features.export'>, 'projectPath'>
    ) => Promise<ResponseOf<'features.export'>>;
    import: (
      projectPath: string,
      data: string,
      options?: Omit<RequestOf<'features.import'>, 'projectPath' | 'data'>
    ) => Promise<ResponseOf<'features.import'>>;
    checkConflicts: (
      projectPath: string,
      data: string
    ) => Promise<ResponseOf<'features.checkConflicts'>>;
  } = {
    getAll: (projectPath: string) => this.request('features.list', { projectPath }),
    get: (projectPath: string, featureId: string) =>
      this.request('features.get', { projectPath, featureId }),
    create: (projectPath: string, feature: Feature) =>
      this.request('features.create', { projectPath, feature }),
    update: (
      projectPath: string,
      featureId: string,
      updates: Partial<Feature>,
      descriptionHistorySource?: 'enhance' | 'edit',
      enhancementMode?: 'improve' | 'technical' | 'simplify' | 'acceptance' | 'ux-reviewer',
      preEnhancementDescription?: string
    ) =>
      this.request('features.update', {
        projectPath,
        featureId,
        updates,
        descriptionHistorySource,
        enhancementMode,
        preEnhancementDescription,
      }),
    delete: (projectPath: string, featureId: string) =>
      this.request('features.delete', { projectPath, featureId }),
    getAgentOutput: (projectPath: string, featureId: string) =>
      this.request('features.getAgentOutput', { projectPath, featureId }),
    getRawOutput: (projectPath: string, featureId: string) =>
      this.request('features.rawOutput', { projectPath, featureId }),
    generateTitle: (description: string, projectPath?: string) =>
      this.request('features.generateTitle', { description, projectPath }),
    bulkUpdate: (projectPath: string, featureIds: string[], updates: Partial<Feature>) =>
      this.request('features.bulkUpdate', { projectPath, featureIds, updates }),
    bulkDelete: (projectPath: string, featureIds: string[]) =>
      this.request('features.bulkDelete', { projectPath, featureIds }),
    export: (
      projectPath: string,
      options?: Omit<RequestOf<'features.export'>, 'projectPath'>
    ): Promise<ResponseOf<'features.export'>> =>
      this.request('features.export', { projectPath, ...options }),
    import: (
      projectPath: string,
      data: string,
      options?: Omit<RequestOf<'features.import'>, 'projectPath' | 'data'>
    ): Promise<ResponseOf<'features.import'>> =>
      this.request('features.import', { projectPath, data, ...options }),
    checkConflicts: (projectPath: string, data: string) =>
      this.request('features.checkConflicts', { projectPath, data }),
    getOrphaned: (projectPath: string) => this.request('features.getOrphaned', { projectPath }),
    resolveOrphaned: (
      projectPath: string,
      featureId: string,
      action: 'delete' | 'create-worktree' | 'move-to-branch',
      targetBranch?: string | null
    ) => this.request('features.resolveOrphaned', { projectPath, featureId, action, targetBranch }),
    bulkResolveOrphaned: (
      projectPath: string,
      featureIds: string[],
      action: 'delete' | 'create-worktree' | 'move-to-branch',
      targetBranch?: string | null
    ) =>
      this.request('features.bulkResolveOrphaned', {
        projectPath,
        featureIds,
        action,
        targetBranch,
      }),
  };

  // Auto Mode API
  autoMode: AutoModeAPI = {
    start: (projectPath: string, branchName?: string | null, maxConcurrency?: number) =>
      this.request('autoMode.start', { projectPath, branchName, maxConcurrency }),
    stop: (projectPath: string, branchName?: string | null) =>
      this.request('autoMode.stop', { projectPath, branchName }),
    stopFeature: (featureId: string) => this.request('autoMode.stopFeature', { featureId }),
    status: (projectPath?: string, branchName?: string | null) =>
      this.request('autoMode.status', { projectPath, branchName }),
    runFeature: (
      projectPath: string,
      featureId: string,
      useWorktrees?: boolean,
      worktreePath?: string
    ) =>
      this.request('autoMode.runFeature', {
        projectPath,
        featureId,
        useWorktrees,
        worktreePath,
      }),
    verifyFeature: (projectPath: string, featureId: string) =>
      this.request('autoMode.verifyFeature', { projectPath, featureId }),
    resumeFeature: (projectPath: string, featureId: string, useWorktrees?: boolean) =>
      this.request('autoMode.resumeFeature', {
        projectPath,
        featureId,
        useWorktrees,
      }),
    contextExists: (projectPath: string, featureId: string) =>
      this.request('autoMode.contextExists', { projectPath, featureId }),
    analyzeProject: (projectPath: string) =>
      this.request('autoMode.analyzeProject', { projectPath }),
    followUpFeature: (
      projectPath: string,
      featureId: string,
      prompt: string,
      imagePaths?: string[],
      useWorktrees?: boolean
    ) =>
      this.request('autoMode.followUpFeature', {
        projectPath,
        featureId,
        prompt,
        imagePaths,
        useWorktrees,
      }),
    commitFeature: (projectPath: string, featureId: string, worktreePath?: string) =>
      this.request('autoMode.commitFeature', {
        projectPath,
        featureId,
        worktreePath,
      }),
    approvePlan: (
      projectPath: string,
      featureId: string,
      approved: boolean,
      editedPlan?: string,
      feedback?: string
    ) =>
      this.request('autoMode.approvePlan', {
        projectPath,
        featureId,
        approved,
        editedPlan,
        feedback,
      }),
    resumeInterrupted: (projectPath: string) =>
      this.request('autoMode.resumeInterrupted', { projectPath }),
    reconcile: (projectPath: string) => this.request('autoMode.reconcile', { projectPath }),
    onEvent: (callback: (event: AutoModeEvent) => void) => {
      return this.subscribeToEvent('auto-mode:event', callback as EventCallback);
    },
  };

  // Enhance Prompt API — derived from the contract.
  enhancePrompt = {
    enhance: (
      originalText: string,
      enhancementMode: string,
      model?: string,
      thinkingLevel?: string,
      projectPath?: string
    ): Promise<EnhancePromptResult> =>
      this.request('enhancePrompt.enhance', {
        originalText,
        enhancementMode,
        model,
        thinkingLevel,
        projectPath,
      }),
  };

  // Worktree API
  worktree: WorktreeAPI = {
    mergeFeature: (
      projectPath: string,
      branchName: string,
      worktreePath: string,
      targetBranch?: string,
      options?: object
    ) =>
      this.request('worktree.merge', {
        projectPath,
        branchName,
        worktreePath,
        targetBranch,
        options,
      }),
    getInfo: (projectPath: string, featureId: string) =>
      this.request('worktree.info', { projectPath, featureId }),
    getStatus: (projectPath: string, featureId: string) =>
      this.request('worktree.status', { projectPath, featureId }),
    list: (projectPath: string) => this.request('worktree.list', { projectPath }),
    listAll: (projectPath: string, includeDetails?: boolean, forceRefreshGitHub?: boolean) =>
      this.request('worktree.list', { projectPath, includeDetails, forceRefreshGitHub }),
    create: (projectPath: string, branchName: string, baseBranch?: string) =>
      this.request('worktree.create', {
        projectPath,
        branchName,
        baseBranch,
      }),
    delete: (projectPath: string, worktreePath: string, deleteBranch?: boolean) =>
      this.request('worktree.delete', {
        projectPath,
        worktreePath,
        deleteBranch,
      }),
    commit: (worktreePath: string, message: string, files?: string[]) =>
      this.request('worktree.commit', { worktreePath, message, files }),
    generateCommitMessage: (
      worktreePath: string,
      model?: string,
      thinkingLevel?: string,
      providerId?: string
    ) =>
      this.request('worktree.generateCommitMessage', {
        worktreePath,
        model,
        thinkingLevel,
        providerId,
      }),
    generatePRDescription: (
      worktreePath: string,
      baseBranch?: string,
      model?: string,
      thinkingLevel?: string,
      providerId?: string
    ) =>
      this.request('worktree.generatePRDescription', {
        worktreePath,
        baseBranch,
        model,
        thinkingLevel,
        providerId,
      }),
    push: (worktreePath: string, force?: boolean, remote?: string, autoResolve?: boolean) =>
      this.request('worktree.push', { worktreePath, force, remote, autoResolve }),
    sync: (worktreePath: string, remote?: string) =>
      this.request('worktree.sync', { worktreePath, remote }),
    setTracking: (worktreePath: string, remote: string, branch?: string) =>
      this.request('worktree.setTracking', { worktreePath, remote, branch }),
    createPR: (worktreePath: string, options?: CreatePROptions) =>
      this.request('worktree.createPR', { worktreePath, ...options }),
    updatePRNumber: (worktreePath: string, prNumber: number, projectPath?: string) =>
      this.request('worktree.updatePRNumber', { worktreePath, prNumber, projectPath }),
    getDiffs: (projectPath: string, featureId: string) =>
      this.request('worktree.diffs', { projectPath, featureId }),
    getFileDiff: (projectPath: string, featureId: string, filePath: string) =>
      this.request('worktree.fileDiff', {
        projectPath,
        featureId,
        filePath,
      }),
    stageFiles: (worktreePath: string, files: string[], operation: 'stage' | 'unstage') =>
      this.request('worktree.stageFiles', { worktreePath, files, operation }),
    pull: (worktreePath: string, remote?: string, stashIfNeeded?: boolean, remoteBranch?: string) =>
      this.request('worktree.pull', { worktreePath, remote, remoteBranch, stashIfNeeded }),
    checkoutBranch: (
      worktreePath: string,
      branchName: string,
      baseBranch?: string,
      stashChanges?: boolean,
      includeUntracked?: boolean
    ) =>
      this.request('worktree.checkoutBranch', {
        worktreePath,
        branchName,
        baseBranch,
        stashChanges,
        includeUntracked,
      }),
    checkChanges: (worktreePath: string) => this.request('worktree.checkChanges', { worktreePath }),
    listBranches: (worktreePath: string, includeRemote?: boolean, signal?: AbortSignal) =>
      this.request('worktree.listBranches', { worktreePath, includeRemote }, { signal }),
    switchBranch: (worktreePath: string, branchName: string) =>
      this.request('worktree.switchBranch', { worktreePath, branchName }),
    listRemotes: (worktreePath: string) => this.request('worktree.listRemotes', { worktreePath }),
    addRemote: (worktreePath: string, remoteName: string, remoteUrl: string) =>
      this.request('worktree.addRemote', { worktreePath, remoteName, remoteUrl }),
    openInEditor: (worktreePath: string, editorCommand?: string) =>
      this.request('worktree.openInEditor', { worktreePath, editorCommand }),
    openInTerminal: (worktreePath: string) =>
      this.request('worktree.openInTerminal', { worktreePath }),
    getDefaultEditor: () => this.request('worktree.getDefaultEditor'),
    getAvailableEditors: () => this.request('worktree.getAvailableEditors'),
    refreshEditors: () => this.request('worktree.refreshEditors', {}),
    getAvailableTerminals: () => this.request('worktree.getAvailableTerminals'),
    getDefaultTerminal: () => this.request('worktree.getDefaultTerminal'),
    refreshTerminals: () => this.request('worktree.refreshTerminals', {}),
    openInExternalTerminal: (worktreePath: string, terminalId?: string) =>
      this.request('worktree.openInExternalTerminal', { worktreePath, terminalId }),
    initGit: (projectPath: string) => this.request('worktree.initGit', { projectPath }),
    migrate: (projectPath: string) => this.request('worktree.migrate', { projectPath }),
    startDevServer: (projectPath: string, worktreePath: string) =>
      this.request('worktree.startDev', { projectPath, worktreePath }),
    stopDevServer: (worktreePath: string) => this.request('worktree.stopDev', { worktreePath }),
    listDevServers: () => this.request('worktree.listDevServers', {}),
    getDevServerLogs: (worktreePath: string): Promise<DevServerLogsResponse> =>
      this.request('worktree.getDevServerLogs', { worktreePath }),
    onDevServerLogEvent: (callback: (event: DevServerLogEvent) => void) => {
      const unsub0 = this.subscribeToEvent('dev-server:starting', (payload) =>
        callback({ type: 'dev-server:starting', payload: payload as DevServerStartingEvent })
      );
      const unsub1 = this.subscribeToEvent('dev-server:started', (payload) =>
        callback({ type: 'dev-server:started', payload: payload as DevServerStartedEvent })
      );
      const unsub2 = this.subscribeToEvent('dev-server:output', (payload) =>
        callback({ type: 'dev-server:output', payload: payload as DevServerOutputEvent })
      );
      const unsub3 = this.subscribeToEvent('dev-server:stopped', (payload) =>
        callback({ type: 'dev-server:stopped', payload: payload as DevServerStoppedEvent })
      );
      const unsub4 = this.subscribeToEvent('dev-server:url-detected', (payload) =>
        callback({ type: 'dev-server:url-detected', payload: payload as DevServerUrlDetectedEvent })
      );
      return () => {
        unsub0();
        unsub1();
        unsub2();
        unsub3();
        unsub4();
      };
    },
    getPRInfo: (worktreePath: string, branchName: string) =>
      this.request('worktree.getPRInfo', { worktreePath, branchName }),
    // Init script methods
    getInitScript: (projectPath: string) => this.request('worktree.getInitScript', { projectPath }),
    setInitScript: (projectPath: string, content: string) =>
      this.request('worktree.setInitScript', { projectPath, content }),
    deleteInitScript: (projectPath: string) =>
      this.request('worktree.deleteInitScript', { projectPath }),
    runInitScript: (projectPath: string, worktreePath: string, branch: string) =>
      this.request('worktree.runInitScript', { projectPath, worktreePath, branch }),
    discardChanges: (worktreePath: string, files?: string[]) =>
      this.request('worktree.discardChanges', { worktreePath, files }),
    onInitScriptEvent: (
      callback: (event: {
        type: 'worktree:init-started' | 'worktree:init-output' | 'worktree:init-completed';
        payload: unknown;
      }) => void
    ) => {
      // Note: subscribeToEvent callback receives (payload) not (_, payload)
      const unsub1 = this.subscribeToEvent('worktree:init-started', (payload) =>
        callback({ type: 'worktree:init-started', payload })
      );
      const unsub2 = this.subscribeToEvent('worktree:init-output', (payload) =>
        callback({ type: 'worktree:init-output', payload })
      );
      const unsub3 = this.subscribeToEvent('worktree:init-completed', (payload) =>
        callback({ type: 'worktree:init-completed', payload })
      );
      return () => {
        unsub1();
        unsub2();
        unsub3();
      };
    },
    // Test runner methods
    startTests: (worktreePath: string, options?: { projectPath?: string; testFile?: string }) =>
      this.request('worktree.startTests', { worktreePath, ...options }),
    stopTests: (sessionId: string) => this.request('worktree.stopTests', { sessionId }),
    getCommitLog: (worktreePath: string, limit?: number) =>
      this.request('worktree.getCommitLog', { worktreePath, limit }),
    stashPush: (worktreePath: string, message?: string, files?: string[]) =>
      this.request('worktree.stashPush', { worktreePath, message, files }),
    stashList: (worktreePath: string) => this.request('worktree.stashList', { worktreePath }),
    stashApply: (worktreePath: string, stashIndex: number, pop?: boolean) =>
      this.request('worktree.stashApply', { worktreePath, stashIndex, pop }),
    stashDrop: (worktreePath: string, stashIndex: number) =>
      this.request('worktree.stashDrop', { worktreePath, stashIndex }),
    cherryPick: (worktreePath: string, commitHashes: string[], options?: { noCommit?: boolean }) =>
      this.request('worktree.cherryPick', { worktreePath, commitHashes, options }),
    rebase: (worktreePath: string, ontoBranch: string, remote?: string) =>
      this.request('worktree.rebase', { worktreePath, ontoBranch, remote }),
    abortOperation: (worktreePath: string) =>
      this.request('worktree.abortOperation', { worktreePath }),
    continueOperation: (worktreePath: string) =>
      this.request('worktree.continueOperation', { worktreePath }),
    getBranchCommitLog: (worktreePath: string, branchName?: string, limit?: number) =>
      this.request('worktree.getBranchCommitLog', { worktreePath, branchName, limit }),
    getTestLogs: (worktreePath?: string, sessionId?: string): Promise<TestLogsResponse> =>
      this.request('worktree.getTestLogs', { worktreePath, sessionId }),
    onTestRunnerEvent: (callback: (event: TestRunnerEvent) => void) => {
      const unsub1 = this.subscribeToEvent('test-runner:started', (payload) =>
        callback({ type: 'test-runner:started', payload: payload as TestRunnerStartedEvent })
      );
      const unsub2 = this.subscribeToEvent('test-runner:output', (payload) =>
        callback({ type: 'test-runner:output', payload: payload as TestRunnerOutputEvent })
      );
      const unsub3 = this.subscribeToEvent('test-runner:completed', (payload) =>
        callback({ type: 'test-runner:completed', payload: payload as TestRunnerCompletedEvent })
      );
      return () => {
        unsub1();
        unsub2();
        unsub3();
      };
    },
  };

  // Git API
  git: GitAPI = {
    getDiffs: (projectPath: string) => this.request('git.diffs', { projectPath }),
    getFileDiff: (projectPath: string, filePath: string) =>
      this.request('git.fileDiff', { projectPath, filePath }),
    stageFiles: (projectPath: string, files: string[], operation: 'stage' | 'unstage') =>
      this.request('git.stageFiles', { projectPath, files, operation }),
    getDetails: (projectPath: string, filePath?: string) =>
      this.request('git.details', { projectPath, filePath }),
    getEnhancedStatus: (projectPath: string) => this.request('git.enhancedStatus', { projectPath }),
  };

  // Spec Regeneration API
  specRegeneration: SpecRegenerationAPI = {
    create: (
      projectPath: string,
      projectOverview: string,
      generateFeatures?: boolean,
      analyzeProject?: boolean,
      maxFeatures?: number
    ) =>
      this.request('specRegeneration.create', {
        projectPath,
        projectOverview,
        generateFeatures,
        analyzeProject,
        maxFeatures,
      }),
    generate: (
      projectPath: string,
      projectDefinition: string,
      generateFeatures?: boolean,
      analyzeProject?: boolean,
      maxFeatures?: number
    ) =>
      this.request('specRegeneration.generate', {
        projectPath,
        projectDefinition,
        generateFeatures,
        analyzeProject,
        maxFeatures,
      }),
    generateFeatures: (projectPath: string, maxFeatures?: number) =>
      this.request('specRegeneration.generateFeatures', {
        projectPath,
        maxFeatures,
      }),
    sync: (projectPath: string) => this.request('specRegeneration.sync', { projectPath }),
    stop: (projectPath?: string) => this.request('specRegeneration.stop', { projectPath }),
    status: (projectPath?: string) => this.request('specRegeneration.status', { projectPath }),
    onEvent: (callback: (event: SpecRegenerationEvent) => void) => {
      return this.subscribeToEvent('spec-regeneration:event', callback as EventCallback);
    },
  };

  // Running Agents API
  runningAgents = {
    getAll: () => this.request('runningAgents.getAll'),
  };

  // GitHub API
  github: GitHubAPI = {
    checkRemote: (projectPath: string) => this.request('github.checkRemote', { projectPath }),
    listIssues: (projectPath: string) => this.request('github.listIssues', { projectPath }),
    listPRs: (projectPath: string) => this.request('github.listPRs', { projectPath }),
    validateIssue: (
      projectPath: string,
      issue: IssueValidationInput,
      model?: ModelId,
      thinkingLevel?: ThinkingLevel,
      reasoningEffort?: ReasoningEffort,
      providerId?: string
    ) =>
      this.request('github.validateIssue', {
        projectPath,
        ...issue,
        model,
        thinkingLevel,
        reasoningEffort,
        providerId,
      }),
    getValidationStatus: (projectPath: string, issueNumber?: number) =>
      this.request('github.getValidationStatus', { projectPath, issueNumber }),
    stopValidation: (projectPath: string, issueNumber: number) =>
      this.request('github.stopValidation', { projectPath, issueNumber }),
    getValidations: (projectPath: string, issueNumber?: number) =>
      this.request('github.getValidations', { projectPath, issueNumber }),
    deleteValidation: (projectPath: string, issueNumber: number) =>
      this.request('github.deleteValidation', { projectPath, issueNumber }),
    markValidationViewed: (projectPath: string, issueNumber: number) =>
      this.request('github.markValidationViewed', { projectPath, issueNumber }),
    onValidationEvent: (callback: (event: IssueValidationEvent) => void) =>
      this.subscribeToEvent('issue-validation:event', callback as EventCallback),
    getIssueComments: (projectPath: string, issueNumber: number, cursor?: string) =>
      this.request('github.getIssueComments', { projectPath, issueNumber, cursor }),
    getPRReviewComments: (projectPath: string, prNumber: number) =>
      this.request('github.getPRReviewComments', { projectPath, prNumber }),
    resolveReviewThread: (projectPath: string, threadId: string, resolve: boolean) =>
      this.request('github.resolveReviewThread', { projectPath, threadId, resolve }),
  };

  // Filesystem API - contract-backed file operations
  fs = {
    readFile: (filePath: string): Promise<FileResult> => this.request('fs.read', { filePath }),

    writeFile: (filePath: string, content: string): Promise<WriteResult> =>
      this.request('fs.write', { filePath, content }),

    mkdir: (dirPath: string): Promise<WriteResult> => this.request('fs.mkdir', { dirPath }),

    readdir: (dirPath: string): Promise<ReaddirResult> => this.request('fs.readdir', { dirPath }),

    exists: async (filePath: string): Promise<boolean> => {
      const result = await this.request('fs.exists', { filePath });
      return result.exists;
    },

    stat: (filePath: string): Promise<StatResult> => this.request('fs.stat', { filePath }),

    deleteFile: (filePath: string): Promise<WriteResult> => this.request('fs.delete', { filePath }),

    validatePath: (filePath: string) => this.request('fs.validatePath', { filePath }),

    resolveDirectory: (directoryName: string, sampleFiles?: string[], fileCount?: number) =>
      this.request('fs.resolveDirectory', { directoryName, sampleFiles, fileCount }),

    saveImageToTemp: (
      data: string,
      filename: string,
      mimeType: string,
      projectPath?: string
    ): Promise<SaveImageResult> =>
      this.request('fs.saveImage', { data, filename, mimeType, projectPath }),

    browse: (dirPath?: string) => this.request('fs.browse', { dirPath }),

    // The image endpoint streams binary, so the client exposes its URL rather
    // than going through request() (which parses JSON).
    getImageUrl: (imagePath: string, projectPath?: string, version?: string | number): string => {
      const params = new URLSearchParams({ path: imagePath });
      if (projectPath) params.set('projectPath', projectPath);
      if (version !== undefined) params.set('v', String(version));
      const apiKey = getApiKey();
      if (apiKey) params.set('apiKey', apiKey);
      const sessionToken = getSessionToken();
      if (sessionToken) params.set('token', sessionToken);
      return `${getServerUrl()}${operationPath('fs.image')}?${params.toString()}`;
    },

    saveBoardBackground: (
      data: string,
      filename: string,
      mimeType: string,
      projectPath: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      this.request('fs.saveBoardBackground', { data, filename, mimeType, projectPath }),

    deleteBoardBackground: (projectPath: string): Promise<{ success: boolean; error?: string }> =>
      this.request('fs.deleteBoardBackground', { projectPath }),

    browseProjectFiles: (projectPath: string, relativePath?: string) =>
      this.request('fs.browseProjectFiles', { projectPath, relativePath }),

    copyItem: (
      sourcePath: string,
      destinationPath: string,
      overwrite?: boolean
    ): Promise<WriteResult & { exists?: boolean }> =>
      this.request('fs.copy', { sourcePath, destinationPath, overwrite }),

    moveItem: (
      sourcePath: string,
      destinationPath: string,
      overwrite?: boolean
    ): Promise<WriteResult & { exists?: boolean }> =>
      this.request('fs.move', { sourcePath, destinationPath, overwrite }),

    // The download endpoint streams a file, so it uses the shared transport
    // directly (its response is a blob, not JSON).
    downloadItem: async (filePath: string): Promise<void> => {
      const response = await this.transport(operationPath('fs.download'), 'POST', {
        body: { filePath },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(error.error || `Download failed with status ${response.status}`);
      }

      // Create download from response blob
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch ? fileNameMatch[1] : filePath.split('/').pop() || 'download';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };

  // Terminal API - contract-backed terminal session management
  terminal = {
    status: () => this.request('terminal.status'),

    auth: (password?: string) => this.request('terminal.auth', { password }),

    logout: (token?: string) => this.request('terminal.logout', { token }),

    listSessions: (token?: string) =>
      this.request('terminal.sessions', undefined, { headers: terminalTokenHeaders(token) }),

    createSession: (
      options?: { cwd?: string; cols?: number; rows?: number; shell?: string },
      token?: string
    ) =>
      this.request('terminal.createSession', options, {
        headers: terminalTokenHeaders(token),
      }),

    deleteSession: (id: string, token?: string) =>
      this.request('terminal.deleteSession', { id }, { headers: terminalTokenHeaders(token) }),

    resizeSession: (id: string, cols: number, rows: number, token?: string) =>
      this.request(
        'terminal.resizeSession',
        { id, cols, rows },
        { headers: terminalTokenHeaders(token) }
      ),

    getSettings: (token?: string) =>
      this.request('terminal.getSettings', undefined, { headers: terminalTokenHeaders(token) }),

    updateSettings: (maxSessions?: number, token?: string) =>
      this.request(
        'terminal.updateSettings',
        { maxSessions },
        { headers: terminalTokenHeaders(token) }
      ),
  };

  // Workspace API
  workspace = {
    getConfig: (): Promise<{
      success: boolean;
      configured: boolean;
      workspaceDir?: string;
      defaultDir?: string | null;
      error?: string;
    }> => this.request('workspace.config'),

    getDirectories: (): Promise<{
      success: boolean;
      directories?: Array<{ name: string; path: string }>;
      error?: string;
    }> => this.request('workspace.directories'),
  };

  // Agent API — derived from the contract.
  agent = {
    start: (
      sessionId: string,
      workingDirectory?: string
    ): Promise<{
      success: boolean;
      messages?: Message[];
      error?: string;
    }> => this.request('agent.start', { sessionId, workingDirectory }),

    send: (
      sessionId: string,
      message: string,
      workingDirectory?: string,
      imagePaths?: string[],
      model?: string,
      thinkingLevel?: string
    ): Promise<{ success: boolean; error?: string }> =>
      this.request('agent.send', {
        sessionId,
        message,
        workingDirectory,
        imagePaths,
        model,
        thinkingLevel,
      }),

    getHistory: (
      sessionId: string
    ): Promise<{
      success: boolean;
      messages?: Message[];
      isRunning?: boolean;
      error?: string;
    }> => this.request('agent.getHistory', { sessionId }),

    stop: (sessionId: string): Promise<{ success: boolean; error?: string }> =>
      this.request('agent.stop', { sessionId }),

    clear: (sessionId: string): Promise<{ success: boolean; error?: string }> =>
      this.request('agent.clear', { sessionId }),

    setModel: (sessionId: string, model: string): Promise<{ success: boolean; error?: string }> =>
      this.request('agent.model', { sessionId, model }),

    onStream: (callback: (data: unknown) => void): (() => void) => {
      return this.subscribeToEvent('agent:stream', callback as EventCallback);
    },

    // Queue management
    queueAdd: (
      sessionId: string,
      message: string,
      imagePaths?: string[],
      model?: string,
      thinkingLevel?: string
    ): Promise<{
      success: boolean;
      queuedPrompt?: {
        id: string;
        message: string;
        imagePaths?: string[];
        model?: string;
        thinkingLevel?: string;
        addedAt: string;
      };
      error?: string;
    }> =>
      this.request('agent.queueAdd', {
        sessionId,
        message,
        imagePaths,
        model,
        thinkingLevel,
      }),

    queueList: (
      sessionId: string
    ): Promise<{
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
    }> => this.request('agent.queueList', { sessionId }),

    queueRemove: (
      sessionId: string,
      promptId: string
    ): Promise<{ success: boolean; error?: string }> =>
      this.request('agent.queueRemove', { sessionId, promptId }),

    queueClear: (sessionId: string): Promise<{ success: boolean; error?: string }> =>
      this.request('agent.queueClear', { sessionId }),
  };

  // Templates API
  templates = {
    clone: (repoUrl: string, projectName: string, parentDir: string) =>
      this.request('templates.clone', { repoUrl, projectName, parentDir }),
  };

  // Settings API - persistent file-based settings
  settings = {
    // Get settings status (check if migration needed)
    getStatus: () => this.request('settings.getStatus'),

    // Global settings
    getGlobal: () => this.request('settings.getGlobal'),

    updateGlobal: (updates: Record<string, unknown>) =>
      this.request('settings.updateGlobal', updates),

    // Credentials (masked for security)
    getCredentials: () => this.request('settings.getCredentials'),

    updateCredentials: (updates: {
      apiKeys?: { anthropic?: string; google?: string; openai?: string };
    }) => this.request('settings.updateCredentials', updates),

    // Project settings
    getProject: (projectPath: string) => this.request('settings.getProject', { projectPath }),

    updateProject: (projectPath: string, updates: Record<string, unknown>) =>
      this.request('settings.updateProject', { projectPath, updates }),

    // Migration from localStorage
    migrate: (data: {
      'automaker-storage'?: string;
      'automaker-setup'?: string;
      'worktree-panel-collapsed'?: string;
      'file-browser-recent-folders'?: string;
      'automaker:lastProjectDir'?: string;
    }) => this.request('settings.migrate', { data }),

    // Filesystem agents discovery (read-only)
    discoverAgents: (projectPath?: string, sources?: Array<'user' | 'project'>) =>
      this.request('settings.discoverAgents', { projectPath, sources }),
  };

  // Projects API — derived from the contract.
  projects = {
    getOverview: () => this.request('projects.getOverview'),
  };

  // Sessions API — derived from the contract.
  sessions = {
    list: (
      includeArchived?: boolean
    ): Promise<{
      success: boolean;
      sessions?: SessionListItem[];
      error?: string;
    }> => this.request('sessions.list', { includeArchived }),

    create: (
      name: string,
      projectPath: string,
      workingDirectory?: string
    ): Promise<{
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
    }> => this.request('sessions.create', { name, projectPath, workingDirectory }),

    update: (
      sessionId: string,
      name?: string,
      tags?: string[]
    ): Promise<{ success: boolean; error?: string }> =>
      this.request('sessions.update', { sessionId, name, tags }),

    archive: (sessionId: string): Promise<{ success: boolean; error?: string }> =>
      this.request('sessions.archive', { sessionId }),

    unarchive: (sessionId: string): Promise<{ success: boolean; error?: string }> =>
      this.request('sessions.unarchive', { sessionId }),

    delete: (sessionId: string): Promise<{ success: boolean; error?: string }> =>
      this.request('sessions.delete', { sessionId }),
  };

  // Claude API — derived from the contract.
  claude = {
    getUsage: (): Promise<ClaudeUsageResponse> => this.request('claude.getUsage'),
  };

  // Codex API — derived from the contract.
  codex = {
    getUsage: (): Promise<CodexUsageResponse> => this.request('codex.getUsage'),
    getModels: (
      refresh = false
    ): Promise<{
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
    }> => this.request('codex.getModels', { refresh }),
  };

  // Gemini API — derived from the contract.
  gemini = {
    getUsage: (): Promise<GeminiUsage> => this.request('gemini.getUsage'),
    getStatus: (): Promise<{
      success: boolean;
      installed?: boolean;
      version?: string | null;
      path?: string | null;
      authenticated?: boolean;
      authMethod?: string;
      hasCredentialsFile?: boolean;
      error?: string;
    }> => this.request('gemini.getStatus'),
  };

  // Context API
  context = {
    describeImage: (imagePath: string) => this.request('context.describeImage', { imagePath }),

    describeFile: (filePath: string) => this.request('context.describeFile', { filePath }),
  };

  // Backlog Plan API
  backlogPlan = {
    generate: (projectPath: string, prompt: string, model?: string, branchName?: string) =>
      this.request('backlogPlan.generate', { projectPath, prompt, model, branchName }),

    stop: () => this.request('backlogPlan.stop', {}),

    status: (projectPath: string) => this.request('backlogPlan.status', { projectPath }),

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
    ) => this.request('backlogPlan.apply', { projectPath, plan, branchName }),

    clear: (projectPath: string) => this.request('backlogPlan.clear', { projectPath }),

    onEvent: (callback: (data: unknown) => void): (() => void) => {
      return this.subscribeToEvent('backlog-plan:event', callback as EventCallback);
    },
  };

  // Ideation API - brainstorming and idea management
  ideation: IdeationAPI = {
    startSession: (projectPath: string, options?: StartSessionOptions) =>
      this.request('ideation.sessionStart', { projectPath, options }),

    getSession: (projectPath: string, sessionId: string) =>
      this.request('ideation.sessionGet', { projectPath, sessionId }),

    sendMessage: (
      sessionId: string,
      message: string,
      options?: { imagePaths?: string[]; model?: string }
    ) => this.request('ideation.sessionMessage', { sessionId, message, options }),

    stopSession: (sessionId: string) => this.request('ideation.sessionStop', { sessionId }),

    listIdeas: (projectPath: string) => this.request('ideation.ideasList', { projectPath }),

    createIdea: (projectPath: string, idea: CreateIdeaInput) =>
      this.request('ideation.ideasCreate', { projectPath, idea }),

    getIdea: (projectPath: string, ideaId: string) =>
      this.request('ideation.ideasGet', { projectPath, ideaId }),

    updateIdea: (projectPath: string, ideaId: string, updates: UpdateIdeaInput) =>
      this.request('ideation.ideasUpdate', { projectPath, ideaId, updates }),

    deleteIdea: (projectPath: string, ideaId: string) =>
      this.request('ideation.ideasDelete', { projectPath, ideaId }),

    analyzeProject: (projectPath: string) => this.request('ideation.analyze', { projectPath }),

    getAnalysis: (projectPath: string) => this.request('ideation.analysis', { projectPath }),

    generateSuggestions: (
      projectPath: string,
      promptId: string,
      category: IdeaCategory,
      count?: number,
      contextSources?: IdeationContextSources
    ) =>
      this.request('ideation.suggestionsGenerate', {
        projectPath,
        promptId,
        category,
        count,
        contextSources,
      }),

    convertToFeature: (projectPath: string, ideaId: string, options?: ConvertToFeatureOptions) =>
      this.request('ideation.convert', { projectPath, ideaId, ...options }),

    addSuggestionToBoard: (projectPath: string, suggestion: AnalysisSuggestion) =>
      this.request('ideation.addSuggestion', { projectPath, suggestion }),

    getPrompts: () => this.request('ideation.prompts'),

    getPromptsByCategory: (category: IdeaCategory) =>
      this.request('ideation.promptsByCategory', { category }),

    onStream: (callback: (event: IdeationStreamEvent) => void): (() => void) => {
      return this.subscribeToEvent('ideation:stream', callback as EventCallback);
    },

    onAnalysisEvent: (callback: (event: IdeationAnalysisEvent) => void): (() => void) => {
      return this.subscribeToEvent('ideation:analysis', callback as EventCallback);
    },
  };

  // Notifications API - project-level notifications
  notifications: NotificationsAPI & {
    onNotificationCreated: (callback: (notification: Notification) => void) => () => void;
  } = {
    list: (projectPath: string) => this.request('notifications.list', { projectPath }),

    getUnreadCount: (projectPath: string) =>
      this.request('notifications.unreadCount', { projectPath }),

    markAsRead: (projectPath: string, notificationId?: string) =>
      this.request('notifications.markRead', { projectPath, notificationId }),

    dismiss: (projectPath: string, notificationId?: string) =>
      this.request('notifications.dismiss', { projectPath, notificationId }),

    onNotificationCreated: (callback: (notification: Notification) => void): (() => void) => {
      return this.subscribeToEvent('notification:created', callback as EventCallback);
    },
  };

  // Event History API - stored events for debugging and replay
  eventHistory: EventHistoryAPI = {
    list: (projectPath: string, filter?: EventHistoryFilter) =>
      this.request('eventHistory.list', { projectPath, filter }),

    get: (projectPath: string, eventId: string) =>
      this.request('eventHistory.get', { projectPath, eventId }),

    delete: (projectPath: string, eventId: string) =>
      this.request('eventHistory.delete', { projectPath, eventId }),

    clear: (projectPath: string) => this.request('eventHistory.clear', { projectPath }),

    replay: (projectPath: string, eventId: string, hookIds?: string[]) =>
      this.request('eventHistory.replay', { projectPath, eventId, hookIds }),
  };

  // MCP API - Test MCP server connections and list tools
  // SECURITY: Only accepts serverId, not arbitrary serverConfig, to prevent
  // drive-by command execution attacks. Servers must be saved first.
  mcp = {
    testServer: (
      serverId: string
    ): Promise<{
      success: boolean;
      tools?: Array<{
        name: string;
        description?: string;
        inputSchema?: Record<string, unknown>;
        enabled: boolean;
      }>;
      error?: string;
      connectionTime?: number;
      serverInfo?: {
        name?: string;
        version?: string;
      };
    }> => this.request('mcp.testServer', { serverId }),

    listTools: (
      serverId: string
    ): Promise<{
      success: boolean;
      tools?: Array<{
        name: string;
        description?: string;
        inputSchema?: Record<string, unknown>;
        enabled: boolean;
      }>;
      error?: string;
    }> => this.request('mcp.listTools', { serverId }),
  };

  // Pipeline API - custom workflow pipeline steps
  pipeline = {
    getConfig: (
      projectPath: string
    ): Promise<{
      success: boolean;
      config?: {
        version: 1;
        steps: Array<{
          id: string;
          name: string;
          order: number;
          instructions: string;
          colorClass: string;
          createdAt: string;
          updatedAt: string;
        }>;
      };
      error?: string;
    }> => this.request('pipeline.getConfig', { projectPath }),

    saveConfig: (
      projectPath: string,
      config: {
        version: 1;
        steps: Array<{
          id: string;
          name: string;
          order: number;
          instructions: string;
          colorClass: string;
          createdAt: string;
          updatedAt: string;
        }>;
      }
    ): Promise<{ success: boolean; error?: string }> =>
      this.request('pipeline.saveConfig', { projectPath, config }),

    addStep: (
      projectPath: string,
      step: {
        name: string;
        order: number;
        instructions: string;
        colorClass: string;
      }
    ): Promise<{
      success: boolean;
      step?: {
        id: string;
        name: string;
        order: number;
        instructions: string;
        colorClass: string;
        createdAt: string;
        updatedAt: string;
      };
      error?: string;
    }> => this.request('pipeline.addStep', { projectPath, step }),

    updateStep: (
      projectPath: string,
      stepId: string,
      updates: Partial<{
        name: string;
        order: number;
        instructions: string;
        colorClass: string;
      }>
    ): Promise<{
      success: boolean;
      step?: {
        id: string;
        name: string;
        order: number;
        instructions: string;
        colorClass: string;
        createdAt: string;
        updatedAt: string;
      };
      error?: string;
    }> => this.request('pipeline.updateStep', { projectPath, stepId, updates }),

    deleteStep: (
      projectPath: string,
      stepId: string
    ): Promise<{ success: boolean; error?: string }> =>
      this.request('pipeline.deleteStep', { projectPath, stepId }),

    reorderSteps: (
      projectPath: string,
      stepIds: string[]
    ): Promise<{ success: boolean; error?: string }> =>
      this.request('pipeline.reorderSteps', { projectPath, stepIds }),
  };
}

// Singleton instance
let httpApiClientInstance: HttpApiClient | null = null;

export function getHttpApiClient(): HttpApiClient {
  if (!httpApiClientInstance) {
    httpApiClientInstance = new HttpApiClient();
  }
  return httpApiClientInstance;
}

// Start API key initialization immediately when this module is imported
// This ensures the init promise is created early, even before React components mount
// The actual async work happens in the background and won't block module loading
initApiKey().catch((error) => {
  logger.error('Failed to initialize API key:', error);
});
