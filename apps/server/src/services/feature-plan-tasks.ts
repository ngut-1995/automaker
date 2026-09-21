/**
 * Feature plan-task finalization shared by the Feature record and the
 * legacy FeatureStateManager while the lifecycle writers are migrated.
 */

import type { Feature } from '@automaker/types';
import { createLogger } from '@automaker/utils';

const logger = createLogger('FeaturePlanTasks');

/**
 * Finalize in-progress tasks when a feature reaches a terminal state.
 * Marks in_progress tasks as completed but leaves pending tasks untouched.
 */
export function finalizeInProgressTasks(
  feature: Feature,
  featureId: string,
  targetStatus: string
): void {
  if (!feature.planSpec?.tasks) {
    return;
  }

  let tasksFinalized = 0;
  let tasksPending = 0;

  for (const task of feature.planSpec.tasks) {
    if (task.status === 'in_progress') {
      task.status = 'completed';
      tasksFinalized++;
    } else if (task.status === 'pending') {
      tasksPending++;
    }
  }

  feature.planSpec.tasksCompleted = feature.planSpec.tasks.filter(
    (t) => t.status === 'completed'
  ).length;
  feature.planSpec.currentTaskId = undefined;

  if (tasksFinalized > 0) {
    logger.info(
      `[finalizeInProgressTasks] Finalized ${tasksFinalized} in_progress tasks for feature ${featureId} moving to ${targetStatus}`
    );
  }

  if (tasksPending > 0) {
    logger.warn(
      `[finalizeInProgressTasks] Feature ${featureId} moving to ${targetStatus} with ${tasksPending} pending (never started) tasks out of ${feature.planSpec.tasks.length} total`
    );
  }
}
