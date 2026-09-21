import { describe, it, expect, vi } from 'vitest';
import { AutoModeFacadeCache } from '@/services/auto-mode/facade-cache.js';
import { AutoModeServiceFacade } from '@/services/auto-mode/facade.js';
import type { FacadeOptions } from '@/services/auto-mode/types.js';

/**
 * A stand-in for a real facade that carries the one thing the cache exists to
 * preserve: live auto-loop state. Cast to the facade type at the seam so the
 * cache can be exercised without git I/O or real coordinators.
 */
interface StatefulFakeFacade {
  projectPath: string;
  autoLoopState: { running: boolean; branch: string | null };
}

type CreateFn = (projectPath: string, options: FacadeOptions) => AutoModeServiceFacade;

const options = {} as FacadeOptions;

function statefulFactory() {
  return vi.fn<CreateFn>(
    (projectPath: string): AutoModeServiceFacade =>
      ({
        projectPath,
        autoLoopState: { running: false, branch: null },
      }) as unknown as AutoModeServiceFacade
  );
}

describe('AutoModeFacadeCache', () => {
  it('returns the same facade instance for the same project path', () => {
    const create = statefulFactory();
    const cache = new AutoModeFacadeCache(options, create);

    const first = cache.getFacade('/project-a');
    const second = cache.getFacade('/project-a');

    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('returns different facade instances for different project paths', () => {
    const create = statefulFactory();
    const cache = new AutoModeFacadeCache(options, create);

    const first = cache.getFacade('/project-a');
    const second = cache.getFacade('/project-b');

    expect(second).not.toBe(first);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('exposes auto-loop state set through one lookup on a later lookup for the same project', () => {
    const cache = new AutoModeFacadeCache(options, statefulFactory());

    const first = cache.getFacade('/project-a') as unknown as StatefulFakeFacade;
    first.autoLoopState = { running: true, branch: 'main' };

    const second = cache.getFacade('/project-a') as unknown as StatefulFakeFacade;

    expect(second.autoLoopState).toEqual({ running: true, branch: 'main' });
    expect(second.autoLoopState.running).toBe(true);
  });

  it('keeps auto-loop state of two projects independent', () => {
    const cache = new AutoModeFacadeCache(options, statefulFactory());

    const projectA = cache.getFacade('/project-a') as unknown as StatefulFakeFacade;
    const projectB = cache.getFacade('/project-b') as unknown as StatefulFakeFacade;

    projectA.autoLoopState = { running: true, branch: 'main' };
    projectB.autoLoopState = { running: false, branch: null };

    const projectAAgain = cache.getFacade('/project-a') as unknown as StatefulFakeFacade;
    const projectBAgain = cache.getFacade('/project-b') as unknown as StatefulFakeFacade;

    expect(projectAAgain.autoLoopState).toEqual({ running: true, branch: 'main' });
    expect(projectBAgain.autoLoopState).toEqual({ running: false, branch: null });
    expect(projectAAgain).not.toBe(projectBAgain);
  });

  it('creates distinct instances per path with the real default facade factory', () => {
    const facadeOptions: FacadeOptions = {
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        subscribe: vi.fn().mockReturnValue(vi.fn()),
      } as unknown as FacadeOptions['events'],
    };
    const cache = new AutoModeFacadeCache(facadeOptions);

    const first = cache.getFacade('/project-a');
    const second = cache.getFacade('/project-b');

    expect(first).toBeInstanceOf(AutoModeServiceFacade);
    expect(second).toBeInstanceOf(AutoModeServiceFacade);
    expect(second).not.toBe(first);
    expect(cache.getFacade('/project-a')).toBe(first);
  });
});
