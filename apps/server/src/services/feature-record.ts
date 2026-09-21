/**
 * FeatureRecord - the single writer of a Feature's persisted state.
 *
 * A Feature travels from backlog to in progress to waiting-approval or verified
 * through this module: callers express an intent, the shared transition table
 * decides legality and target, and the record does one atomic read-modify-write
 * under a per-feature concurrency guard. Persistence happens before events.
 */

import path from 'path';
import type { Feature, FeatureStatus, FeatureTrigger, TransitionContext } from '@automaker/types';
import { resolveTransition } from '@automaker/types';
import {
  atomicWriteJson,
  readJsonWithRecovery,
  logRecoveryWarning,
  DEFAULT_BACKUP_COUNT,
  createLogger,
} from '@automaker/utils';
import { getFeatureDir } from '@automaker/platform';
import type { TypedEventBus } from './typed-event-bus.js';
import { FeatureLoader } from './feature-loader.js';
import { finalizeInProgressTasks } from './feature-plan-tasks.js';
import { getNotificationService } from './notification-service.js';

const logger = createLogger('FeatureRecord');
const transitionLogger = createLogger('FeatureTransition');

// Notification type constants
const NOTIFICATION_TYPE_WAITING_APPROVAL = 'feature_waiting_approval';
const NOTIFICATION_TYPE_VERIFIED = 'feature_verified';

// Notification title constants
const NOTIFICATION_TITLE_WAITING_APPROVAL = 'Feature Ready for Review';
const NOTIFICATION_TITLE_VERIFIED = 'Feature Verified';

/**
 * A transition lock per `projectPath:featureId`. Module-scoped so that every
 * FeatureRecord instance writing the same feature serializes on the same lock,
 * not just instances that happen to share a record object.
 */
const transitionLocks = new Map<string, Promise<void>>();

/** Thrown when a caller asks for a transition the table does not allow. */
export class IllegalTransitionError extends Error {
  constructor(
    public readonly featureId: string,
    public readonly from: FeatureStatus | undefined,
    public readonly trigger: FeatureTrigger,
    reason: string
  ) {
    super(
      `Illegal transition for feature ${featureId}: cannot apply '${trigger}' from '${from ?? 'undefined'}' (${reason})`
    );
    this.name = 'IllegalTransitionError';
  }
}

export interface TransitionResult {
  feature: Feature;
  changed: boolean;
}

/**
 * The canonical signature for applying a lifecycle trigger through a record.
 * Used by the record's structural interface and by the execution/pipeline
 * callback types.
 */
export type TransitionFeatureFn = (
  projectPath: string,
  featureId: string,
  trigger: FeatureTrigger,
  context?: TransitionContext
) => Promise<TransitionResult>;

/**
 * The narrow view of a Feature record used by services that only need to apply
 * a lifecycle trigger. A FeatureRecord satisfies it structurally.
 */
export interface FeatureTransitioner {
  transition: TransitionFeatureFn;
}

/**
 * Apply a trigger through any transition source, treating a rejected pair as a
 * skip rather than an error. Returns the transition result, or null when the
 * pair was illegal for the feature's current status.
 */
export async function applyTransitionIgnoringIllegal(
  transition: TransitionFeatureFn,
  projectPath: string,
  featureId: string,
  trigger: FeatureTrigger,
  context?: TransitionContext
): Promise<TransitionResult | null> {
  try {
    return await transition(projectPath, featureId, trigger, context);
  } catch (error) {
    if (error instanceof IllegalTransitionError) {
      transitionLogger.debug(
        `Skipped illegal transition '${trigger}' for feature ${featureId}: ${error.message}`
      );
      return null;
    }
    throw error;
  }
}

export class FeatureRecord {
  constructor(
    private readonly eventBus: TypedEventBus,
    private readonly featureLoader: FeatureLoader = new FeatureLoader()
  ) {}

  private getFeatureJsonPath(projectPath: string, featureId: string): string {
    return path.join(getFeatureDir(projectPath, featureId), 'feature.json');
  }

