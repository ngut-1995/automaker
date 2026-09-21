import { Router, Request, Response } from 'express';
import { GeminiProvider } from '../../providers/gemini-provider.js';
import { GeminiUsageService } from '../../services/gemini-usage-service.js';
import { createLogger } from '@automaker/utils';
import type { EventEmitter } from '../../lib/events.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';

const logger = createLogger('Gemini');

export const GEMINI_MOUNT = '/api/gemini';

/** GET /usage - Get current usage/quota data from Google Cloud API. */
function createUsageHandler(usageService: GeminiUsageService) {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      const usageData = await usageService.fetchUsageData();

      res.json(usageData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching Gemini usage:', error);

      // Return error in a format the UI expects
      res.status(200).json({
        authenticated: false,
        authMethod: 'none',
        usedPercent: 0,
        remainingPercent: 100,
        lastUpdated: new Date().toISOString(),
        error: `Failed to fetch Gemini usage: ${message}`,
      });
    }
  };
}

/** GET /status - Check if Gemini is available. */
function createStatusHandler() {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      const provider = new GeminiProvider();
      const status = await provider.detectInstallation();

      // Derive authMethod from typed InstallationStatus fields
      const authMethod = status.authenticated
        ? status.hasApiKey
          ? 'api_key'
          : 'cli_login'
        : 'none';

      res.json({
        success: true,
        installed: status.installed,
        version: status.version || null,
        path: status.path || null,
        authenticated: status.authenticated || false,
        authMethod,
        hasCredentialsFile: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  };
}

export function createGeminiHandlers(usageService: GeminiUsageService): OperationHandlers {
  return {
    'gemini.getUsage': createUsageHandler(usageService),
    'gemini.getStatus': createStatusHandler(),
  };
}

export function createGeminiRoutes(
  usageService: GeminiUsageService,
  _events: EventEmitter
): Router {
  return registerContractOperations(Router(), GEMINI_MOUNT, createGeminiHandlers(usageService));
}
