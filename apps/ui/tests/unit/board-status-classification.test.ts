/**
 * The board and the auto-mode loop must classify a Feature's status the same way.
 *
 * Both sides now read the shared predicates from `@automaker/types`; this test is
 * the guard that stops either one from growing a divergent private status set.
 * The only intentional difference is `merge_conflict`, which the board shows as a
 * manual-only backlog card while auto-mode refuses to pick it up.
 */

import { describe, it, expect } from 'vitest';
import {
  isRunnableFeatureStatus,
  isInProgressFeatureStatus,
  isDoneFeatureStatus,
  isFeatureStatus,
  isPipelineStatus,
  STATIC_FEATURE_STATUSES,
} from '@automaker/types';
import type { FeatureStatus } from '@automaker/types';
import { isBacklogLikeStatus } from '../../src/components/views/board-view/constants';

const ALL_STATUSES: FeatureStatus[] = [...STATIC_FEATURE_STATUSES, 'pipeline_code_review'];

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

  it('keeps the shared predicates mutually consistent for every status', () => {
    for (const status of ALL_STATUSES) {
      const inProgress = isInProgressFeatureStatus(status);
      const done = isDoneFeatureStatus(status);
      const backlogLike = isBacklogLikeStatus(status);

      expect(done && inProgress).toBe(false);
      expect(done && backlogLike).toBe(false);
      expect(backlogLike && isPipelineStatus(status)).toBe(false);
      if (isPipelineStatus(status)) {
        expect(inProgress).toBe(true);
        expect(done).toBe(false);
        expect(backlogLike).toBe(false);
      }
    }
  });

  it('treats done statuses as completed + verified and nothing else', () => {
    for (const status of ALL_STATUSES) {
      expect(isDoneFeatureStatus(status)).toBe(status === 'completed' || status === 'verified');
    }
  });

  describe('shared vocabulary', () => {
    it('enumerates every concrete status at runtime', () => {
      expect(STATIC_FEATURE_STATUSES).toEqual([
        'backlog',
        'ready',
        'in_progress',
        'interrupted',
        'waiting_approval',
        'verified',
        'completed',
        'merge_conflict',
      ]);
    });

    it('accepts every canonical status and any well-formed pipeline status', () => {
      for (const status of ALL_STATUSES) {
        expect(isFeatureStatus(status)).toBe(true);
      }
    });

    it('rejects unknown values and malformed pipeline statuses', () => {
      expect(isFeatureStatus('archived')).toBe(false);
      expect(isFeatureStatus('pipeline_')).toBe(false);
      expect(isFeatureStatus(null)).toBe(false);
      expect(isFeatureStatus(42)).toBe(false);
    });

    it('classifies a hypothetical new status as unknown until the shared type grows it', () => {
      const newStatus = 'archived' as FeatureStatus;

      expect(STATIC_FEATURE_STATUSES).not.toContain(newStatus);
      expect(isFeatureStatus(newStatus)).toBe(false);
      expect(isRunnableFeatureStatus(newStatus)).toBe(false);
      expect(isInProgressFeatureStatus(newStatus)).toBe(false);
      expect(isDoneFeatureStatus(newStatus)).toBe(false);
      expect(isBacklogLikeStatus(newStatus)).toBe(false);
    });
  });
});
