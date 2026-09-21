/**
 * POST /verify-feature endpoint - Verify a feature
 */

import type { Request, Response } from 'express';
import type { FacadeProvider } from '../../../services/auto-mode/index.js';
import { getErrorMessage, logError } from '../common.js';

export function createVerifyFeatureHandler(getFacade: FacadeProvider) {
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

      const passes = await getFacade(projectPath).verifyFeature(featureId);
      res.json({ success: true, passes });
    } catch (error) {
      logError(error, 'Verify feature failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
