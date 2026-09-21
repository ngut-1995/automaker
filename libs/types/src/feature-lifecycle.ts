/**
 * Feature lifecycle vocabulary and transition table.
 *
 * A trigger is what a caller wants a Feature to do; the resolver maps the
 * current canonical FeatureStatus plus the trigger's context to the legal
 * target status. There is deliberately no IO here - persistence and events
 * belong to the Feature record in the server.
 */

import type { FeatureStatus, StaticFeatureStatus } from './feature.js';
import { STATIC_FEATURE_STATUSES } from './feature.js';
import { isPipelineStatus } from './pipeline.js';

/**
 * The intents a caller may express about a Feature's lifecycle.
 */
export type FeatureTrigger =
  | 'start'
  | 'finish'
  | 'fail'
  | 'interrupt'
  | 'resume'
  | 'enterStep'
  | 'mergeConflict'
  | 'returnToBacklog'
  | 'reset';

/**
 * The context a trigger needs to resolve its target.
 */
export interface TransitionContext {
  /** For 'finish': which terminal-ish status to land on. Defaults to verified. */
  outcome?: 'verified' | 'waiting_approval' | 'completed';
  /** For 'fail': whether the pipeline finished before the failure. */
  pipelineCompleted?: boolean;
  /** For 'enterStep': the pipeline step id to enter. */
  stepId?: string;
  /** For 'reset': whether the feature has an approved plan. */
  hasApprovedPlan?: boolean;
}

/**
 * A resolved transition: either a legal target status or a rejection naming why.
 */
export type TransitionResolution =
  | { ok: true; status: FeatureStatus }
  | { ok: false; reason: string };

function accept(status: FeatureStatus): TransitionResolution {
  return { ok: true, status };
}

function reject(reason: string): TransitionResolution {
  return { ok: false, reason };
}

/**
 * Whether an arbitrary value is a member of the FeatureStatus vocabulary:
 * a concrete status or a well-formed pipeline status.
 */
export function isFeatureStatus(value: unknown): value is FeatureStatus {
  return (
    typeof value === 'string' &&
    (STATIC_FEATURE_STATUSES.includes(value as StaticFeatureStatus) || isPipelineStatus(value))
  );
}

/**
 * A status the auto-mode loop may pick up: waiting in the backlog, approved and
 * ready, interrupted, or currently sitting in a pipeline step.
 */
export function isRunnableFeatureStatus(status: FeatureStatus | null | undefined): boolean {
  return (
    status === 'backlog' ||
    status === 'ready' ||
    status === 'interrupted' ||
    isPipelineStatus(status)
  );
}

/**
 * A status where a Feature is actively executing agent work.
 */
export function isInProgressFeatureStatus(status: FeatureStatus | null | undefined): boolean {
  return status === 'in_progress' || isPipelineStatus(status);
}

/**
 * A status that counts as done for dependency satisfaction: the work landed and
 * was verified. Deliberately excludes 'waiting_approval', which still awaits a
 * human decision and never unblocks a dependent Feature.
 */
export function isDoneFeatureStatus(status: FeatureStatus | null | undefined): boolean {
  return status === 'completed' || status === 'verified';
}

function isStartable(status: FeatureStatus): boolean {
  return isRunnableFeatureStatus(status) || status === 'in_progress' || status === 'merge_conflict';
}

/**
 * Resolve the legal target status for a trigger against the current status.
 *
 * Illegal pairs are rejected with a reason instead of being silently ignored;
 * the caller decides whether a rejection is an error (the Feature record throws)
 * or a reason to skip (the auto-mode execution path).
 */
export function resolveTransition(
  current: FeatureStatus | undefined,
  trigger: FeatureTrigger,
  context: TransitionContext = {}
): TransitionResolution {
  if (current === undefined && trigger !== 'returnToBacklog') {
    return reject(`no current status, cannot apply '${trigger}'`);
  }

  switch (trigger) {
    case 'start':
      if (!isStartable(current as FeatureStatus)) {
        return reject(
          `'start' is only legal from backlog, ready, interrupted, merge_conflict, or a pipeline step (was '${current}')`
        );
      }
      return accept('in_progress');

    case 'finish': {
      if (
        !isInProgressFeatureStatus(current) &&
        current !== 'waiting_approval' &&
        current !== 'verified' &&
        current !== 'completed'
      ) {
        return reject(
          `'finish' is only legal from in_progress, a pipeline step, waiting_approval, verified or completed (was '${current}')`
        );
      }
      return accept(context.outcome ?? 'verified');
    }

    case 'fail': {
      if (!isInProgressFeatureStatus(current)) {
        return reject(
          `'fail' is only legal from in_progress or a pipeline step (was '${current}')`
        );
      }
      return accept(context.pipelineCompleted ? 'waiting_approval' : 'backlog');
    }

    case 'interrupt': {
      if (!isInProgressFeatureStatus(current)) {
        return reject(
          `'interrupt' is only legal from in_progress or a pipeline step (was '${current}')`
        );
      }
      return accept('interrupted');
    }

    case 'resume': {
      if (current !== 'interrupted') {
        return reject(`'resume' is only legal from interrupted (was '${current}')`);
      }
      return accept('in_progress');
    }

    case 'enterStep': {
      if (!isInProgressFeatureStatus(current)) {
        return reject(
          `'enterStep' is only legal from in_progress or a pipeline step (was '${current}')`
        );
      }
      if (!context.stepId || !context.stepId.trim()) {
        return reject(`'enterStep' requires a non-empty stepId`);
      }
      return accept(`pipeline_${context.stepId}` as FeatureStatus);
    }

    case 'mergeConflict': {
      if (!isInProgressFeatureStatus(current)) {
        return reject(
          `'mergeConflict' is only legal from in_progress or a pipeline step (was '${current}')`
        );
      }
      return accept('merge_conflict');
    }

    case 'returnToBacklog':
      return accept('backlog');

    case 'reset': {
      if (current !== 'in_progress' && current !== 'interrupted') {
        return reject(`'reset' is only legal from in_progress or interrupted (was '${current}')`);
      }
      return accept(context.hasApprovedPlan ? 'ready' : 'backlog');
    }

    default: {
      const exhaustive: never = trigger;
      return reject(`unknown trigger '${String(exhaustive)}'`);
    }
  }
}
