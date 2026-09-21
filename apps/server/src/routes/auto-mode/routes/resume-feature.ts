/**
 * POST /resume-feature endpoint - Resume a feature
 */

import type { Request, Response } from 'express';
import type { FacadeProvider } from '../../../services/auto-mode/index.js';
import { createLogger } from '@automaker/utils';
import { getErrorMessage, logError } from '../common.js';

const logger = createLogger('AutoMode');

export function createResumeFeatureHandler(getFacade: FacadeProvider) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, featureId, useWorktrees } = req.body as {
        projectPath: string;
        featureId: string;
        useWorktrees?: boolean;
      };

      if (!projectPath || !featureId) {
        res.status(400).json({
          success: false,
          error: 'projectPath and featureId are required',
        });
        return;
      }

      // Start resume in background
      // Default to false - worktrees should only be used when explicitly enabled
      getFacade(projectPath)
        .resumeFeature(featureId, useWorktrees ?? false)
        .catch((error) => {
          logger.error(`Resume feature ${featureId} error:`, error);
        });

      res.json({ success: true });
    } catch (error) {
      logError(error, 'Resume feature failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
