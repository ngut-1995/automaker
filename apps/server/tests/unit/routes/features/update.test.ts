import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { FeatureLoader } from '@/services/feature-loader.js';
import { FeatureRecord } from '@/services/feature-record.js';
import { TypedEventBus } from '@/services/typed-event-bus.js';
import { createEventEmitter, type EventEmitter } from '@/lib/events.js';
import { createUpdateHandler } from '@/routes/features/routes/update.js';

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

describe('features update handler', () => {
  let projectPath: string;
  let featureId: string;
  let loader: FeatureLoader;
  let record: FeatureRecord;
  let events: EventEmitter;

  const featureJsonPath = (): string =>
    path.join(projectPath, '.automaker', 'features', featureId, 'feature.json');

  const readPersisted = async (): Promise<{ status?: string }> =>
    JSON.parse(await fs.readFile(featureJsonPath(), 'utf-8')) as { status?: string };

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'feature-update-route-'));
    loader = new FeatureLoader();
    events = createEventEmitter();
    record = new FeatureRecord(new TypedEventBus(events), loader);
    vi.spyOn(loader, 'syncFeatureToAppSpec').mockResolvedValue(true);

    const feature = await record.create(projectPath, {
      title: 'Manual verify',
      category: 'test',
      description: 'A feature to verify from the route',
      status: 'in_progress',
    });
    featureId = feature.id;
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it('performs a status change to verified through the record exactly once', async () => {
    const transitionSpy = vi.spyOn(record, 'transition');
    const updateSpy = vi.spyOn(loader, 'update');
    const handler = createUpdateHandler(loader, events, record);
    const res = createMockRes();

    await handler(
      { body: { projectPath, featureId, updates: { status: 'verified' } } } as never,
      res as never
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      feature: expect.objectContaining({ status: 'verified' }),
    });
    expect(transitionSpy).toHaveBeenCalledTimes(1);
    expect(transitionSpy).toHaveBeenCalledWith(projectPath, featureId, 'finish', {
      outcome: 'verified',
    });
    expect(updateSpy).not.toHaveBeenCalled();
    expect((await readPersisted()).status).toBe('verified');
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'feature_verified', featureId })
    );
    expect(loader.syncFeatureToAppSpec).toHaveBeenCalledTimes(1);
  });

  it('does not notify or sync for a status change with no side effects', async () => {
    const handler = createUpdateHandler(loader, events, record);
    const res = createMockRes();

    await handler(
      { body: { projectPath, featureId, updates: { status: 'backlog' } } } as never,
      res as never
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      feature: expect.objectContaining({ status: 'backlog' }),
    });
    expect((await readPersisted()).status).toBe('backlog');
    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(loader.syncFeatureToAppSpec).not.toHaveBeenCalled();
  });
});
