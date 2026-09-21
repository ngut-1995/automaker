import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import type {
  AutoModeServiceFacade,
  GlobalAutoModeService,
  RunningAgentInfo,
} from '@/services/auto-mode/index.js';
import { createMockExpressContext } from '../../../utils/mocks.js';
import { createStartHandler } from '@/routes/auto-mode/routes/start.js';
import { createStopHandler } from '@/routes/auto-mode/routes/stop.js';
import { createStopFeatureHandler } from '@/routes/auto-mode/routes/stop-feature.js';
import { createStatusHandler } from '@/routes/auto-mode/routes/status.js';
import { createRunFeatureHandler } from '@/routes/auto-mode/routes/run-feature.js';
import { createVerifyFeatureHandler } from '@/routes/auto-mode/routes/verify-feature.js';
import { createResumeFeatureHandler } from '@/routes/auto-mode/routes/resume-feature.js';
import { createContextExistsHandler } from '@/routes/auto-mode/routes/context-exists.js';
import { createAnalyzeProjectHandler } from '@/routes/auto-mode/routes/analyze-project.js';
import { createFollowUpFeatureHandler } from '@/routes/auto-mode/routes/follow-up-feature.js';
import { createCommitFeatureHandler } from '@/routes/auto-mode/routes/commit-feature.js';
import { createApprovePlanHandler } from '@/routes/auto-mode/routes/approve-plan.js';
import { createResumeInterruptedHandler } from '@/routes/auto-mode/routes/resume-interrupted.js';
import { createReconcileHandler } from '@/routes/auto-mode/routes/reconcile.js';

function makeFacade(overrides: Record<string, unknown> = {}): AutoModeServiceFacade {
  return overrides as unknown as AutoModeServiceFacade;
}

function makeGlobal(overrides: Record<string, unknown> = {}): GlobalAutoModeService {
  return overrides as unknown as GlobalAutoModeService;
}

function runningAgent(featureId: string, projectPath: string): RunningAgentInfo {
  return {
    featureId,
    projectPath,
    projectName: 'project',
    isAutoMode: false,
  };
}

