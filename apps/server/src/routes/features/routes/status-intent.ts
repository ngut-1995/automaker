/**
 * Map a manually requested FeatureStatus to the lifecycle trigger that reaches
 * it through the Feature record. This is the one place the features routes turn
 * a status literal into an intent; the record decides legality.
 */

import type {
  FeatureStatus,
  FeatureTrigger,
  StaticFeatureStatus,
  TransitionContext,
} from '@automaker/types';
import { isPipelineStatus } from '@automaker/types';

export interface StatusIntent {
  trigger: FeatureTrigger;
  context?: TransitionContext;
}

const PIPELINE_PREFIX = 'pipeline_';

const STATIC_STATUS_INTENTS: Partial<Record<StaticFeatureStatus, StatusIntent>> = {
  backlog: { trigger: 'returnToBacklog' },
  in_progress: { trigger: 'start' },
  interrupted: { trigger: 'interrupt' },
  waiting_approval: { trigger: 'finish', context: { outcome: 'waiting_approval' } },
  verified: { trigger: 'finish', context: { outcome: 'verified' } },
  completed: { trigger: 'finish', context: { outcome: 'completed' } },
  merge_conflict: { trigger: 'mergeConflict' },
};

export function resolveStatusIntent(target: FeatureStatus): StatusIntent | null {
  if (isPipelineStatus(target)) {
    const stepId = target.slice(PIPELINE_PREFIX.length);
    return { trigger: 'enterStep', context: { stepId } };
  }
  return STATIC_STATUS_INTENTS[target as StaticFeatureStatus] ?? null;
}
