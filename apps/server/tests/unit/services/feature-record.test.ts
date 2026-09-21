import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Feature } from '@automaker/types';
import { FeatureRecord, IllegalTransitionError } from '@/services/feature-record.js';
import { TypedEventBus } from '@/services/typed-event-bus.js';
import { createEventEmitter, type EventEmitter } from '@/lib/events.js';

interface EmittedEvent {
  type?: string;
  featureId?: string;
  status?: string;
}

describe('FeatureRecord', () => {
  let projectPath: string;
  let events: EventEmitter;
  let emitted: EmittedEvent[];
  let record: FeatureRecord;

  const featureJsonPath = (featureId: string): string =>
    path.join(projectPath, '.automaker', 'features', featureId, 'feature.json');

  const readPersisted = async (featureId: string): Promise<Feature> => {
    const content = await fs.readFile(featureJsonPath(featureId), 'utf-8');
    return JSON.parse(content) as Feature;
  };

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'feature-record-'));
    emitted = [];
    events = createEventEmitter();
    events.subscribe((type, payload) => {
      if (type === 'auto-mode:event') {
        emitted.push(payload as EmittedEvent);
      }
    });
    record = new FeatureRecord(new TypedEventBus(events));
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it('drives a feature from backlog through start to finish', async () => {
    const feature = await record.create(projectPath, {
      title: 'Lifecycle Feature',
      category: 'test',
      description: 'A feature that travels the path',
      status: 'backlog',
    });

    const started = await record.transition(projectPath, feature.id, 'start');
    expect(started.changed).toBe(true);
    expect(started.feature.status).toBe('in_progress');

    const finished = await record.transition(projectPath, feature.id, 'finish', {
      outcome: 'verified',
    });
    expect(finished.changed).toBe(true);
    expect(finished.feature.status).toBe('verified');

    const persisted = await readPersisted(feature.id);
    expect(persisted.status).toBe('verified');
    expect(persisted.updatedAt).toBeDefined();

    const statusEvents = emitted
      .filter((event) => event.type === 'feature_status_changed')
      .map((event) => event.status);
    expect(statusEvents).toEqual(['in_progress', 'verified']);
  });

  it('is a no-op when the resolved target equals the current status', async () => {
    const feature = await record.create(projectPath, {
      category: 'test',
      description: 'Idempotent start',
      status: 'in_progress',
    });

    const result = await record.transition(projectPath, feature.id, 'start');

    expect(result.changed).toBe(false);
    expect(emitted).toEqual([]);
  });

  it('sets justFinishedAt on waiting_approval and clears it afterwards', async () => {
    const feature = await record.create(projectPath, {
      category: 'test',
      description: 'Review flow',
      status: 'in_progress',
    });

    await record.transition(projectPath, feature.id, 'finish', { outcome: 'waiting_approval' });
    expect((await readPersisted(feature.id)).justFinishedAt).toBeDefined();

    await record.transition(projectPath, feature.id, 'finish', { outcome: 'verified' });
    expect((await readPersisted(feature.id)).justFinishedAt).toBeUndefined();
  });

  it('rejects an illegal transition with the pair named', async () => {
    const feature = await record.create(projectPath, {
      category: 'test',
      description: 'Cannot finish before starting',
      status: 'backlog',
    });

    await expect(record.transition(projectPath, feature.id, 'finish')).rejects.toBeInstanceOf(
      IllegalTransitionError
    );

    await expect(record.transition(projectPath, feature.id, 'finish')).rejects.toThrow(/finish/);

    const persisted = await readPersisted(feature.id);
    expect(persisted.status).toBe('backlog');
  });

  it('serializes concurrent transitions so neither loses an update', async () => {
    const feature = await record.create(projectPath, {
      category: 'test',
      description: 'Concurrency guard',
      status: 'in_progress',
    });

    const results = await Promise.allSettled([
      record.transition(projectPath, feature.id, 'interrupt'),
      record.transition(projectPath, feature.id, 'finish', { outcome: 'verified' }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(IllegalTransitionError);

    const winner = (fulfilled[0] as PromiseFulfilledResult<{ feature: Feature }>).value.feature;
    expect((await readPersisted(feature.id)).status).toBe(winner.status);
  });

  it('lists features in a project', async () => {
    const first = await record.create(projectPath, {
      id: 'feature-1000-aaa',
      category: 'test',
      description: 'First',
    });
    const second = await record.create(projectPath, {
      id: 'feature-2000-bbb',
      category: 'test',
      description: 'Second',
    });

    const features = await record.list(projectPath);

    expect(features.map((f) => f.id)).toEqual([first.id, second.id]);
  });
});
