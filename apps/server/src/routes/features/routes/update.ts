/**
 * POST /update endpoint - Update a feature
 */

import type { Request, Response } from 'express';
import type { Feature, FeatureStatus } from '@automaker/types';
import { isDoneFeatureStatus } from '@automaker/types';
import { FeatureLoader } from '../../../services/feature-loader.js';
import type { EventEmitter } from '../../../lib/events.js';
import {
  IllegalTransitionError,
  type FeatureTransitioner,
} from '../../../services/feature-record.js';
import { getErrorMessage, logError } from '../common.js';
import { resolveStatusIntent } from './status-intent.js';

export function createUpdateHandler(
  featureLoader: FeatureLoader,
  events?: EventEmitter,
  featureRecord?: FeatureTransitioner
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        projectPath,
        featureId,
        updates,
        descriptionHistorySource,
        enhancementMode,
        preEnhancementDescription,
      } = req.body as {
        projectPath: string;
        featureId: string;
        updates: Partial<Feature>;
        descriptionHistorySource?: 'enhance' | 'edit';
        enhancementMode?: 'improve' | 'technical' | 'simplify' | 'acceptance' | 'ux-reviewer';
        preEnhancementDescription?: string;
      };

      if (!projectPath || !featureId || !updates) {
        res.status(400).json({
          success: false,
          error: 'projectPath, featureId, and updates are required',
        });
        return;
      }

      const currentFeature = await featureLoader.get(projectPath, featureId);
      if (!currentFeature) {
        res.status(404).json({ success: false, error: `Feature ${featureId} not found` });
        return;
      }

      const newStatus = updates.status;
      const fieldUpdates = { ...updates };
      delete fieldUpdates.status;

      if (newStatus === undefined) {
        const updated = await featureLoader.update(
          projectPath,
          featureId,
          fieldUpdates,
          descriptionHistorySource,
          enhancementMode,
          preEnhancementDescription
        );
        res.json({ success: true, feature: updated });
        return;
      }

      const intent = resolveStatusIntent(newStatus as FeatureStatus);
      if (!intent) {
        res.status(400).json({
          success: false,
          error: `Unsupported status '${String(newStatus)}': it is not a lifecycle status or a pipeline step.`,
        });
        return;
      }

      if (!featureRecord) {
        res.status(500).json({
          success: false,
          error: 'Feature record not available; cannot change status',
        });
        return;
      }

      if (Object.keys(fieldUpdates).length > 0) {
        await featureLoader.update(
          projectPath,
          featureId,
          fieldUpdates,
          descriptionHistorySource,
          enhancementMode,
          preEnhancementDescription
        );
      }

      const result = await featureRecord.transition(
        projectPath,
        featureId,
        intent.trigger,
        intent.context
      );

      if (result.changed && isDoneFeatureStatus(newStatus)) {
        events?.emit('feature:completed', {
          featureId,
          featureName: result.feature.title,
          projectPath,
          passes: true,
          message:
            newStatus === 'verified' ? 'Feature verified manually' : 'Feature completed manually',
          executionMode: 'manual',
        });
      }

      res.json({ success: true, feature: result.feature });
    } catch (error) {
      if (error instanceof IllegalTransitionError) {
        res.status(409).json({ success: false, error: getErrorMessage(error) });
        return;
      }
      logError(error, 'Update feature failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
