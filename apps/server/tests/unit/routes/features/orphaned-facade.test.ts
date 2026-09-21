import { describe, it, expect, vi } from 'vitest';
import type { Feature } from '@automaker/types';
import type { AutoModeServiceFacade, FacadeProvider } from '@/services/auto-mode/index.js';
import { FeatureLoader } from '@/services/feature-loader.js';
import { createListHandler } from '@/routes/features/routes/list.js';
import { createOrphanedListHandler } from '@/routes/features/routes/orphaned.js';
import { createMockExpressContext } from '../../../utils/mocks.js';

const PROJECT_PATH = '/project';

const makeFeature = (id: string): Feature => ({
  id,
  name: `Feature ${id}`,
  title: `Feature ${id}`,
  category: 'test',
  description: `Description for ${id}`,
  status: 'in_progress',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
});

function makeFacade(overrides: Record<string, unknown> = {}): AutoModeServiceFacade {
  return overrides as unknown as AutoModeServiceFacade;
}

describe('features orphaned handlers use the facade provider', () => {
  it('list handler detects orphans through getFacade(projectPath)', async () => {
    const features = [makeFeature('feature-a')];
    const loader = { getAll: vi.fn().mockResolvedValue(features) } as unknown as FeatureLoader;
    const detectOrphanedFeatures = vi.fn().mockResolvedValue([]);
    const getFacade = vi.fn(() =>
      makeFacade({ detectOrphanedFeatures })
    ) as unknown as FacadeProvider;
    const { req, res } = createMockExpressContext();
    req.body = { projectPath: PROJECT_PATH };

    await createListHandler(loader, getFacade)(req, res);

    expect(getFacade).toHaveBeenCalledWith(PROJECT_PATH);
    expect(detectOrphanedFeatures).toHaveBeenCalledWith(features);
    expect(res.json).toHaveBeenCalledWith({ success: true, features });
  });

  it('orphaned list handler detects orphans through getFacade(projectPath)', async () => {
    const orphanedFeatures = [{ feature: makeFeature('feature-a'), missingBranch: 'gone' }];
    const detectOrphanedFeatures = vi.fn().mockResolvedValue(orphanedFeatures);
    const getFacade = vi.fn(() =>
      makeFacade({ detectOrphanedFeatures })
    ) as unknown as FacadeProvider;
    const { req, res } = createMockExpressContext();
    req.body = { projectPath: PROJECT_PATH };

    await createOrphanedListHandler({} as FeatureLoader, getFacade)(req, res);

    expect(getFacade).toHaveBeenCalledWith(PROJECT_PATH);
    expect(detectOrphanedFeatures).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith({ success: true, orphanedFeatures });
  });

  it('orphaned list handler still returns 500 when no facade provider is given', async () => {
    const { req, res } = createMockExpressContext();
    req.body = { projectPath: PROJECT_PATH };

    await createOrphanedListHandler({} as FeatureLoader)(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Auto-mode service not available',
    });
  });
});