  async load(projectPath: string, featureId: string): Promise<Feature | null> {
    const result = await readJsonWithRecovery<Feature | null>(
      this.getFeatureJsonPath(projectPath, featureId),
      null,
      { maxBackups: DEFAULT_BACKUP_COUNT, autoRestore: true }
    );
    logRecoveryWarning(result, `Feature ${featureId}`, logger);

    const feature = result.data;
    if (feature?.titleGenerating) {
      delete feature.titleGenerating;
    }
    return feature;
  }

  async list(projectPath: string): Promise<Feature[]> {
    return this.featureLoader.getAll(projectPath);
  }

  async create(projectPath: string, data: Partial<Feature>): Promise<Feature> {
    return this.featureLoader.create(projectPath, data);
  }

  /**
   * Apply a lifecycle trigger to a Feature. The whole load -> resolve -> write
   * critical section is serialized per feature so two concurrent transitions
   * cannot lose an update.
   */
  async transition(
    projectPath: string,
    featureId: string,
    trigger: FeatureTrigger,
    context: TransitionContext = {}
  ): Promise<TransitionResult> {
    return this.withLock(`${projectPath}:${featureId}`, () =>
      this.applyTransition(projectPath, featureId, trigger, context)
    );
  }

  private async applyTransition(
    projectPath: string,
    featureId: string,
    trigger: FeatureTrigger,
    context: TransitionContext
  ): Promise<TransitionResult> {
    const feature = await this.load(projectPath, featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    const resolution = resolveTransition(feature.status, trigger, context);
    if (!resolution.ok) {
      throw new IllegalTransitionError(featureId, feature.status, trigger, resolution.reason);
    }

    const target = resolution.status;
    if (target === feature.status) {
      return { feature, changed: false };
    }

    feature.status = target;
    feature.updatedAt = new Date().toISOString();
    feature.justFinishedAt = target === 'waiting_approval' ? new Date().toISOString() : undefined;

    if (target === 'waiting_approval' || target === 'verified') {
      finalizeInProgressTasks(feature, featureId, target);
    }

    await atomicWriteJson(this.getFeatureJsonPath(projectPath, featureId), feature, {
      backupCount: DEFAULT_BACKUP_COUNT,
    });

    this.eventBus.emitAutoModeEvent('feature_status_changed', {
      featureId,
      projectPath,
      status: target,
    });

    await this.runSideEffects(projectPath, featureId, feature, target);

    return { feature, changed: true };
  }

  private async runSideEffects(
    projectPath: string,
    featureId: string,
    feature: Feature,
    status: FeatureStatus
  ): Promise<void> {
    try {
      const notificationService = getNotificationService();
      const displayName = feature.title && feature.title.trim() ? feature.title : featureId;

      if (status === 'waiting_approval') {
        await notificationService.createNotification({
          type: NOTIFICATION_TYPE_WAITING_APPROVAL,
          title: displayName,
          message: NOTIFICATION_TITLE_WAITING_APPROVAL,
          featureId,
          projectPath,
        });
      } else if (status === 'verified') {
        await notificationService.createNotification({
          type: NOTIFICATION_TYPE_VERIFIED,
          title: displayName,
          message: NOTIFICATION_TITLE_VERIFIED,
          featureId,
          projectPath,
        });
      }
    } catch (notificationError) {
      logger.warn(`Failed to create notification for feature ${featureId}:`, notificationError);
    }

    if (status === 'verified' || status === 'completed') {
      try {
        await this.featureLoader.syncFeatureToAppSpec(projectPath, feature);
      } catch (syncError) {
        logger.warn(`Failed to sync feature ${featureId} to app_spec.txt:`, syncError);
      }
    }
  }

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = transitionLocks.get(key) ?? Promise.resolve();
    const run = previous.then(() => fn());
    const chained = run.then(
      () => undefined,
      () => undefined
    );
    transitionLocks.set(key, chained);

    try {
      return await run;
    } finally {
      if (transitionLocks.get(key) === chained) {
        transitionLocks.delete(key);
      }
    }
  }
}
