/**
 * Server-side contract conformance.
 *
 * For every migrated mount: every contract entry has a handler, and registering
 * the mount yields exactly one route per entry at the path the contract derives
 * — and nothing else.
 *
 * When a mount is migrated onto the contract, add an `it` block here.
 */

import { describe, it, expect } from 'vitest';
import { Router } from 'express';
import { OPERATIONS, operationNamesForMount, operationMounts } from '@automaker/types';
import {
  createFeaturesRoutes,
  createFeaturesHandlers,
  FEATURES_MOUNT,
} from '@/routes/features/index.js';
import {
  createAutoModeRoutes,
  createAutoModeHandlers,
  AUTO_MODE_MOUNT,
} from '@/routes/auto-mode/index.js';
import {
  createRunningAgentsRoutes,
  createRunningAgentsHandlers,
  RUNNING_AGENTS_MOUNT,
} from '@/routes/running-agents/index.js';
import { createWorktreeHandlers, WORKTREE_MOUNT } from '@/routes/worktree/index.js';
import { createSettingsHandlers, SETTINGS_MOUNT } from '@/routes/settings/index.js';
import { createProjectsHandlers, PROJECTS_MOUNT } from '@/routes/projects/index.js';
import { createContextHandlers, CONTEXT_MOUNT } from '@/routes/context/index.js';
import {
  createSpecRegenerationHandlers,
  SPEC_REGENERATION_MOUNT,
} from '@/routes/app-spec/index.js';
import { createBacklogPlanHandlers, BACKLOG_PLAN_MOUNT } from '@/routes/backlog-plan/index.js';
import { createIdeationHandlers, IDEATION_MOUNT } from '@/routes/ideation/index.js';
import { createGitHubHandlers, GITHUB_MOUNT } from '@/routes/github/index.js';
import { createGitHandlers, GIT_MOUNT } from '@/routes/git/index.js';
import { createTemplatesHandlers, TEMPLATES_MOUNT } from '@/routes/templates/index.js';
import { createModelsHandlers, MODELS_MOUNT } from '@/routes/models/index.js';
import { createFsHandlers, FS_MOUNT } from '@/routes/fs/index.js';
import { createTerminalHandlers, TERMINAL_MOUNT } from '@/routes/terminal/index.js';
import { createWorkspaceHandlers, WORKSPACE_MOUNT } from '@/routes/workspace/index.js';
import { createMCPHandlers, MCP_MOUNT } from '@/routes/mcp/index.js';
import {
  createHealthHandlers,
  createHealthRoutes,
  createHealthDetailedRoutes,
  HEALTH_MOUNT,
} from '@/routes/health/index.js';
import { createAuthHandlers, AUTH_MOUNT } from '@/routes/auth/index.js';
import { createSessionsHandlers, SESSIONS_MOUNT } from '@/routes/sessions/index.js';
import { createAgentHandlers, AGENT_MOUNT } from '@/routes/agent/index.js';
import { createNotificationsHandlers, NOTIFICATIONS_MOUNT } from '@/routes/notifications/index.js';
import { createEventHistoryHandlers, EVENT_HISTORY_MOUNT } from '@/routes/event-history/index.js';
import { createPipelineHandlers, PIPELINE_MOUNT } from '@/routes/pipeline/index.js';
import {
  createEnhancePromptHandlers,
  ENHANCE_PROMPT_MOUNT,
} from '@/routes/enhance-prompt/index.js';
import { createClaudeHandlers, CLAUDE_MOUNT } from '@/routes/claude/index.js';
import { createCodexHandlers, CODEX_MOUNT } from '@/routes/codex/index.js';
import { createZaiHandlers, ZAI_MOUNT } from '@/routes/zai/index.js';
import { createGeminiHandlers, GEMINI_MOUNT } from '@/routes/gemini/index.js';
import { createSetupHandlers, SETUP_MOUNT } from '@/routes/setup/index.js';
import { registerContractOperations, missingContractHandlers } from '@/routes/contract.js';
import type { OperationHandlers } from '@/routes/contract.js';

interface RegisteredRoute {
  path: string;
  methods: Record<string, boolean>;
}

function registeredRoutes(router: Router): RegisteredRoute[] {
  const stack = (router as unknown as { stack: Array<{ route?: RegisteredRoute }> }).stack;
  return stack.filter((layer) => layer.route).map((layer) => layer.route!);
}

/**
 * Assert that `mount` is fully described by the contract: handler coverage,
 * one route per entry at the derived path, and no route outside the contract.
 */
