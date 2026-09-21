/**
 * Event payload unions that travel over the WebSocket.
 *
 * These are declared once here so the server (which emits them) and the UI
 * (which consumes them) share a single vocabulary; neither side may re-declare
 * them.
 */

import type { FeatureStatus, ParsedTask } from './feature.js';

/**
 * Auto-mode event types that can be emitted through the TypedEventBus.
 * These correspond to the event types expected by the frontend.
 */
export type AutoModeEventType =
  | 'auto_mode_started'
  | 'auto_mode_stopped'
  | 'auto_mode_idle'
  | 'auto_mode_error'
  | 'auto_mode_paused_failures'
  | 'auto_mode_feature_start'
  | 'auto_mode_feature_complete'
  | 'auto_mode_feature_resuming'
  | 'auto_mode_progress'
  | 'auto_mode_tool'
  | 'auto_mode_task_started'
  | 'auto_mode_task_complete'
  | 'auto_mode_task_status'
  | 'auto_mode_phase_complete'
  | 'auto_mode_summary'
  | 'auto_mode_resuming_features'
  | 'planning_started'
  | 'plan_approval_required'
  | 'plan_approved'
  | 'plan_auto_approved'
  | 'plan_rejected'
  | 'plan_revision_requested'
  | 'plan_revision_warning'
  | 'plan_spec_updated'
  | 'pipeline_step_started'
  | 'pipeline_step_complete'
  | 'pipeline_test_failed'
  | 'pipeline_merge_conflict'
  | 'feature_status_changed'
  | 'features_reconciled';

export type AutoModeEvent =
  | {
      type: 'auto_mode_started';
      message: string;
      projectPath?: string;
      branchName?: string | null;
    }
  | {
      type: 'auto_mode_stopped';
      message: string;
      projectPath?: string;
      branchName?: string | null;
    }
  | {
      type: 'auto_mode_idle';
      message: string;
      projectPath?: string;
      branchName?: string | null;
    }
  | {
      type: 'auto_mode_feature_start';
      featureId: string;
      projectId?: string;
      projectPath?: string;
      branchName?: string | null;
      feature: unknown;
    }
  | {
      type: 'auto_mode_progress';
      featureId: string;
      projectId?: string;
      projectPath?: string;
      branchName?: string | null;
      content: string;
    }
  | {
      type: 'auto_mode_tool';
      featureId: string;
      projectId?: string;
      projectPath?: string;
      branchName?: string | null;
      tool: string;
      input: unknown;
    }
  | {
      type: 'auto_mode_feature_complete';
      featureId: string;
      projectId?: string;
      projectPath?: string;
      branchName?: string | null;
      passes: boolean;
      message: string;
    }
  | {
      type: 'pipeline_step_started';
      featureId: string;
      projectPath?: string;
      branchName?: string | null;
      stepId: string;
      stepName: string;
      stepIndex: number;
      totalSteps: number;
    }
  | {
      type: 'pipeline_step_complete';
      featureId: string;
      projectPath?: string;
      branchName?: string | null;
      stepId: string;
      stepName: string;
      stepIndex: number;
      totalSteps: number;
    }
  | {
      type: 'auto_mode_error';
      error: string;
      errorType?: 'authentication' | 'cancellation' | 'abort' | 'execution';
      featureId?: string;
      projectId?: string;
      projectPath?: string;
      branchName?: string | null;
    }
  | {
      type: 'auto_mode_phase';
      featureId: string;
      projectId?: string;
      projectPath?: string;
      branchName?: string | null;
      phase: 'planning' | 'action' | 'verification';
      message: string;
    }
  | {
      type: 'auto_mode_ultrathink_preparation';
      featureId: string;
      projectPath?: string;
      branchName?: string | null;
      warnings: string[];
      recommendations: string[];
      estimatedCost?: number;
      estimatedTime?: string;
    }
  | {
      type: 'plan_approval_required';
      featureId: string;
      projectPath?: string;
      branchName?: string | null;
      planContent: string;
      planningMode: 'lite' | 'spec' | 'full';
      planVersion?: number;
    }
  | {
      type: 'plan_auto_approved';
      featureId: string;
      projectPath?: string;
      branchName?: string | null;
      planContent: string;
      planningMode: 'lite' | 'spec' | 'full';
    }
  | {
      type: 'plan_approved';
      featureId: string;
      projectPath?: string;
      branchName?: string | null;
      hasEdits: boolean;
      planVersion?: number;
    }
  | {
      type: 'plan_rejected';
      featureId: string;
      projectPath?: string;
      branchName?: string | null;
      feedback?: string;
    }
  | {
      type: 'plan_revision_requested';
      featureId: string;
      projectPath?: string;
      branchName?: string | null;
      feedback?: string;
      hasEdits?: boolean;
      planVersion?: number;
    }
  | {
      type: 'planning_started';
      featureId: string;
      branchName?: string | null;
      mode: 'lite' | 'spec' | 'full';
      message: string;
    }
  | {
      type: 'auto_mode_task_started';
      featureId: string;
      projectPath?: string;
      taskId: string;
      taskDescription: string;
      taskIndex: number;
      tasksTotal: number;
    }
  | {
      type: 'auto_mode_task_complete';
      featureId: string;
      projectPath?: string;
      taskId: string;
      tasksCompleted: number;
      tasksTotal: number;
    }
  | {
      type: 'auto_mode_phase_complete';
      featureId: string;
      projectPath?: string;
      phaseNumber: number;
    }
  | {
      type: 'auto_mode_task_status';
      featureId: string;
      projectPath?: string;
      taskId: string;
      status: ParsedTask['status'];
      tasks: ParsedTask[];
    }
  | {
      type: 'auto_mode_summary';
      featureId: string;
      projectPath?: string;
      summary: string;
    }
  | {
      type: 'auto_mode_resuming_features';
      message: string;
      projectPath?: string;
      featureIds: string[];
      features: Array<{
        id: string;
        title?: string;
        status?: string;
      }>;
    }
  | {
      type: 'feature_status_changed';
      featureId: string;
      projectPath?: string;
      status: FeatureStatus;
      previousStatus: FeatureStatus;
      reason?: string;
    }
  | {
      type: 'features_reconciled';
      projectPath?: string;
      reconciledCount: number;
      reconciledFeatureIds: string[];
      message: string;
    };
