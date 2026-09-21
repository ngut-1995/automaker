import { describe, it, expect } from 'vitest';
import {
  resolveTransition,
  isRunnableFeatureStatus,
  isInProgressFeatureStatus,
  isDoneFeatureStatus,
} from '../../src/feature-lifecycle.js';
import type { FeatureTrigger, TransitionContext } from '../../src/feature-lifecycle.js';
import type { FeatureStatus } from '../../src/feature.js';

function resolve(
  current: FeatureStatus | undefined,
  trigger: FeatureTrigger,
  context?: TransitionContext
) {
  return resolveTransition(current, trigger, context);
}

describe('resolveTransition', () => {
  describe('legal pairs', () => {
    it('starts a feature from backlog, ready, interrupted, merge_conflict and pipeline steps', () => {
      for (const from of [
        'backlog',
        'ready',
        'interrupted',
        'merge_conflict',
        'pipeline_review',
      ] as FeatureStatus[]) {
        expect(resolve(from, 'start')).toEqual({ ok: true, status: 'in_progress' });
      }
    });

    it('restarts a merge-conflict feature', () => {
      expect(resolve('merge_conflict', 'start')).toEqual({ ok: true, status: 'in_progress' });
    });

    it('treats start from in_progress as an idempotent no-op target', () => {
      expect(resolve('in_progress', 'start')).toEqual({ ok: true, status: 'in_progress' });
    });

    it('finishes from in_progress, pipeline steps and waiting_approval', () => {
      for (const from of ['in_progress', 'pipeline_test', 'waiting_approval'] as FeatureStatus[]) {
        expect(resolve(from, 'finish')).toEqual({ ok: true, status: 'verified' });
      }
    });

    it('fails from in_progress and pipeline steps', () => {
      expect(resolve('in_progress', 'fail')).toEqual({ ok: true, status: 'backlog' });
      expect(resolve('pipeline_test', 'fail')).toEqual({ ok: true, status: 'backlog' });
    });

    it('interrupts from in_progress and pipeline steps', () => {
      expect(resolve('in_progress', 'interrupt')).toEqual({ ok: true, status: 'interrupted' });
      expect(resolve('pipeline_test', 'interrupt')).toEqual({ ok: true, status: 'interrupted' });
    });

    it('resumes from interrupted', () => {
      expect(resolve('interrupted', 'resume')).toEqual({ ok: true, status: 'in_progress' });
    });

    it('enters a pipeline step from active statuses', () => {
      expect(resolve('in_progress', 'enterStep', { stepId: 'review' })).toEqual({
        ok: true,
        status: 'pipeline_review',
      });
      expect(resolve('pipeline_lint', 'enterStep', { stepId: 'review' })).toEqual({
        ok: true,
        status: 'pipeline_review',
      });
    });

    it('marks a merge conflict from active statuses', () => {
      expect(resolve('in_progress', 'mergeConflict')).toEqual({
        ok: true,
        status: 'merge_conflict',
      });
      expect(resolve('pipeline_test', 'mergeConflict')).toEqual({
        ok: true,
        status: 'merge_conflict',
      });
    });

    it('returns any status to backlog', () => {
      for (const from of [
        'backlog',
        'ready',
        'in_progress',
        'interrupted',
        'waiting_approval',
        'verified',
        'completed',
        'merge_conflict',
        'pipeline_test',
      ] as FeatureStatus[]) {
        expect(resolve(from, 'returnToBacklog')).toEqual({ ok: true, status: 'backlog' });
      }
    });

    it('resets in_progress and interrupted features', () => {
      expect(resolve('in_progress', 'reset')).toEqual({ ok: true, status: 'backlog' });
      expect(resolve('interrupted', 'reset')).toEqual({ ok: true, status: 'backlog' });
    });
  });

  describe('context-dependent targets', () => {
    it('finish defaults to verified but honours waiting_approval', () => {
      expect(resolve('in_progress', 'finish', {})).toEqual({ ok: true, status: 'verified' });
      expect(resolve('in_progress', 'finish', { outcome: 'waiting_approval' })).toEqual({
        ok: true,
        status: 'waiting_approval',
      });
      expect(resolve('in_progress', 'finish', { outcome: 'verified' })).toEqual({
        ok: true,
        status: 'verified',
      });
    });

    it('fail returns to waiting_approval when the pipeline completed', () => {
      expect(resolve('pipeline_test', 'fail', { pipelineCompleted: true })).toEqual({
        ok: true,
        status: 'waiting_approval',
      });
      expect(resolve('pipeline_test', 'fail', { pipelineCompleted: false })).toEqual({
        ok: true,
        status: 'backlog',
      });
      expect(resolve('in_progress', 'fail')).toEqual({ ok: true, status: 'backlog' });
    });

    it('enterStep builds the pipeline status from the step id', () => {
      expect(resolve('in_progress', 'enterStep', { stepId: 'code_review' })).toEqual({
        ok: true,
        status: 'pipeline_code_review',
      });
    });

    it('reset lands on ready when there is an approved plan', () => {
      expect(resolve('in_progress', 'reset', { hasApprovedPlan: true })).toEqual({
        ok: true,
        status: 'ready',
      });
      expect(resolve('interrupted', 'reset', { hasApprovedPlan: false })).toEqual({
        ok: true,
        status: 'backlog',
      });
    });
  });

  describe('illegal pairs', () => {
    it('rejects finishing a feature that has not started', () => {
      const result = resolve('backlog', 'finish');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('finish');
    });

    it('rejects starting a verified feature', () => {
      const result = resolve('verified', 'start');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('start');
    });

    it('rejects failing a waiting_approval feature', () => {
      const result = resolve('waiting_approval', 'fail');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('fail');
    });

    it('rejects interrupting a backlog feature', () => {
      const result = resolve('backlog', 'interrupt');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('interrupt');
    });

    it('rejects resuming a feature that is not interrupted', () => {
      const result = resolve('in_progress', 'resume');
      expect(result.ok).toBe(false);
    });

    it('rejects enterStep without a stepId', () => {
      const result = resolve('in_progress', 'enterStep', {});
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('stepId');
    });

    it('rejects resetting a terminal feature', () => {
      const result = resolve('verified', 'reset');
      expect(result.ok).toBe(false);
    });

    it('rejects any transition from an unknown current status', () => {
      const result = resolve(undefined, 'start');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('no current status');
    });
  });
});

