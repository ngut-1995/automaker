/**
 * AutoModeFacadeCache - Per-project cache of AutoModeServiceFacade instances.
 *
 * A facade owns live auto-loop state (its AutoLoopCoordinator). That state must
 * survive across API calls: if two calls for the same project received two
 * different facades, a running auto-loop would silently reset. The cache is
 * therefore keyed by project path and hands back the same instance for the
 * lifetime of the process.
 *
 * It lives at the composition root so ownership of the cache is explicit and
 * every caller shares the same per-project instance.
 */

import type { FacadeOptions } from './types.js';
import { AutoModeServiceFacade } from './facade.js';

/**
 * A function that produces a facade for a project path.
 */
export type FacadeProvider = (projectPath: string) => AutoModeServiceFacade;

export class AutoModeFacadeCache {
  private readonly facades = new Map<string, AutoModeServiceFacade>();

  /**
   * @param options - Options passed to the facade factory for every project.
   * @param create - Facade factory, injectable so tests can supply a fake
   *   without building real facades.
   */
  constructor(
    private readonly options: FacadeOptions,
    private readonly create: (
      projectPath: string,
      options: FacadeOptions
    ) => AutoModeServiceFacade = AutoModeServiceFacade.create
  ) {}

  /**
   * Get the cached facade for a project, creating and storing one on first use.
   *
   * The same project path always yields the same instance so auto-loop state
   * set through one lookup remains visible through later lookups.
   */
  getFacade(projectPath: string): AutoModeServiceFacade {
    let facade = this.facades.get(projectPath);
    if (!facade) {
      facade = this.create(projectPath, this.options);
      this.facades.set(projectPath, facade);
    }
    return facade;
  }
}
