/**
 * POST /context-exists endpoint - Check if context exists for a feature
 */

import type { Request, Response } from 'express';
import type { FacadeProvider } from '../../../services/auto-mode/index.js';
import { getErrorMessage, logError } from '../common.js';

export function createContextExistsHandler(getFacade: FacadeProvider) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, featureId } = req.body as {
        projectPath: string;
        featureId: string;
      };

      if (!projectPath || !featureId) {
        res.status(400).json({
          success: false,
          error: 'projectPath and featureId are required',
        });
        return;
      }

      const exists = await getFacade(projectPath).contextExists(featureId);
      res.json({ success: true, exists });
    } catch (error) {
      logError(error, 'Check context exists failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
