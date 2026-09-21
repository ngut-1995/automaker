import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { FeatureStateManager } from '@/services/feature-state-manager.js';
import { FeatureRecord } from '@/services/feature-record.js';
import { TypedEventBus } from '@/services/typed-event-bus.js';
import type { Feature } from '@automaker/types';

const PIPELINE_SUMMARY_SEPARATOR = '\n\n---\n\n';
const PIPELINE_SUMMARY_HEADER_PREFIX = '### ';
import type { EventEmitter } from '@/lib/events.js';
import { FeatureLoader } from '@/services/feature-loader.js';
import * as secureFs from '@/lib/secure-fs.js';
import { atomicWriteJson, readJsonWithRecovery, logRecoveryWarning } from '@automaker/utils';
import { getFeatureDir, getFeaturesDir } from '@automaker/platform';
import { getNotificationService } from '@/services/notification-service.js';
import { pipelineService } from '@/services/pipeline-service.js';

/**
 * Helper to normalize paths for cross-platform test compatibility.
 * Uses path.normalize (not path.resolve) to match path.join behavior in production code.
 */
const normalizePath = (p: string): string => path.normalize(p);

// Mock dependencies
vi.mock('@/lib/secure-fs.js', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock('@automaker/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@automaker/utils')>();
  return {
    ...actual,
    atomicWriteJson: vi.fn(),
    readJsonWithRecovery: vi.fn(),
    logRecoveryWarning: vi.fn(),
  };
});

vi.mock('@automaker/platform', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@automaker/platform')>();
  return {
    ...actual,
    getFeatureDir: vi.fn(),
    getFeaturesDir: vi.fn(),
  };
});

vi.mock('@/services/notification-service.js', () => ({
  getNotificationService: vi.fn(() => ({
    createNotification: vi.fn(),
  })),
}));

vi.mock('@/services/pipeline-service.js', () => ({
  pipelineService: {
    getStepIdFromStatus: vi.fn((status: string) => {
      if (status.startsWith('pipeline_')) return status.replace('pipeline_', '');
      return null;
    }),
    getStep: vi.fn(),
  },
}));