function expectContractMount(mount: string, handlers: OperationHandlers): void {
  expect(missingContractHandlers(mount, handlers), `missing handlers on ${mount}`).toEqual([]);

  const names = operationNamesForMount(mount);
  expect(names.length, `contract operations on ${mount}`).toBeGreaterThan(0);

  for (const name of names) {
    expect(handlers[name], `handler for ${name}`).toBeTypeOf('function');
  }

  const routes = registeredRoutes(registerContractOperations(Router(), mount, handlers));

  for (const name of names) {
    const definition = OPERATIONS[name];
    const method = definition.method.toLowerCase();
    const match = routes.find(
      (route) => route.path === definition.path && route.methods[method] === true
    );
    expect(match, `${name} -> ${definition.method} ${definition.path}`).toBeDefined();
  }

  const contractPairs = new Set(
    names.map((name) => `${OPERATIONS[name].method.toLowerCase()} ${OPERATIONS[name].path}`)
  );
  for (const route of routes) {
    for (const [method, enabled] of Object.entries(route.methods)) {
      if (!enabled) continue;
      expect(
        contractPairs.has(`${method} ${route.path}`),
        `route outside contract: ${method} ${route.path}`
      ).toBe(true);
    }
  }
}

describe('contract conformance', () => {
  it('features mount', () => {
    const handlers = createFeaturesHandlers({} as never);
    expectContractMount(FEATURES_MOUNT, handlers);
    // The public factory builds the same router.
    expect(registeredRoutes(createFeaturesRoutes({} as never)).length).toBe(
      operationNamesForMount(FEATURES_MOUNT).length
    );
  });

  it('auto-mode mount', () => {
    const handlers = createAutoModeHandlers({} as never);
    expectContractMount(AUTO_MODE_MOUNT, handlers);
    // The public factory builds the same router.
    expect(registeredRoutes(createAutoModeRoutes({} as never)).length).toBe(
      operationNamesForMount(AUTO_MODE_MOUNT).length
    );
  });

  it('running-agents mount', () => {
    const handlers = createRunningAgentsHandlers({} as never);
    expectContractMount(RUNNING_AGENTS_MOUNT, handlers);
    // The public factory builds the same router.
    expect(registeredRoutes(createRunningAgentsRoutes({} as never)).length).toBe(
      operationNamesForMount(RUNNING_AGENTS_MOUNT).length
    );
  });

  it('worktree lifecycle mount', () => {
    expectContractMount(WORKTREE_MOUNT, createWorktreeHandlers({} as never));
  });

  it('settings mount', () => {
    expectContractMount(SETTINGS_MOUNT, createSettingsHandlers({} as never));
  });

  it('projects mount', () => {
    expectContractMount(
      PROJECTS_MOUNT,
      createProjectsHandlers({} as never, {} as never, {} as never, {} as never)
    );
  });

  it('context mount', () => {
    expectContractMount(CONTEXT_MOUNT, createContextHandlers());
  });

  it('spec-regeneration mount', () => {
    expectContractMount(SPEC_REGENERATION_MOUNT, createSpecRegenerationHandlers({} as never));
  });

  it('backlog-plan mount', () => {
    expectContractMount(BACKLOG_PLAN_MOUNT, createBacklogPlanHandlers({} as never));
  });

  it('ideation mount', () => {
    expectContractMount(
      IDEATION_MOUNT,
      createIdeationHandlers({} as never, {} as never, {} as never)
    );
  });

  it('github mount', () => {
    expectContractMount(GITHUB_MOUNT, createGitHubHandlers({} as never));
  });

  it('git mount', () => {
    expectContractMount(GIT_MOUNT, createGitHandlers());
  });

  it('templates mount', () => {
    expectContractMount(TEMPLATES_MOUNT, createTemplatesHandlers());
  });

  it('models mount', () => {
    expectContractMount(MODELS_MOUNT, createModelsHandlers());
  });

  it('fs mount', () => {
    expectContractMount(FS_MOUNT, createFsHandlers());
  });

  it('terminal mount', () => {
    expectContractMount(TERMINAL_MOUNT, createTerminalHandlers());
  });

  it('workspace mount', () => {
    expectContractMount(WORKSPACE_MOUNT, createWorkspaceHandlers());
  });

  it('mcp mount', () => {
    expectContractMount(MCP_MOUNT, createMCPHandlers({} as never));
  });

  it('health mount', () => {
    expectContractMount(HEALTH_MOUNT, createHealthHandlers());

    // The mount is split across two routers to keep `/detailed` authenticated:
    // the pre-auth router serves check + environment, the post-auth router
    // serves detailed, and together they cover every entry exactly once.
    const publicRoutes = registeredRoutes(createHealthRoutes());
    const detailedRoutes = registeredRoutes(createHealthDetailedRoutes());
    expect(publicRoutes.length).toBe(2);
    expect(detailedRoutes.length).toBe(1);
    expect(detailedRoutes[0].path).toBe('/detailed');
    expect(publicRoutes.length + detailedRoutes.length).toBe(
      operationNamesForMount(HEALTH_MOUNT).length
    );
  });

  it('auth mount', () => {
    expectContractMount(AUTH_MOUNT, createAuthHandlers());
  });

  it('sessions mount', () => {
    expectContractMount(SESSIONS_MOUNT, createSessionsHandlers({} as never));
  });

  it('agent mount', () => {
    expectContractMount(AGENT_MOUNT, createAgentHandlers({} as never));
  });

  it('notifications mount', () => {
    expectContractMount(NOTIFICATIONS_MOUNT, createNotificationsHandlers({} as never));
  });

  it('event-history mount', () => {
    expectContractMount(EVENT_HISTORY_MOUNT, createEventHistoryHandlers({} as never, {} as never));
  });

  it('pipeline mount', () => {
    expectContractMount(PIPELINE_MOUNT, createPipelineHandlers({} as never));
  });

  it('enhance-prompt mount', () => {
    expectContractMount(ENHANCE_PROMPT_MOUNT, createEnhancePromptHandlers());
  });

  it('claude mount', () => {
    expectContractMount(CLAUDE_MOUNT, createClaudeHandlers({} as never));
  });

  it('codex mount', () => {
    expectContractMount(CODEX_MOUNT, createCodexHandlers({} as never, {} as never));
  });

  it('zai mount', () => {
    expectContractMount(ZAI_MOUNT, createZaiHandlers({} as never, {} as never));
  });

  it('gemini mount', () => {
    expectContractMount(GEMINI_MOUNT, createGeminiHandlers({} as never));
  });

  it('setup mount', () => {
    expectContractMount(SETUP_MOUNT, createSetupHandlers());
  });

  /**
   * Whole-surface check: every mount the contract declares has a handler map
   * that covers all of its entries, and registering that mount yields exactly
   * one route per entry. No mount may be left unaccounted for.
   */
  it('every contract mount has handlers and registers every entry', () => {
    const handlerFactories: Record<string, () => OperationHandlers> = {
      [FEATURES_MOUNT]: () => createFeaturesHandlers({} as never),
      [AUTO_MODE_MOUNT]: () => createAutoModeHandlers({} as never),
      [RUNNING_AGENTS_MOUNT]: () => createRunningAgentsHandlers({} as never),
      [WORKTREE_MOUNT]: () => createWorktreeHandlers({} as never),
      [SETTINGS_MOUNT]: () => createSettingsHandlers({} as never),
      [PROJECTS_MOUNT]: () =>
        createProjectsHandlers({} as never, {} as never, {} as never, {} as never),
      [CONTEXT_MOUNT]: () => createContextHandlers(),
      [SPEC_REGENERATION_MOUNT]: () => createSpecRegenerationHandlers({} as never),
      [BACKLOG_PLAN_MOUNT]: () => createBacklogPlanHandlers({} as never),
      [IDEATION_MOUNT]: () => createIdeationHandlers({} as never, {} as never, {} as never),
      [GITHUB_MOUNT]: () => createGitHubHandlers({} as never),
      [GIT_MOUNT]: () => createGitHandlers(),
      [TEMPLATES_MOUNT]: () => createTemplatesHandlers(),
      [MODELS_MOUNT]: () => createModelsHandlers(),
      [FS_MOUNT]: () => createFsHandlers(),
      [TERMINAL_MOUNT]: () => createTerminalHandlers(),
      [WORKSPACE_MOUNT]: () => createWorkspaceHandlers(),
      [MCP_MOUNT]: () => createMCPHandlers({} as never),
      [HEALTH_MOUNT]: () => createHealthHandlers(),
      [AUTH_MOUNT]: () => createAuthHandlers(),
      [SESSIONS_MOUNT]: () => createSessionsHandlers({} as never),
      [AGENT_MOUNT]: () => createAgentHandlers({} as never),
      [NOTIFICATIONS_MOUNT]: () => createNotificationsHandlers({} as never),
      [EVENT_HISTORY_MOUNT]: () => createEventHistoryHandlers({} as never, {} as never),
      [PIPELINE_MOUNT]: () => createPipelineHandlers({} as never),
      [ENHANCE_PROMPT_MOUNT]: () => createEnhancePromptHandlers(),
      [CLAUDE_MOUNT]: () => createClaudeHandlers({} as never),
      [CODEX_MOUNT]: () => createCodexHandlers({} as never, {} as never),
      [ZAI_MOUNT]: () => createZaiHandlers({} as never, {} as never),
      [GEMINI_MOUNT]: () => createGeminiHandlers({} as never),
      [SETUP_MOUNT]: () => createSetupHandlers(),
    };

    const mounts = operationMounts();
    expect(new Set(Object.keys(handlerFactories)), 'unaccounted contract mounts').toEqual(
      new Set(mounts)
    );

    for (const mount of mounts) {
      const handlers = handlerFactories[mount]();
      expect(missingContractHandlers(mount, handlers), `missing handlers on ${mount}`).toEqual([]);

      const names = operationNamesForMount(mount);
      const routes = registeredRoutes(registerContractOperations(Router(), mount, handlers));
      expect(routes.length, `registered routes on ${mount}`).toBe(names.length);
    }
  });
});
