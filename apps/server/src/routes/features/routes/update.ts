/**
 * POST /update endpoint - Update a feature
 */

import type { Request, Response } from 'express';
import { FeatureLoader } from '../../../services/feature-loader.js';
import type { Feature, FeatureStatus, FeatureTrigger, TransitionContext } from '@automaker/types';
import type { EventEmitter } from '../../../lib/events.js';
import type { FeatureTransitioner } from '../../../services/feature-record.js';
import { getErrorMessage, logError } from '../common.js';

// Statuses whose transition owns notification/spec-sync side effects
const TRANSITION_SIDE_EFFECTS: Partial<
  Record<FeatureStatus, { trigger: FeatureTrigger; context: TransitionContext }>
> = {
  waiting_approval: { trigger: 'finish', context: { outcome: 'waiting_approval' } },
  verified: { trigger: 'finish', context: { outcome: 'verified' } },
  completed: { trigger: 'finish', context: { outcome: 'completed' } },
};

const COMPLETION_EVENT_STATUSES: FeatureStatus[] = ['verified', 'completed'];

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

      // Get the current feature to detect status changes
      const currentFeature = await featureLoader.get(projectPath, featureId);
      if (!currentFeature) {
        res.status(404).json({ success: false, error: `Feature ${featureId} not found` });
        return;
      }
      const previousStatus = currentFeature.status as FeatureStatus;
      const newStatus = updates.status as FeatureStatus | undefined;
      const transition = newStatus ? TRANSITION_SIDE_EFFECTS[newStatus] : undefined;
      const statusChanged = newStatus !== undefined && newStatus !== previousStatus;

      let updated: Feature;

      if (transition && statusChanged && featureRecord) {
        // The record owns the status write and its notification/spec-sync side effects.
        const fieldUpdates = { ...updates };
        delete fieldUpdates.status;
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
        updated = (
          await featureRecord.transition(
            projectPath,
            featureId,
            transition.trigger,
            transition.context
          )
        ).feature;

        if (COMPLETION_EVENT_STATUSES.includes(newStatus)) {
          events?.emit('feature:completed', {
            featureId,
            featureName: updated.title,
            projectPath,
            passes: true,
            message:
              newStatus === 'verified' ? 'Feature verified manually' : 'Feature completed manually',
            executionMode: 'manual',
          });
        }
      } else {
        updated = await featureLoader.update(
          projectPath,
          featureId,
          updates,
          descriptionHistorySource,
          enhancementMode,
          preEnhancementDescription
        );
      }

      res.json({ success: true, feature: updated });
    } catch (error) {
      logError(error, 'Update feature failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