describe('auto-mode routes', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    const context = createMockExpressContext();
    req = context.req;
    res = context.res;
  });

  describe('POST /start (start handler)', () => {
    it('checks and starts the loop with request-derived arguments', async () => {
      const facade = makeFacade({
        isAutoLoopRunning: vi.fn().mockReturnValue(false),
        startAutoLoop: vi.fn().mockResolvedValue(3),
      });
      const getFacade = vi.fn(() => facade);
      req.body = { projectPath: '/project', branchName: 'feature/x', maxConcurrency: 3 };

      await createStartHandler(getFacade)(req, res);

      expect(getFacade).toHaveBeenCalledWith('/project');
      expect(facade.isAutoLoopRunning).toHaveBeenCalledWith('feature/x');
      expect(facade.startAutoLoop).toHaveBeenCalledWith('feature/x', 3);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Auto mode started with max 3 concurrent features',
        branchName: 'feature/x',
      });
    });

    it('normalizes a missing branchName to null', async () => {
      const facade = makeFacade({
        isAutoLoopRunning: vi.fn().mockReturnValue(false),
        startAutoLoop: vi.fn().mockResolvedValue(1),
      });
      req.body = { projectPath: '/project' };

      await createStartHandler(vi.fn(() => facade))(req, res);

      expect(facade.isAutoLoopRunning).toHaveBeenCalledWith(null);
      expect(facade.startAutoLoop).toHaveBeenCalledWith(null, undefined);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Auto mode started with max 1 concurrent features',
        branchName: null,
      });
    });

    it('short-circuits when the loop is already running', async () => {
      const facade = makeFacade({
        isAutoLoopRunning: vi.fn().mockReturnValue(true),
        startAutoLoop: vi.fn(),
      });
      req.body = { projectPath: '/project', branchName: null };

      await createStartHandler(vi.fn(() => facade))(req, res);

      expect(facade.startAutoLoop).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Auto mode is already running for main worktree',
        alreadyRunning: true,
        branchName: null,
      });
    });

    it('rejects a missing projectPath', async () => {
      req.body = {};

      await createStartHandler(vi.fn())(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'projectPath is required',
      });
    });
  });

  describe('POST /stop (stop handler)', () => {
    it('stops the loop with request-derived arguments', async () => {
      const facade = makeFacade({
        isAutoLoopRunning: vi.fn().mockReturnValue(true),
        stopAutoLoop: vi.fn().mockResolvedValue(2),
      });
      const getFacade = vi.fn(() => facade);
      req.body = { projectPath: '/project', branchName: 'feature/x' };

      await createStopHandler(getFacade)(req, res);

      expect(getFacade).toHaveBeenCalledWith('/project');
      expect(facade.isAutoLoopRunning).toHaveBeenCalledWith('feature/x');
      expect(facade.stopAutoLoop).toHaveBeenCalledWith('feature/x');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Auto mode stopped',
        runningFeaturesCount: 2,
        branchName: 'feature/x',
      });
    });

    it('reports not-running without stopping', async () => {
      const facade = makeFacade({
        isAutoLoopRunning: vi.fn().mockReturnValue(false),
        stopAutoLoop: vi.fn(),
      });
      req.body = { projectPath: '/project' };

      await createStopHandler(vi.fn(() => facade))(req, res);

      expect(facade.stopAutoLoop).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Auto mode is not running for main worktree',
        wasRunning: false,
        branchName: null,
      });
    });

    it('rejects a missing projectPath', async () => {
      req.body = {};

      await createStopHandler(vi.fn())(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /stop-feature (stop-feature handler)', () => {
    it('stops the feature on the project that owns it', async () => {
      const global = makeGlobal({ getRunningAgents: vi.fn() });
      vi.mocked(global.getRunningAgents).mockResolvedValue([runningAgent('f1', '/project')]);
      const facade = makeFacade({ stopFeature: vi.fn().mockResolvedValue(true) });
      const getFacade = vi.fn(() => facade);
      req.body = { featureId: 'f1' };

      await createStopFeatureHandler(global, getFacade)(req, res);

      expect(global.getRunningAgents).toHaveBeenCalled();
      expect(getFacade).toHaveBeenCalledWith('/project');
      expect(facade.stopFeature).toHaveBeenCalledWith('f1');
      expect(res.json).toHaveBeenCalledWith({ success: true, stopped: true });
    });

    it('returns stopped: false when no running agent matches', async () => {
      const global = makeGlobal({ getRunningAgents: vi.fn() });
      vi.mocked(global.getRunningAgents).mockResolvedValue([]);
      const getFacade = vi.fn();
      req.body = { featureId: 'missing' };

      await createStopFeatureHandler(global, getFacade)(req, res);

      expect(getFacade).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, stopped: false });
    });

    it('rejects a missing featureId', async () => {
      req.body = {};

      await createStopFeatureHandler(makeGlobal(), vi.fn())(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'featureId is required',
      });
    });
  });

  describe('POST /status (status handler)', () => {
    it('returns per-project status through the facade', async () => {
      const global = makeGlobal({
        getStatus: vi.fn(),
        getActiveAutoLoopProjects: vi.fn(),
        getActiveAutoLoopWorktrees: vi.fn(),
      });
      const facade = makeFacade({
        getStatusForProject: vi.fn().mockResolvedValue({
          isAutoLoopRunning: true,
          runningFeatures: ['f1'],
          runningCount: 1,
          maxConcurrency: 2,
          branchName: 'feature/x',
        }),
      });
      const getFacade = vi.fn(() => facade);
      req.body = { projectPath: '/project', branchName: 'feature/x' };

      await createStatusHandler(global, getFacade)(req, res);

      expect(getFacade).toHaveBeenCalledWith('/project');
      expect(facade.getStatusForProject).toHaveBeenCalledWith('feature/x');
      expect(global.getStatus).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        isRunning: true,
        isAutoLoopRunning: true,
        runningFeatures: ['f1'],
        runningCount: 1,
        maxConcurrency: 2,
        projectPath: '/project',
        branchName: 'feature/x',
      });
    });

    it('returns global status when no projectPath is supplied', async () => {
      const global = makeGlobal({
        getStatus: vi
          .fn()
          .mockReturnValue({ isRunning: false, runningFeatures: [], runningCount: 0 }),
        getActiveAutoLoopProjects: vi.fn().mockReturnValue(['/a']),
        getActiveAutoLoopWorktrees: vi
          .fn()
          .mockReturnValue([{ projectPath: '/a', branchName: null }]),
      });
      const getFacade = vi.fn();
      req.body = {};

      await createStatusHandler(global, getFacade)(req, res);

      expect(getFacade).not.toHaveBeenCalled();
      expect(global.getStatus).toHaveBeenCalled();
      expect(global.getActiveAutoLoopProjects).toHaveBeenCalled();
      expect(global.getActiveAutoLoopWorktrees).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        isRunning: false,
        runningFeatures: [],
        runningCount: 0,
        activeAutoLoopProjects: ['/a'],
        activeAutoLoopWorktrees: [{ projectPath: '/a', branchName: null }],
      });
    });
  });

  describe('POST /run-feature (run-feature handler)', () => {
    it('executes the feature through the facade in the background', async () => {
      const facade = makeFacade({ executeFeature: vi.fn().mockResolvedValue(undefined) });
      const getFacade = vi.fn(() => facade);
      req.body = { projectPath: '/project', featureId: 'f1', useWorktrees: true };

      await createRunFeatureHandler(getFacade)(req, res);

      expect(getFacade).toHaveBeenCalledWith('/project');
      expect(facade.executeFeature).toHaveBeenCalledWith('f1', true, false);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('defaults useWorktrees to false', async () => {
      const facade = makeFacade({ executeFeature: vi.fn().mockResolvedValue(undefined) });
      req.body = { projectPath: '/project', featureId: 'f1' };

      await createRunFeatureHandler(vi.fn(() => facade))(req, res);

      expect(facade.executeFeature).toHaveBeenCalledWith('f1', false, false);
    });
  });

  describe('POST /verify-feature (verify-feature handler)', () => {
    it('verifies the feature through the facade', async () => {
      const facade = makeFacade({ verifyFeature: vi.fn().mockResolvedValue(true) });
      req.body = { projectPath: '/project', featureId: 'f1' };

      await createVerifyFeatureHandler(vi.fn(() => facade))(req, res);

      expect(facade.verifyFeature).toHaveBeenCalledWith('f1');
      expect(res.json).toHaveBeenCalledWith({ success: true, passes: true });
    });
  });

  describe('POST /resume-feature (resume-feature handler)', () => {
    it('resumes the feature through the facade in the background', async () => {
      const facade = makeFacade({ resumeFeature: vi.fn().mockResolvedValue(undefined) });
      req.body = { projectPath: '/project', featureId: 'f1', useWorktrees: true };

      await createResumeFeatureHandler(vi.fn(() => facade))(req, res);

      expect(facade.resumeFeature).toHaveBeenCalledWith('f1', true);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('defaults useWorktrees to false', async () => {
      const facade = makeFacade({ resumeFeature: vi.fn().mockResolvedValue(undefined) });
      req.body = { projectPath: '/project', featureId: 'f1' };

      await createResumeFeatureHandler(vi.fn(() => facade))(req, res);

      expect(facade.resumeFeature).toHaveBeenCalledWith('f1', false);
    });
  });

  describe('POST /context-exists (context-exists handler)', () => {
    it('checks context through the facade', async () => {
      const facade = makeFacade({ contextExists: vi.fn().mockResolvedValue(true) });
      req.body = { projectPath: '/project', featureId: 'f1' };

      await createContextExistsHandler(vi.fn(() => facade))(req, res);

      expect(facade.contextExists).toHaveBeenCalledWith('f1');
      expect(res.json).toHaveBeenCalledWith({ success: true, exists: true });
    });
  });

  describe('POST /analyze-project (analyze-project handler)', () => {
    it('kicks off analysis through the facade in the background', async () => {
      const facade = makeFacade({ analyzeProject: vi.fn().mockResolvedValue(undefined) });
      const getFacade = vi.fn(() => facade);
      req.body = { projectPath: '/project' };

      await createAnalyzeProjectHandler(getFacade)(req, res);

      expect(getFacade).toHaveBeenCalledWith('/project');
      expect(facade.analyzeProject).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Project analysis started',
      });
    });

    it('rejects a missing projectPath', async () => {
      req.body = {};

      await createAnalyzeProjectHandler(vi.fn())(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /follow-up-feature (follow-up-feature handler)', () => {
    it('passes the follow-up request through the facade', async () => {
      const facade = makeFacade({ followUpFeature: vi.fn().mockResolvedValue(undefined) });
      req.body = {
        projectPath: '/project',
        featureId: 'f1',
        prompt: 'do more',
        imagePaths: ['/img.png'],
        useWorktrees: true,
      };

      await createFollowUpFeatureHandler(vi.fn(() => facade))(req, res);

      expect(facade.followUpFeature).toHaveBeenCalledWith('f1', 'do more', ['/img.png'], true);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('defaults useWorktrees to false', async () => {
      const facade = makeFacade({ followUpFeature: vi.fn().mockResolvedValue(undefined) });
      req.body = { projectPath: '/project', featureId: 'f1', prompt: 'do more' };

      await createFollowUpFeatureHandler(vi.fn(() => facade))(req, res);

      expect(facade.followUpFeature).toHaveBeenCalledWith('f1', 'do more', undefined, false);
    });
  });

  describe('POST /commit-feature (commit-feature handler)', () => {
    it('commits the feature through the facade', async () => {
      const facade = makeFacade({ commitFeature: vi.fn().mockResolvedValue('abc123') });
      req.body = { projectPath: '/project', featureId: 'f1', worktreePath: '/wt' };

      await createCommitFeatureHandler(vi.fn(() => facade))(req, res);

      expect(facade.commitFeature).toHaveBeenCalledWith('f1', '/wt');
      expect(res.json).toHaveBeenCalledWith({ success: true, commitHash: 'abc123' });
    });
  });

  describe('POST /approve-plan (approve-plan handler)', () => {
    it('resolves the plan approval through the facade', async () => {
      const facade = makeFacade({
        resolvePlanApproval: vi.fn().mockResolvedValue({ success: true }),
      });
      req.body = {
        projectPath: '/project',
        featureId: 'f1',
        approved: true,
        editedPlan: 'plan',
        feedback: 'nice',
      };

      await createApprovePlanHandler(vi.fn(() => facade))(req, res);

      expect(facade.resolvePlanApproval).toHaveBeenCalledWith('f1', true, 'plan', 'nice');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        approved: true,
        message: 'Plan approved - implementation will continue',
      });
    });

    it('returns 500 when approval resolution fails', async () => {
      const facade = makeFacade({
        resolvePlanApproval: vi.fn().mockResolvedValue({ success: false, error: 'nope' }),
      });
      req.body = { projectPath: '/project', featureId: 'f1', approved: false };

      await createApprovePlanHandler(vi.fn(() => facade))(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'nope' });
    });
  });

  describe('POST /resume-interrupted (resume-interrupted handler)', () => {
    it('resumes interrupted features through the facade', async () => {
      const facade = makeFacade({
        resumeInterruptedFeatures: vi.fn().mockResolvedValue(undefined),
      });
      req.body = { projectPath: '/project' };

      await createResumeInterruptedHandler(vi.fn(() => facade))(req, res);

      expect(facade.resumeInterruptedFeatures).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resume check completed',
      });
    });
  });

  describe('POST /reconcile (reconcile handler)', () => {
    it('reconciles feature states through the global service', async () => {
      const global = makeGlobal({ reconcileFeatureStates: vi.fn().mockResolvedValue(2) });
      req.body = { projectPath: '/project' };

      await createReconcileHandler(global)(req, res);

      expect(global.reconcileFeatureStates).toHaveBeenCalledWith('/project');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        reconciledCount: 2,
        message: 'Reconciled 2 feature(s)',
      });
    });

    it('rejects a missing projectPath', async () => {
      req.body = {};

      await createReconcileHandler(makeGlobal())(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
