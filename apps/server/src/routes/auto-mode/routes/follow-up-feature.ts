/**
 * POST /follow-up-feature endpoint - Follow up on a feature
 */

import type { Request, Response } from 'express';
import type { FacadeProvider } from '../../../services/auto-mode/index.js';
import { createLogger } from '@automaker/utils';
import { getErrorMessage, logError } from '../common.js';

const logger = createLogger('AutoMode');

export function createFollowUpFeatureHandler(getFacade: FacadeProvider) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, featureId, prompt, imagePaths, useWorktrees } = req.body as {
        projectPath: string;
        featureId: string;
        prompt: string;
        imagePaths?: string[];
        useWorktrees?: boolean;
      };

      if (!projectPath || !featureId || !prompt) {
        res.status(400).json({
          success: false,
          error: 'projectPath, featureId, and prompt are required',
        });
        return;
      }

      // Start follow-up in background
      // followUpFeature derives workDir from feature.branchName
      // Default to false to match run-feature/resume-feature behavior.
      // Worktrees should only be used when explicitly enabled by the user.
      getFacade(projectPath)
        .followUpFeature(featureId, prompt, imagePaths, useWorktrees ?? false)
        .catch((error) => {
          logger.error(`[AutoMode] Follow up feature ${featureId} error:`, error);
        });

      res.json({ success: true });
    } catch (error) {
      logError(error, 'Follow up feature failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
