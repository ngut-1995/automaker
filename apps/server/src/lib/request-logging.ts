/**
 * Runtime-configurable HTTP request logging state.
 *
 * Extracted from the server entry point so route handlers can toggle it
 * without importing `index.ts` (which would create a circular dependency).
 */

let requestLoggingEnabled = process.env.ENABLE_REQUEST_LOGGING !== 'false'; // Default to true

/**
 * Enable or disable HTTP request logging at runtime
 */
export function setRequestLoggingEnabled(enabled: boolean): void {
  requestLoggingEnabled = enabled;
}

/**
 * Get current request logging state
 */
export function isRequestLoggingEnabled(): boolean {
  return requestLoggingEnabled;
}
