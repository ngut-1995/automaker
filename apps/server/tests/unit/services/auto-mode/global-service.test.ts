import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Feature } from '@automaker/types';
import { GlobalAutoModeService } from '@/services/auto-mode/global-service.js';
import { FeatureLoader } from '@/services/feature-loader.js';
import { createEventEmitter, type EventEmitter } from '@/lib/events.js';

const FEATURE_A = 'feature-a';
const FEATURE_B = 'feature-b';

const makeFeature = (id: string, status: Feature['status']): Feature => ({
  id,
  name: `Feature ${id}`,
  title: `Feature ${id}`,
  category: 'test',
  description: `Description for ${id}`,
  status,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
});

describe('GlobalAutoModeService', () => {
  let rootDir: string;
  let projectA: string;
  let projectB: string;
  let events: EventEmitter;

  const featureJsonPath = (projectPath: string, featureId: string): string =>
    path.join(projectPath, '.automaker', 'features', featureId, 'feature.json');

  const seedFeature = async (projectPath: string, feature: Feature): Promise<void> => {
    const dir = path.join(projectPath, '.automaker', 'features', feature.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(featureJsonPath(projectPath, feature.id), JSON.stringify(feature), 'utf-8');
  };

  const readStatus = async (projectPath: string, featureId: string): Promise<Feature['status']> => {
    const raw = await fs.readFile(featureJsonPath(projectPath, featureId), 'utf-8');
    return (JSON.parse(raw) as Feature).status;
  };

  beforeEach(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'global-auto-mode-'));
    projectA = path.join(rootDir, 'project-a');
    projectB = path.join(rootDir, 'project-b');
    await fs.mkdir(projectA, { recursive: true });
    await fs.mkdir(projectB, { recursive: true });
    events = createEventEmitter();
  });

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  describe('getRunningAgents', () => {
    it('reports running agents from every project, not just one', async () => {
      const loader = {
        get: vi.fn(async (projectPath: string, featureId: string) => {
          void projectPath;
          return makeFeature(featureId, 'in_progress');
        }),
      } as unknown as FeatureLoader;
      const service = new GlobalAutoModeService(events, null, loader);
      const { concurrencyManager } = service.getSharedServices();

      concurrencyManager.acquire({ featureId: FEATURE_A, projectPath: projectA, isAutoMode: true });
      concurrencyManager.acquire({
        featureId: FEATURE_B,
        projectPath: projectB,
        isAutoMode: false,
      });

      const agents = await service.getRunningAgents();
      const byId = new Map(agents.map((agent) => [agent.featureId, agent]));

      expect(agents).toHaveLength(2);
      expect(byId.get(FEATURE_A)).toMatchObject({
        projectPath: projectA,
        projectName: 'project-a',
        isAutoMode: true,
      });
      expect(byId.get(FEATURE_B)).toMatchObject({
        projectPath: projectB,
        projectName: 'project-b',
        isAutoMode: false,
      });
    });
  });

  describe('markAllRunningFeaturesInterrupted', () => {
    it('marks running features in every project interrupted (the graceful-shutdown path)', async () => {
      const loader = new FeatureLoader();
      const service = new GlobalAutoModeService(events, null, loader);
      await seedFeature(projectA, makeFeature(FEATURE_A, 'in_progress'));
      await seedFeature(projectB, makeFeature(FEATURE_B, 'in_progress'));
      const { concurrencyManager } = service.getSharedServices();

      concurrencyManager.acquire({ featureId: FEATURE_A, projectPath: projectA, isAutoMode: true });
      concurrencyManager.acquire({ featureId: FEATURE_B, projectPath: projectB, isAutoMode: true });

      await service.markAllRunningFeaturesInterrupted('SIGTERM signal received');

      expect(await readStatus(projectA, FEATURE_A)).toBe('interrupted');
      expect(await readStatus(projectB, FEATURE_B)).toBe('interrupted');
    });
  });
});
