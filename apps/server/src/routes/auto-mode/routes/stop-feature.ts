/**
 * POST /stop-feature endpoint - Stop a specific feature
 */

import type { Request, Response } from 'express';
import type { FacadeProvider, GlobalAutoModeService } from '../../../services/auto-mode/index.js';
import { getErrorMessage, logError } from '../common.js';

export function createStopFeatureHandler(global: GlobalAutoModeService, getFacade: FacadeProvider) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { featureId } = req.body as { featureId: string };

      if (!featureId) {
        res.status(400).json({ success: false, error: 'featureId is required' });
        return;
      }

      const runningAgents = await global.getRunningAgents();
      const agent = runningAgents.find((a) => a.featureId === featureId);

      if (agent) {
        const stopped = await getFacade(agent.projectPath).stopFeature(featureId);
        res.json({ success: true, stopped });
        return;
      }

      res.json({ success: true, stopped: false });
    } catch (error) {
      logError(error, 'Stop feature failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