describe('FeatureStateManager', () => {
  let manager: FeatureStateManager;
  let mockEvents: EventEmitter;
  let mockFeatureLoader: FeatureLoader;
  let mockFeatureRecord: { transition: Mock };

  const lastUpdate = (): Partial<Feature> => {
    const calls = (mockFeatureLoader.update as Mock).mock.calls;
    return calls[calls.length - 1]?.[2] as Partial<Feature>;
  };

  const mockFeature: Feature = {
    id: 'feature-123',
    name: 'Test Feature',
    title: 'Test Feature Title',
    description: 'A test feature',
    status: 'backlog',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockEvents = {
      emit: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    };

    mockFeatureLoader = {
      syncFeatureToAppSpec: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as FeatureLoader;

    mockFeatureRecord = { transition: vi.fn() };

    manager = new FeatureStateManager(mockEvents, mockFeatureLoader, mockFeatureRecord);

    // Default mocks
    (getFeatureDir as Mock).mockReturnValue('/project/.automaker/features/feature-123');
    (getFeaturesDir as Mock).mockReturnValue('/project/.automaker/features');
  });

  describe('loadFeature', () => {
    it('should load feature from disk', async () => {
      (readJsonWithRecovery as Mock).mockResolvedValue({ data: mockFeature, recovered: false });

      const feature = await manager.loadFeature('/project', 'feature-123');

      expect(feature).toEqual(mockFeature);
      expect(getFeatureDir).toHaveBeenCalledWith('/project', 'feature-123');
      expect(readJsonWithRecovery).toHaveBeenCalledWith(
        normalizePath('/project/.automaker/features/feature-123/feature.json'),
        null,
        expect.objectContaining({ autoRestore: true })
      );
    });

    it('should return null if feature does not exist', async () => {
      (readJsonWithRecovery as Mock).mockRejectedValue(new Error('ENOENT'));

      const feature = await manager.loadFeature('/project', 'non-existent');

      expect(feature).toBeNull();
    });

    it('should return null if feature JSON is invalid', async () => {
      // readJsonWithRecovery returns null as the default value when JSON is invalid
      (readJsonWithRecovery as Mock).mockResolvedValue({ data: null, recovered: false });

      const feature = await manager.loadFeature('/project', 'feature-123');

      expect(feature).toBeNull();
    });
  });

  describe('recovery transitions (real temp data dir)', () => {
    let dataDir: string;
    let realLoader: FeatureLoader;
    let realEvents: EventEmitter;
    let store: FeatureRecord;

    const featureJsonPath = (featureId: string): string =>
      path.join(dataDir, '.automaker', 'features', featureId, 'feature.json');

    const seedFeature = async (feature: Feature): Promise<void> => {
      const dir = path.join(dataDir, '.automaker', 'features', feature.id);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(featureJsonPath(feature.id), JSON.stringify(feature, null, 2), 'utf-8');
    };

    const readPersisted = async (featureId: string): Promise<Feature> =>
      JSON.parse(await fs.readFile(featureJsonPath(featureId), 'utf-8')) as Feature;

    const expectReaddirLists = (featureId: string): void => {
      (secureFs.readdir as Mock).mockResolvedValue([{ name: featureId, isDirectory: () => true }]);
    };

    beforeEach(async () => {
      const actualUtils =
        await vi.importActual<typeof import('@automaker/utils')>('@automaker/utils');
      const actualPlatform =
        await vi.importActual<typeof import('@automaker/platform')>('@automaker/platform');

      (atomicWriteJson as Mock).mockImplementation(
        actualUtils.atomicWriteJson as unknown as (...args: unknown[]) => Promise<void>
      );
      (readJsonWithRecovery as Mock).mockImplementation(
        actualUtils.readJsonWithRecovery as unknown as (...args: unknown[]) => Promise<unknown>
      );
      (logRecoveryWarning as Mock).mockImplementation(
        actualUtils.logRecoveryWarning as unknown as (...args: unknown[]) => void
      );
      (getFeatureDir as Mock).mockImplementation(actualPlatform.getFeatureDir);
      (getFeaturesDir as Mock).mockImplementation(actualPlatform.getFeaturesDir);

      dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsm-recovery-'));
      realLoader = new FeatureLoader();
      realEvents = {
        emit: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
      } as unknown as EventEmitter;
      store = new FeatureRecord(new TypedEventBus(realEvents), realLoader);
      manager = new FeatureStateManager(realEvents, realLoader, store);
    });

    afterEach(async () => {
      await fs.rm(dataDir, { recursive: true, force: true });
    });

    describe('markFeatureInterrupted', () => {
      it('transitions an in_progress feature to interrupted', async () => {
        const feature: Feature = { ...mockFeature, id: 'f-interrupt', status: 'in_progress' };
        await seedFeature(feature);

        await manager.markFeatureInterrupted(dataDir, feature.id, 'server shutdown');

        expect((await readPersisted(feature.id)).status).toBe('interrupted');
      });

      it('preserves a pipeline_* status without writing it', async () => {
        const feature: Feature = { ...mockFeature, id: 'f-pipeline', status: 'pipeline_testing' };
        await seedFeature(feature);

        await manager.markFeatureInterrupted(dataDir, feature.id, 'server shutdown');

        expect((await readPersisted(feature.id)).status).toBe('pipeline_testing');
      });

      it('does not throw when the feature does not exist', async () => {
        await expect(
          manager.markFeatureInterrupted(dataDir, 'missing-feature')
        ).resolves.not.toThrow();
      });
    });

    describe('reconciliation / reset', () => {
      it('resets in_progress with an approved plan to ready', async () => {
        const feature: Feature = {
          ...mockFeature,
          id: 'f-approved',
          status: 'in_progress',
          planSpec: { status: 'approved', version: 1, reviewedByUser: true },
        };
        await seedFeature(feature);
        expectReaddirLists(feature.id);

        await manager.resetStuckFeatures(dataDir);

        expect((await readPersisted(feature.id)).status).toBe('ready');
      });

      it('resets in_progress without an approved plan to backlog', async () => {
        const feature: Feature = { ...mockFeature, id: 'f-no-plan', status: 'in_progress' };
        await seedFeature(feature);
        expectReaddirLists(feature.id);

        await manager.resetStuckFeatures(dataDir);

        expect((await readPersisted(feature.id)).status).toBe('backlog');
      });

      it('applies the same rule to interrupted features through reconcileAllFeatureStates', async () => {
        const withPlan: Feature = {
          ...mockFeature,
          id: 'f-interrupted-approved',
          status: 'interrupted',
          planSpec: { status: 'approved', version: 1, reviewedByUser: true },
        };
        const withoutPlan: Feature = {
          ...mockFeature,
          id: 'f-interrupted-plain',
          status: 'interrupted',
        };
        await seedFeature(withPlan);
        await seedFeature(withoutPlan);
        (secureFs.readdir as Mock).mockResolvedValue([
          { name: withPlan.id, isDirectory: () => true },
          { name: withoutPlan.id, isDirectory: () => true },
        ]);

        const reconciled = await manager.reconcileAllFeatureStates(dataDir);

        expect(reconciled).toBe(2);
        expect((await readPersisted(withPlan.id)).status).toBe('ready');
        expect((await readPersisted(withoutPlan.id)).status).toBe('backlog');
      });

      it('preserves a pipeline_* status but persists planSpec and task resets through the loader', async () => {
        const feature: Feature = {
          ...mockFeature,
          id: 'f-pipeline-reset',
          status: 'pipeline_testing',
          planSpec: {
            status: 'generating',
            version: 1,
            reviewedByUser: false,
            currentTaskId: 'task-1',
            tasks: [{ id: 'task-1', title: 'Task 1', status: 'in_progress', description: '' }],
          },
        };
        await seedFeature(feature);
        expectReaddirLists(feature.id);

        await manager.resetStuckFeatures(dataDir);

        const persisted = await readPersisted(feature.id);
        expect(persisted.status).toBe('pipeline_testing');
        expect(persisted.planSpec?.status).toBe('pending');
        expect(persisted.planSpec?.tasks?.[0].status).toBe('pending');
        expect(persisted.planSpec?.currentTaskId).toBeUndefined();
      });

      it('persists a generating planSpec reset for a resting feature', async () => {
        const feature: Feature = {
          ...mockFeature,
          id: 'f-generating',
          status: 'backlog',
          planSpec: { status: 'generating', version: 1, reviewedByUser: false },
        };
        await seedFeature(feature);
        expectReaddirLists(feature.id);

        await manager.resetStuckFeatures(dataDir);

        const persisted = await readPersisted(feature.id);
        expect(persisted.status).toBe('backlog');
        expect(persisted.planSpec?.status).toBe('pending');
      });
    });
  });

  describe('resetStuckFeatures', () => {
    it('should skip non-directory entries', async () => {
      (secureFs.readdir as Mock).mockResolvedValue([
        { name: 'feature-123', isDirectory: () => true },
        { name: 'some-file.txt', isDirectory: () => false },
      ]);
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: mockFeature,
        recovered: false,
        source: 'main',
      });

      await manager.resetStuckFeatures('/project');

      // Should only process the directory
      expect(readJsonWithRecovery).toHaveBeenCalledTimes(1);
    });

    it('should handle features directory not existing', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      (secureFs.readdir as Mock).mockRejectedValue(error);

      // Should not throw
      await expect(manager.resetStuckFeatures('/project')).resolves.not.toThrow();
    });

    it('should not transition or persist a resting feature', async () => {
      const normalFeature: Feature = {
        ...mockFeature,
        status: 'completed',
        planSpec: { status: 'approved', version: 1, reviewedByUser: true },
      };

      (secureFs.readdir as Mock).mockResolvedValue([
        { name: 'feature-123', isDirectory: () => true },
      ]);
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: normalFeature,
        recovered: false,
        source: 'main',
      });

      await manager.resetStuckFeatures('/project');

      expect(mockFeatureRecord.transition).not.toHaveBeenCalled();
      expect(mockFeatureLoader.update).not.toHaveBeenCalled();
      expect(mockFeatureLoader.update).not.toHaveBeenCalled();
    });
  });

  describe('updateFeaturePlanSpec', () => {
    it('should update planSpec with partial updates', async () => {
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature },
        recovered: false,
        source: 'main',
      });

      await manager.updateFeaturePlanSpec('/project', 'feature-123', { status: 'approved' });

      const savedFeature = lastUpdate();
      expect(savedFeature.planSpec?.status).toBe('approved');
    });

    it('should initialize planSpec if not exists', async () => {
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, planSpec: undefined },
        recovered: false,
        source: 'main',
      });

      await manager.updateFeaturePlanSpec('/project', 'feature-123', { status: 'approved' });

      const savedFeature = lastUpdate();
      expect(savedFeature.planSpec).toBeDefined();
      expect(savedFeature.planSpec?.version).toBe(1);
    });

    it('should increment version when content changes', async () => {
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: {
          ...mockFeature,
          planSpec: {
            status: 'pending',
            version: 2,
            content: 'old content',
            reviewedByUser: false,
          },
        },
        recovered: false,
        source: 'main',
      });

      await manager.updateFeaturePlanSpec('/project', 'feature-123', { content: 'new content' });

      const savedFeature = lastUpdate();
      expect(savedFeature.planSpec?.version).toBe(3);
    });
  });

  describe('saveFeatureSummary', () => {
    it('should save summary and emit event', async () => {
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'This is the summary');

      // Verify persisted
      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe('This is the summary');

      // Verify event emitted AFTER persistence
      expect(mockEvents.emit).toHaveBeenCalledWith('auto-mode:event', {
        type: 'auto_mode_summary',
        featureId: 'feature-123',
        projectPath: '/project',
        summary: 'This is the summary',
      });
    });

    it('should handle feature not found', async () => {
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: null,
        recovered: true,
        source: 'default',
      });

      await expect(
        manager.saveFeatureSummary('/project', 'non-existent', 'Summary')
      ).resolves.not.toThrow();
      expect(mockFeatureLoader.update).not.toHaveBeenCalled();
      expect(mockEvents.emit).not.toHaveBeenCalled();
    });

    it('should accumulate summary with step header for pipeline features', async () => {
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Code Review', id: 'step1' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step1', summary: undefined },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'First step output');

      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Code Review\n\nFirst step output`
      );
    });

    it('should append subsequent pipeline step summaries with separator', async () => {
      const existingSummary = `${PIPELINE_SUMMARY_HEADER_PREFIX}Code Review\n\nFirst step output`;
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Testing', id: 'step2' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step2', summary: existingSummary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Second step output');

      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Code Review\n\nFirst step output${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Testing\n\nSecond step output`
      );
    });

    it('should normalize existing non-phase summary before appending pipeline step summary', async () => {
      const existingSummary = 'Implemented authentication and settings management.';
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Code Review', id: 'step1' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step1', summary: existingSummary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Reviewed and approved changes');

      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Implementation\n\nImplemented authentication and settings management.${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Code Review\n\nReviewed and approved changes`
      );
    });

    it('should use fallback step name when pipeline step not found', async () => {
      (pipelineService.getStep as Mock).mockResolvedValue(null);
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_unknown_step', summary: undefined },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Step output');

      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Unknown Step\n\nStep output`
      );
    });

    it('should overwrite summary for non-pipeline features', async () => {
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'in_progress', summary: 'Old summary' },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'New summary');

      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe('New summary');
    });

    it('should emit full accumulated summary for pipeline features', async () => {
      const existingSummary = '### Code Review\n\nFirst step output';
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Refinement', id: 'step2' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step2', summary: existingSummary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Refinement output');

      const expectedSummary =
        '### Code Review\n\nFirst step output\n\n---\n\n### Refinement\n\nRefinement output';
      expect(mockEvents.emit).toHaveBeenCalledWith('auto-mode:event', {
        type: 'auto_mode_summary',
        featureId: 'feature-123',
        projectPath: '/project',
        summary: expectedSummary,
      });
    });

    it('should skip accumulation for pipeline features when summary is empty', async () => {
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Testing', id: 'step1' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step1', summary: '' },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Test output');

      const savedFeature = lastUpdate();
      // Empty string is falsy, so should start fresh
      expect(savedFeature.summary).toBe('### Testing\n\nTest output');
    });

    it('should skip persistence when incoming summary is only whitespace', async () => {
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Testing', id: 'step1' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step1', summary: '### Existing\n\nValue' },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', '   \n\t  ');

      expect(mockFeatureLoader.update).not.toHaveBeenCalled();
      expect(mockEvents.emit).not.toHaveBeenCalled();
    });

    it('should accumulate three pipeline steps in chronological order', async () => {
      // Step 1: Code Review
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Code Review', id: 'step1' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step1', summary: undefined },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Review findings');
      const afterStep1 = lastUpdate();
      expect(afterStep1.summary).toBe('### Code Review\n\nReview findings');

      // Step 2: Testing (summary from step 1 exists)
      vi.clearAllMocks();
      (getFeatureDir as Mock).mockReturnValue('/project/.automaker/features/feature-123');
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Testing', id: 'step2' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step2', summary: afterStep1.summary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'All tests pass');
      const afterStep2 = lastUpdate();

      // Step 3: Refinement (summaries from steps 1+2 exist)
      vi.clearAllMocks();
      (getFeatureDir as Mock).mockReturnValue('/project/.automaker/features/feature-123');
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Refinement', id: 'step3' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step3', summary: afterStep2.summary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Code polished');
      const afterStep3 = lastUpdate();

      // Verify the full accumulated summary has all three steps in order
      expect(afterStep3.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Code Review\n\nReview findings${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Testing\n\nAll tests pass${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Refinement\n\nCode polished`
      );
    });

    it('should replace existing step summary if called again for the same step', async () => {
      const existingSummary = `${PIPELINE_SUMMARY_HEADER_PREFIX}Implementation\n\nInitial code${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Code Review\n\nFirst review attempt`;
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Code Review', id: 'step1' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step1', summary: existingSummary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary(
        '/project',
        'feature-123',
        'Second review attempt (success)'
      );

      const savedFeature = lastUpdate();
      // Should REPLACE "First review attempt" with "Second review attempt (success)"
      // and NOT append it as a new section
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Implementation\n\nInitial code${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Code Review\n\nSecond review attempt (success)`
      );
      // Ensure it didn't duplicate the separator or header
      expect(
        savedFeature.summary.match(new RegExp(PIPELINE_SUMMARY_HEADER_PREFIX + 'Code Review', 'g'))
          ?.length
      ).toBe(1);
      expect(
        savedFeature.summary.match(new RegExp(PIPELINE_SUMMARY_SEPARATOR.trim(), 'g'))?.length
      ).toBe(1);
    });

    it('should replace last step summary without trailing separator', async () => {
      // Test case: replacing the last step which has no separator after it
      const existingSummary = `${PIPELINE_SUMMARY_HEADER_PREFIX}Implementation\n\nInitial code${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Testing\n\nFirst test run`;
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Testing', id: 'step2' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step2', summary: existingSummary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'All tests pass');

      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Implementation\n\nInitial code${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Testing\n\nAll tests pass`
      );
    });

    it('should replace first step summary with separator after it', async () => {
      // Test case: replacing the first step which has a separator after it
      const existingSummary = `${PIPELINE_SUMMARY_HEADER_PREFIX}Implementation\n\nFirst attempt${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Testing\n\nAll tests pass`;
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Implementation', id: 'step1' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step1', summary: existingSummary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Second attempt');

      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Implementation\n\nSecond attempt${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Testing\n\nAll tests pass`
      );
    });

    it('should not match step header appearing in body text, only at section boundaries', async () => {
      // Test case: body text contains "### Testing" which should NOT be matched
      // Only headers at actual section boundaries should be replaced
      const existingSummary = `${PIPELINE_SUMMARY_HEADER_PREFIX}Implementation\n\nThis step covers the Testing module.\n\n### Testing\n\nThe above is just markdown in body, not a section header.${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Testing\n\nReal test section`;
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Testing', id: 'step2' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step2', summary: existingSummary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Updated test results');

      const savedFeature = lastUpdate();
      // The section replacement should only replace the actual Testing section at the boundary
      // NOT the "### Testing" that appears in the body text
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Implementation\n\nThis step covers the Testing module.\n\n### Testing\n\nThe above is just markdown in body, not a section header.${PIPELINE_SUMMARY_SEPARATOR}${PIPELINE_SUMMARY_HEADER_PREFIX}Testing\n\nUpdated test results`
      );
    });

    it('should handle step name with special regex characters safely', async () => {
      // Test case: step name contains characters that would break regex
      const existingSummary = `${PIPELINE_SUMMARY_HEADER_PREFIX}Code (Review)\n\nFirst attempt`;
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Code (Review)', id: 'step1' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step1', summary: existingSummary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Second attempt');

      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Code (Review)\n\nSecond attempt`
      );
    });

    it('should handle step name with brackets safely', async () => {
      // Test case: step name contains array-like syntax [0]
      const existingSummary = `${PIPELINE_SUMMARY_HEADER_PREFIX}Step [0]\n\nFirst attempt`;
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Step [0]', id: 'step1' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step1', summary: existingSummary },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Second attempt');

      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Step [0]\n\nSecond attempt`
      );
    });

    it('should handle pipelineService.getStepIdFromStatus throwing an error gracefully', async () => {
      (pipelineService.getStepIdFromStatus as Mock).mockImplementation(() => {
        throw new Error('Config not found');
      });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_my_step', summary: undefined },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Step output');

      const savedFeature = lastUpdate();
      // Should use fallback: capitalize each word in the status suffix
      expect(savedFeature.summary).toBe(`${PIPELINE_SUMMARY_HEADER_PREFIX}My Step\n\nStep output`);
    });

    it('should handle pipelineService.getStep throwing an error gracefully', async () => {
      (pipelineService.getStep as Mock).mockRejectedValue(new Error('Disk read error'));
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_code_review', summary: undefined },
        recovered: false,
        source: 'main',
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Step output');

      const savedFeature = lastUpdate();
      // Should use fallback: capitalize each word in the status suffix
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Code Review\n\nStep output`
      );
    });

    it('should handle summary content with markdown formatting', async () => {
      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Code Review', id: 'step1' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step1', summary: undefined },
        recovered: false,
        source: 'main',
      });

      const markdownSummary =
        '## Changes Made\n- Fixed **bug** in `parser.ts`\n- Added `validateInput()` function\n\n```typescript\nconst x = 1;\n```';

      await manager.saveFeatureSummary('/project', 'feature-123', markdownSummary);

      const savedFeature = lastUpdate();
      expect(savedFeature.summary).toBe(
        `${PIPELINE_SUMMARY_HEADER_PREFIX}Code Review\n\n${markdownSummary}`
      );
    });

    it('should persist before emitting event for pipeline summary accumulation', async () => {
      const callOrder: string[] = [];
      const existingSummary = '### Code Review\n\nFirst step output';

      (pipelineService.getStep as Mock).mockResolvedValue({ name: 'Testing', id: 'step2' });
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, status: 'pipeline_step2', summary: existingSummary },
        recovered: false,
        source: 'main',
      });
      (mockFeatureLoader.update as Mock).mockImplementation(async () => {
        callOrder.push('persist');
      });
      (mockEvents.emit as Mock).mockImplementation(() => {
        callOrder.push('emit');
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Test results');

      expect(callOrder).toEqual(['persist', 'emit']);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status and emit event', async () => {
      const featureWithTasks: Feature = {
        ...mockFeature,
        planSpec: {
          status: 'approved',
          version: 1,
          reviewedByUser: true,
          tasks: [
            { id: 'task-1', title: 'Task 1', status: 'pending', description: '' },
            { id: 'task-2', title: 'Task 2', status: 'pending', description: '' },
          ],
        },
      };

      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: featureWithTasks,
        recovered: false,
        source: 'main',
      });

      await manager.updateTaskStatus('/project', 'feature-123', 'task-1', 'completed');

      // Verify persisted
      const savedFeature = lastUpdate();
      expect(savedFeature.planSpec?.tasks?.[0].status).toBe('completed');

      // Verify event emitted
      expect(mockEvents.emit).toHaveBeenCalledWith('auto-mode:event', {
        type: 'auto_mode_task_status',
        featureId: 'feature-123',
        projectPath: '/project',
        taskId: 'task-1',
        status: 'completed',
        tasks: expect.any(Array),
      });
    });

    it('should update task status and summary and emit event', async () => {
      const featureWithTasks: Feature = {
        ...mockFeature,
        planSpec: {
          status: 'approved',
          version: 1,
          reviewedByUser: true,
          tasks: [{ id: 'task-1', title: 'Task 1', status: 'pending', description: '' }],
        },
      };

      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: featureWithTasks,
        recovered: false,
        source: 'main',
      });

      await manager.updateTaskStatus(
        '/project',
        'feature-123',
        'task-1',
        'completed',
        'Task finished successfully'
      );

      // Verify persisted
      const savedFeature = lastUpdate();
      expect(savedFeature.planSpec?.tasks?.[0].status).toBe('completed');
      expect(savedFeature.planSpec?.tasks?.[0].summary).toBe('Task finished successfully');

      // Verify event emitted
      expect(mockEvents.emit).toHaveBeenCalledWith('auto-mode:event', {
        type: 'auto_mode_task_status',
        featureId: 'feature-123',
        projectPath: '/project',
        taskId: 'task-1',
        status: 'completed',
        summary: 'Task finished successfully',
        tasks: expect.any(Array),
      });
    });

    it('should handle task not found', async () => {
      const featureWithTasks: Feature = {
        ...mockFeature,
        planSpec: {
          status: 'approved',
          version: 1,
          reviewedByUser: true,
          tasks: [{ id: 'task-1', title: 'Task 1', status: 'pending', description: '' }],
        },
      };

      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: featureWithTasks,
        recovered: false,
        source: 'main',
      });

      await manager.updateTaskStatus('/project', 'feature-123', 'non-existent-task', 'completed');

      // Should not persist or emit if task not found
      expect(mockFeatureLoader.update).not.toHaveBeenCalled();
      expect(mockEvents.emit).not.toHaveBeenCalled();
    });

    it('should handle feature without tasks', async () => {
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature },
        recovered: false,
        source: 'main',
      });

      await expect(
        manager.updateTaskStatus('/project', 'feature-123', 'task-1', 'completed')
      ).resolves.not.toThrow();
      expect(mockFeatureLoader.update).not.toHaveBeenCalled();
    });
  });

  describe('persist BEFORE emit ordering', () => {
    it('saveFeatureSummary should persist before emitting event', async () => {
      const callOrder: string[] = [];

      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature },
        recovered: false,
        source: 'main',
      });
      (mockFeatureLoader.update as Mock).mockImplementation(async () => {
        callOrder.push('persist');
      });
      (mockEvents.emit as Mock).mockImplementation(() => {
        callOrder.push('emit');
      });

      await manager.saveFeatureSummary('/project', 'feature-123', 'Summary');

      expect(callOrder).toEqual(['persist', 'emit']);
    });

    it('updateTaskStatus should persist before emitting event', async () => {
      const callOrder: string[] = [];

      const featureWithTasks: Feature = {
        ...mockFeature,
        planSpec: {
          status: 'approved',
          version: 1,
          reviewedByUser: true,
          tasks: [{ id: 'task-1', title: 'Task 1', status: 'pending', description: '' }],
        },
      };

      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: featureWithTasks,
        recovered: false,
        source: 'main',
      });
      (mockFeatureLoader.update as Mock).mockImplementation(async () => {
        callOrder.push('persist');
      });
      (mockEvents.emit as Mock).mockImplementation(() => {
        callOrder.push('emit');
      });

      await manager.updateTaskStatus('/project', 'feature-123', 'task-1', 'completed');

      expect(callOrder).toEqual(['persist', 'emit']);
    });
  });

  describe('handleAutoModeEventError', () => {
    let subscribeCallback: (type: string, payload: unknown) => void;

    beforeEach(() => {
      // Get the subscribe callback from the mock - the callback passed TO subscribe is at index [0]
      // subscribe is called like: events.subscribe(callback), so callback is at mock.calls[0][0]
      const mockCalls = (mockEvents.subscribe as Mock).mock.calls;
      if (mockCalls.length > 0 && mockCalls[0].length > 0) {
        subscribeCallback = mockCalls[0][0] as typeof subscribeCallback;
      }
    });

    it('should ignore events with no type', async () => {
      const mockNotificationService = { createNotification: vi.fn() };
      (getNotificationService as Mock).mockReturnValue(mockNotificationService);

      await subscribeCallback('auto-mode:event', {});

      expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should ignore non-error events', async () => {
      const mockNotificationService = { createNotification: vi.fn() };
      (getNotificationService as Mock).mockReturnValue(mockNotificationService);

      await subscribeCallback('auto-mode:event', {
        type: 'auto_mode_feature_complete',
        passes: true,
        projectPath: '/project',
      });

      expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should create auto_mode_error notification with gesture name as title when no featureId', async () => {
      const mockNotificationService = { createNotification: vi.fn() };
      (getNotificationService as Mock).mockReturnValue(mockNotificationService);

      await subscribeCallback('auto-mode:event', {
        type: 'auto_mode_error',
        message: 'Something went wrong',
        projectPath: '/project',
      });

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auto_mode_error',
          title: 'Auto Mode Error',
          message: 'Something went wrong',
          projectPath: '/project',
        })
      );
    });

    it('should use error field instead of message when available', async () => {
      const mockNotificationService = { createNotification: vi.fn() };
      (getNotificationService as Mock).mockReturnValue(mockNotificationService);

      await subscribeCallback('auto-mode:event', {
        type: 'auto_mode_error',
        message: 'Some message',
        error: 'The actual error',
        projectPath: '/project',
      });

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auto_mode_error',
          message: 'The actual error',
        })
      );
    });

    it('should use feature title as notification title for feature error with featureId', async () => {
      const mockNotificationService = { createNotification: vi.fn() };
      (getNotificationService as Mock).mockReturnValue(mockNotificationService);
      (readJsonWithRecovery as Mock).mockResolvedValue({
        data: { ...mockFeature, title: 'Login Page Feature' },
        recovered: false,
        source: 'main',
      });

      subscribeCallback('auto-mode:event', {
        type: 'auto_mode_feature_complete',
        passes: false,
        featureId: 'feature-123',
        error: 'Build failed',
        projectPath: '/project',
      });

      // Wait for async handleAutoModeEventError to complete
      await vi.waitFor(() => {
        expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'feature_error',
            title: 'Login Page Feature',
            message: 'Feature Failed: Build failed',
            featureId: 'feature-123',
          })
        );
      });
    });

    it('should ignore auto_mode_feature_complete without passes=false', async () => {
      const mockNotificationService = { createNotification: vi.fn() };
      (getNotificationService as Mock).mockReturnValue(mockNotificationService);

      await subscribeCallback('auto-mode:event', {
        type: 'auto_mode_feature_complete',
        passes: true,
        projectPath: '/project',
      });

      expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should handle missing projectPath gracefully', async () => {
      const mockNotificationService = { createNotification: vi.fn() };
      (getNotificationService as Mock).mockReturnValue(mockNotificationService);

      await subscribeCallback('auto-mode:event', {
        type: 'auto_mode_error',
        message: 'Error occurred',
      });

      expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should handle notification service failures gracefully', async () => {
      (getNotificationService as Mock).mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      // Should not throw - the callback returns void so we just call it and wait for async work
      subscribeCallback('auto-mode:event', {
        type: 'auto_mode_error',
        message: 'Error',
        projectPath: '/project',
      });

      // Give async handleAutoModeEventError time to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  describe('destroy', () => {
    it('should unsubscribe from event subscription', () => {
      const unsubscribeFn = vi.fn();
      (mockEvents.subscribe as Mock).mockReturnValue(unsubscribeFn);

      // Create a new manager to get a fresh subscription
      const newManager = new FeatureStateManager(mockEvents, mockFeatureLoader, mockFeatureRecord);

      // Call destroy
      newManager.destroy();

      // Verify unsubscribe was called
      expect(unsubscribeFn).toHaveBeenCalled();
    });

    it('should handle destroy being called multiple times', () => {
      const unsubscribeFn = vi.fn();
      (mockEvents.subscribe as Mock).mockReturnValue(unsubscribeFn);

      const newManager = new FeatureStateManager(mockEvents, mockFeatureLoader, mockFeatureRecord);

      // Call destroy multiple times
      newManager.destroy();
      newManager.destroy();

      // Should only unsubscribe once
      expect(unsubscribeFn).toHaveBeenCalledTimes(1);
    });
  });
});