describe('status predicates', () => {
  const ALL_STATUSES: FeatureStatus[] = [
    'backlog',
    'ready',
    'in_progress',
    'interrupted',
    'waiting_approval',
    'verified',
    'completed',
    'merge_conflict',
    'pipeline_code_review',
  ];

  describe('isRunnableFeatureStatus', () => {
    const runnable = new Set<FeatureStatus>([
      'backlog',
      'ready',
      'interrupted',
      'pipeline_code_review',
    ]);

    it('classifies every status in the vocabulary', () => {
      for (const status of ALL_STATUSES) {
        expect(isRunnableFeatureStatus(status)).toBe(runnable.has(status));
      }
    });

    it('classifies any pipeline step as runnable', () => {
      expect(isRunnableFeatureStatus('pipeline_deploy')).toBe(true);
      expect(isRunnableFeatureStatus('pipeline_step_abc_123')).toBe(true);
    });

    it('treats null and undefined as not runnable', () => {
      expect(isRunnableFeatureStatus(null)).toBe(false);
      expect(isRunnableFeatureStatus(undefined)).toBe(false);
    });
  });

  describe('isInProgressFeatureStatus', () => {
    const inProgress = new Set<FeatureStatus>(['in_progress', 'pipeline_code_review']);

    it('classifies every status in the vocabulary', () => {
      for (const status of ALL_STATUSES) {
        expect(isInProgressFeatureStatus(status)).toBe(inProgress.has(status));
      }
    });

    it('classifies any pipeline step as in progress', () => {
      expect(isInProgressFeatureStatus('pipeline_lint')).toBe(true);
    });

    it('treats null and undefined as not in progress', () => {
      expect(isInProgressFeatureStatus(null)).toBe(false);
      expect(isInProgressFeatureStatus(undefined)).toBe(false);
    });
  });

  describe('isDoneFeatureStatus', () => {
    const done = new Set<FeatureStatus>(['verified', 'completed']);

    it('classifies every status in the vocabulary', () => {
      for (const status of ALL_STATUSES) {
        expect(isDoneFeatureStatus(status)).toBe(done.has(status));
      }
    });

    it('does not treat waiting_approval as done', () => {
      expect(isDoneFeatureStatus('waiting_approval')).toBe(false);
    });

    it('treats null and undefined as not done', () => {
      expect(isDoneFeatureStatus(null)).toBe(false);
      expect(isDoneFeatureStatus(undefined)).toBe(false);
    });
  });
});
