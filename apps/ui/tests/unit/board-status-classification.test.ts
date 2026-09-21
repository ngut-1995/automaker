/**
 * The board and the auto-mode loop must classify a Feature's status the same way.
 *
 * Both sides now read the shared predicates from `@automaker/types`; this test is
 * the guard that stops either one from growing a divergent private status set.
 * The only intentional difference is `merge_conflict`, which the board shows as a
 * manual-only backlog card while auto-mode refuses to pick it up.
 */

import { describe, it, expect } from 'vitest';
import { isRunnableFeatureStatus, isPipelineStatus } from '@automaker/types';
import type { FeatureStatus } from '@automaker/types';
import { isBacklogLikeStatus } from '../../src/components/views/board-view/constants';

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

describe('board and auto-loop classification', () => {
  it('agree on the auto-mode-runnable predicate for every non-pipeline, non-manual status', () => {
    for (const status of ALL_STATUSES) {
      if (isPipelineStatus(status) || status === 'merge_conflict') continue;
      expect(isBacklogLikeStatus(status)).toBe(isRunnableFeatureStatus(status));
    }
  });

  it('agree that every pipeline status is runnable and lives outside the backlog lane', () => {
    for (const status of ALL_STATUSES.filter(isPipelineStatus)) {
      expect(isRunnableFeatureStatus(status)).toBe(true);
      expect(isBacklogLikeStatus(status)).toBe(false);
    }
  });

  it('cover the manual-only merge_conflict delta explicitly', () => {
    expect(isBacklogLikeStatus('merge_conflict')).toBe(true);
    expect(isRunnableFeatureStatus('merge_conflict')).toBe(false);
  });

  it('agree that finished statuses are neither runnable nor backlog-like', () => {
    for (const status of ['waiting_approval', 'verified', 'completed'] as FeatureStatus[]) {
      expect(isRunnableFeatureStatus(status)).toBe(false);
      expect(isBacklogLikeStatus(status)).toBe(false);
    }
  });
});
