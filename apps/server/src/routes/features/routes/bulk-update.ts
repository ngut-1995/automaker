/**
 * POST /bulk-update endpoint - Update multiple features at once
 */

import type { Request, Response } from 'express';
import { FeatureLoader } from '../../../services/feature-loader.js';
import type { Feature, FeatureStatus } from '@automaker/types';
import type { FeatureTransitioner } from '../../../services/feature-record.js';
import { getErrorMessage, logError } from '../common.js';
import { resolveStatusIntent, type StatusIntent } from './status-intent.js';

interface BulkUpdateRequest {
  projectPath: string;
  featureIds: string[];
  updates: Partial<Feature>;
}

interface BulkUpdateResult {
  featureId: string;
  success: boolean;
  error?: string;
}

export function createBulkUpdateHandler(
  featureLoader: FeatureLoader,
  featureRecord?: FeatureTransitioner
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, featureIds, updates } = req.body as BulkUpdateRequest;

      if (!projectPath || !featureIds || !Array.isArray(featureIds) || featureIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'projectPath and featureIds (non-empty array) are required',
        });
        return;
      }

      if (!updates || Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          error: 'updates object with at least one field is required',
        });
        return;
      }

      const record = featureRecord;
      const newStatus = updates.status;
      const fieldUpdates = { ...updates };
      delete fieldUpdates.status;
      const hasFieldUpdates = Object.keys(fieldUpdates).length > 0;

      let intent: StatusIntent | null = null;
      if (newStatus !== undefined) {
        intent = resolveStatusIntent(newStatus as FeatureStatus);
        if (!intent) {
          res.status(400).json({
            success: false,
            error: `Unsupported status '${String(newStatus)}': it is not a lifecycle status or a pipeline step.`,
          });
          return;
        }
        if (!record) {
          res.status(500).json({
            success: false,
            error: 'Feature record not available; cannot change status',
          });
          return;
        }
      }

      const results: BulkUpdateResult[] = [];
      const updatedFeatures: Feature[] = [];

      // Process in parallel batches of 20 for efficiency
      const BATCH_SIZE = 20;
      for (let i = 0; i < featureIds.length; i += BATCH_SIZE) {
        const batch = featureIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (featureId) => {
            try {
              let updated: Feature;
              if (intent) {
                if (!record) {
                  return {
                    featureId,
                    success: false as const,
                    error: 'Feature record not available',
                  };
                }
                if (hasFieldUpdates) {
                  await featureLoader.update(projectPath, featureId, fieldUpdates);
                }
                updated = (
                  await record.transition(projectPath, featureId, intent.trigger, intent.context)
                ).feature;
              } else {
                updated = await featureLoader.update(projectPath, featureId, fieldUpdates);
              }
              return { featureId, success: true as const, feature: updated };
            } catch (error) {
              return {
                featureId,
                success: false as const,
                error: getErrorMessage(error),
              };
            }
          })
        );

        for (const result of batchResults) {
          if (result.success) {
            results.push({ featureId: result.featureId, success: true });
            updatedFeatures.push(result.feature);
          } else {
            results.push({
              featureId: result.featureId,
              success: false,
              error: result.error,
            });
          }
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      res.json({
        success: failureCount === 0,
        updatedCount: successCount,
        failedCount: failureCount,
        results,
        features: updatedFeatures,
      });
    } catch (error) {
      logError(error, 'Bulk update features failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
