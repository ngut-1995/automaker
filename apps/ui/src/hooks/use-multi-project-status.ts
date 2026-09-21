/**
 * Hook for fetching multi-project overview data
 *
 * Provides real-time status across all projects for the unified dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import type { MultiProjectOverview } from '@automaker/types';
import { createLogger } from '@automaker/utils/logger';
import { getHttpApiClient } from '@/lib/http-api-client';

const logger = createLogger('useMultiProjectStatus');

interface UseMultiProjectStatusResult {
  overview: MultiProjectOverview | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetch the projects overview through the contract-backed client.
 */
async function fetchProjectsOverview(): Promise<MultiProjectOverview> {
  const data = await getHttpApiClient().projects.getOverview();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch project overview');
  }

  return data;
}

/**
 * Hook to fetch and manage multi-project overview data
 *
 * @param refreshInterval - Optional interval in ms to auto-refresh (default: 30000)
 */
export function useMultiProjectStatus(refreshInterval = 30000): UseMultiProjectStatusResult {
  const [overview, setOverview] = useState<MultiProjectOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchProjectsOverview();
      setOverview(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch overview';
      logger.error('Failed to fetch project overview:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(refresh, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refresh, refreshInterval]);

  return {
    overview,
    isLoading,
    error,
    refresh,
  };
}
