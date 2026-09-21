/**
 * Feature lifecycle vocabulary and transition table.
 *
 * A trigger is what a caller wants a Feature to do; the resolver maps the
 * current canonical FeatureStatus plus the trigger's context to the legal
 * target status. There is deliberately no IO here - persistence and events
 * belong to the Feature record in the server.
 */

import type { FeatureStatus } from './feature.js';
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
  outcome?: 'verified' | 'waiting_approval';
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

function isActive(status: FeatureStatus): boolean {
  return status === 'in_progress' || isPipelineStatus(status);
}

function isStartable(status: FeatureStatus): boolean {
  return (
    status === 'backlog' ||
    status === 'ready' ||
    status === 'interrupted' ||
    status === 'pending' ||
    status === 'running' ||
    status === 'failed' ||
    status === 'in_progress' ||
    isPipelineStatus(status)
  );
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
          `'start' is only legal from backlog, ready, interrupted, or a pipeline step (was '${current}')`
        );
      }
      return accept('in_progress');

    case 'finish': {
      if (!isActive(current as FeatureStatus) && current !== 'waiting_approval') {
        return reject(
          `'finish' is only legal from in_progress, a pipeline step, or waiting_approval (was '${current}')`
        );
      }
      return accept(context.outcome ?? 'verified');
    }

    case 'fail': {
      if (!isActive(current as FeatureStatus)) {
        return reject(
          `'fail' is only legal from in_progress or a pipeline step (was '${current}')`
        );
      }
      return accept(context.pipelineCompleted ? 'waiting_approval' : 'backlog');
    }

    case 'interrupt': {
      if (!isActive(current as FeatureStatus)) {
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
      if (!isActive(current as FeatureStatus)) {
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
      if (!isActive(current as FeatureStatus)) {
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
