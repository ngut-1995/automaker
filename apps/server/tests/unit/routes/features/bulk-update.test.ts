import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { FeatureLoader } from '@/services/feature-loader.js';
import { FeatureRecord } from '@/services/feature-record.js';
import { TypedEventBus } from '@/services/typed-event-bus.js';
import { createEventEmitter, type EventEmitter } from '@/lib/events.js';
import { createBulkUpdateHandler } from '@/routes/features/routes/bulk-update.js';

const { mockCreateNotification } = vi.hoisted(() => ({
  mockCreateNotification: vi.fn(),
}));

vi.mock('@/services/notification-service.js', () => ({
  getNotificationService: () => ({ createNotification: mockCreateNotification }),
}));

interface MockResponse {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

function createMockRes(): MockResponse {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('features bulk update handler', () => {
  let projectPath: string;
  let loader: FeatureLoader;
  let record: FeatureRecord;
  let events: EventEmitter;

  const featureJsonPath = (featureId: string): string =>
    path.join(projectPath, '.automaker', 'features', featureId, 'feature.json');

  const readPersistedStatus = async (featureId: string): Promise<string | undefined> => {
    const content = await fs.readFile(featureJsonPath(featureId), 'utf-8');
    return (JSON.parse(content) as { status?: string }).status;
  };

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'feature-bulk-update-'));
    loader = new FeatureLoader();
    events = createEventEmitter();
    record = new FeatureRecord(new TypedEventBus(events), loader);
    vi.spyOn(loader, 'syncFeatureToAppSpec').mockResolvedValue(true);
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it('routes a status change through the record', async () => {
    const first = await record.create(projectPath, {
      category: 'test',
      description: 'First',
      status: 'in_progress',
    });
    const second = await record.create(projectPath, {
      category: 'test',
      description: 'Second',
      status: 'in_progress',
    });
    const transitionSpy = vi.spyOn(record, 'transition');
    const handler = createBulkUpdateHandler(loader, record);
    const res = createMockRes();

    await handler(
      {
        body: {
          projectPath,
          featureIds: [first.id, second.id],
          updates: { status: 'verified' },
        },
      } as never,
      res as never
    );

    expect(transitionSpy).toHaveBeenCalledTimes(2);
    expect(transitionSpy).toHaveBeenCalledWith(projectPath, first.id, 'finish', {
      outcome: 'verified',
    });
    const payload = res.json.mock.calls[0][0] as {
      success: boolean;
      updatedCount: number;
      features: Array<{ status?: string }>;
    };
    expect(payload.success).toBe(true);
    expect(payload.updatedCount).toBe(2);
    expect(payload.features.map((feature) => feature.status)).toEqual(['verified', 'verified']);
    expect(await readPersistedStatus(first.id)).toBe('verified');
    expect(await readPersistedStatus(second.id)).toBe('verified');
  });

  it('applies a field-only update through the loader without touching the record', async () => {
    const feature = await record.create(projectPath, {
      category: 'test',
      description: 'Field only',
      status: 'backlog',
    });
    const transitionSpy = vi.spyOn(record, 'transition');
    const handler = createBulkUpdateHandler(loader, record);
    const res = createMockRes();

    await handler(
      {
        body: {
          projectPath,
          featureIds: [feature.id],
          updates: { title: 'Renamed' },
        },
      } as never,
      res as never
    );

    expect(transitionSpy).not.toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0] as {
      success: boolean;
      features: Array<{ title?: string; status?: string }>;
    };
    expect(payload.success).toBe(true);
    expect(payload.features[0].title).toBe('Renamed');
    expect(payload.features[0].status).toBe('backlog');
  });

  it('reports the record message and per-feature failure for an illegal pair', async () => {
    const feature = await record.create(projectPath, {
      category: 'test',
      description: 'Cannot finish before starting',
      status: 'backlog',
    });
    const handler = createBulkUpdateHandler(loader, record);
    const res = createMockRes();

    await handler(
      {
        body: {
          projectPath,
          featureIds: [feature.id],
          updates: { status: 'verified' },
        },
      } as never,
      res as never
    );

    const payload = res.json.mock.calls[0][0] as {
      success: boolean;
      updatedCount: number;
      failedCount: number;
      results: Array<{ featureId: string; success: boolean; error?: string }>;
    };
    expect(payload.success).toBe(false);
    expect(payload.updatedCount).toBe(0);
    expect(payload.failedCount).toBe(1);
    expect(payload.results[0].error).toMatch(/Illegal transition/);
    expect(payload.results[0].error).toMatch(/finish/);
    expect(await readPersistedStatus(feature.id)).toBe('backlog');
  });

  it('rejects an unsupported status with 400', async () => {
    const feature = await record.create(projectPath, {
      category: 'test',
      description: 'Unsupported status',
      status: 'backlog',
    });
    const handler = createBulkUpdateHandler(loader, record);
    const res = createMockRes();

    await handler(
      {
        body: {
          projectPath,
          featureIds: [feature.id],
          updates: { status: 'ready' },
        },
      } as never,
      res as never
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringMatching(/Unsupported status/),
      })
    );
  });
});
