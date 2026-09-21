import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Feature } from '@automaker/types';
import { FeatureLoader } from '@/services/feature-loader.js';
import { FeatureRecord } from '@/services/feature-record.js';
import { TypedEventBus } from '@/services/typed-event-bus.js';
import { createEventEmitter } from '@/lib/events.js';
import { AutoModeServiceFacade } from '@/services/auto-mode/facade.js';
import { createOrphanedResolveHandler } from '@/routes/features/routes/orphaned.js';
import { createMockExpressContext } from '../../utils/mocks.js';

describe('orphaned feature resolution', () => {
  let projectPath: string;
  let featureLoader: FeatureLoader;
  let featureRecord: FeatureRecord;

  const featureJsonPath = (featureId: string): string =>
    path.join(projectPath, '.automaker', 'features', featureId, 'feature.json');

  const readPersisted = async (featureId: string): Promise<Feature> => {
    const content = await fs.readFile(featureJsonPath(featureId), 'utf-8');
    return JSON.parse(content) as Feature;
  };

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'orphaned-route-'));
    featureLoader = new FeatureLoader();
    featureRecord = new FeatureRecord(new TypedEventBus(createEventEmitter()), featureLoader);
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it('returns a resolved orphan to the runnable set through the record transition', async () => {
    const feature = await featureLoader.create(projectPath, {
      title: 'Orphaned Feature',
      category: 'test',
      description: 'The branch it pointed at no longer exists',
      status: 'in_progress',
      branchName: 'missing-branch-xyz',
    });

    const { req, res } = createMockExpressContext();
    req.body = {
      projectPath,
      featureId: feature.id,
      action: 'move-to-branch',
      targetBranch: null,
    };

    const handler = createOrphanedResolveHandler(featureLoader, featureRecord);
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: feature.id, success: true, action: 'moved' })
    );

    const persisted = await readPersisted(feature.id);
    expect(persisted.status).toBe('backlog');
    expect(persisted.branchName).toBeNull();
    expect(AutoModeServiceFacade.isFeatureEligibleForAutoMode(persisted, null, null)).toBe(true);
  });

  it('does not move an orphan when the shared record is unavailable', async () => {
    const feature = await featureLoader.create(projectPath, {
      title: 'Orphaned Feature',
      category: 'test',
      description: 'No record injected',
      status: 'in_progress',
      branchName: 'missing-branch-xyz',
    });

    const { req, res } = createMockExpressContext();
    req.body = {
      projectPath,
      featureId: feature.id,
      action: 'move-to-branch',
      targetBranch: null,
    };

    const handler = createOrphanedResolveHandler(featureLoader);
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(vi.mocked(res.json).mock.calls[0][0]).toMatchObject({ success: false });
    expect((await readPersisted(feature.id)).status).toBe('in_progress');
  });
});
