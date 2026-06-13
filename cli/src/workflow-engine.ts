import { join } from 'path';
import { loadConfig, loadUserConfig } from './config.js';
import { parseFrontmatter } from './frontmatter.js';
import {
  loadTask,
  updateTaskStatus,
  markStageComplete,
  markStageFailed,
  incrementRetry,
  setHumanReviewPending,
  saveRecoverySnapshot,
  loadRecoverySnapshot,
} from './workspace.js';
import type { TaskStatus, WorkflowFrontmatter, WorkflowStage, AgentContext, StageMeta } from './types.js';

export interface WorkflowAction {
  type: 'dispatch_agent' | 'wait_review' | 'complete' | 'error' | 'recover' | 'wrong_role';
  agentName?: string;
  stageId?: string;
  agentContext?: AgentContext;
  model?: 'sonnet' | 'opus' | 'haiku';
  reviewStageId?: string;
  completedStages?: string[];
  error?: string;
  backoffMs?: number;
  lastStage?: string;
  completedStagesRecovery?: string[];
  requiredRole?: string;
  currentUserRole?: string;
}

export interface StageResult {
  success: boolean;
  artifacts?: string[];
  error?: string;
  timeout?: boolean;
}

export interface EngineState {
  taskId: string;
  projectRoot: string;
  workspaceDir: string;
  workflow: WorkflowFrontmatter;
  status: TaskStatus;
}

export async function initEngine(projectRoot: string, workspaceDir: string, taskId: string): Promise<EngineState> {
  const config = loadConfig(projectRoot);
  const status = loadTask(workspaceDir, taskId);
  const workflowPath = join(projectRoot, config.workflows.dir, `${status.workflow}.md`);
  const { frontmatter: workflow } = parseFrontmatter<WorkflowFrontmatter>(workflowPath);
  return { taskId, projectRoot, workspaceDir, workflow, status };
}

export function getNextAction(state: EngineState): WorkflowAction {
  const { status, workflow } = state;

  // Human review pending — block execution
  if (status.humanReviewPending) {
    return {
      type: 'wait_review',
      reviewStageId: status.currentStage,
    };
  }

  // Interrupted — offer recovery
  if (status.status === 'interrupted') {
    return { type: 'recover', lastStage: status.currentStage };
  }

  // Completed — nothing to do
  if (status.status === 'completed') {
    return {
      type: 'complete',
      completedStages: Object.keys(status.stages).filter((s) => status.stages[s] === 'completed'),
    };
  }

  // Find the current stage
  const currentStage = findStageById(workflow, status.currentStage);
  if (!currentStage) {
    return handleNoCurrentStage(workflow, state.projectRoot);
  }

  // Check for timeout on in-progress stage
  if (status.stages[status.currentStage] === 'in_progress') {
    const meta = status.stageMeta?.[status.currentStage];
    if (meta && isTimedOut(meta)) {
      return handleTimeout(currentStage, meta, state.projectRoot);
    }
  }

  // Pending or failed task — dispatch current stage
  if (status.status === 'pending' || status.status === 'failed') {
    return buildDispatchAction(currentStage, state.projectRoot);
  }

  // In progress — meaning we're resuming after a previous dispatch
  if (status.status === 'in_progress') {
    return buildDispatchAction(currentStage, state.projectRoot);
  }

  return { type: 'error', error: `Unhandled state: status=${status.status}, stage=${status.currentStage}` };
}

export async function applyStageResult(state: EngineState, result: StageResult): Promise<EngineState> {
  const { workspaceDir, taskId, workflow } = state;
  const currentStageId = state.status.currentStage;

  if (result.success) {
    // Mark current stage complete
    const updated = markStageComplete(workspaceDir, taskId, currentStageId);

    // Find next stage in sequence
    const nextStage = findNextStage(workflow, currentStageId);
    if (!nextStage) {
      // No more stages — task complete
      updated.status = 'completed';
      return { ...state, status: updated };
    }

    // Check human review for the *completed* stage (gate before next)
    const completedStage = findStageById(workflow, currentStageId);
    if (completedStage?.humanReview === 'required') {
      setHumanReviewPending(workspaceDir, taskId, true);
      return {
        ...state,
        status: { ...updated, humanReviewPending: true },
      };
    }

    // Advance to next stage
    const advanced = updateTaskStatus(workspaceDir, taskId, 'in_progress', nextStage.id);
    return { ...state, status: advanced };
  }

  // Stage failed — check retries
  const stage = findStageById(workflow, currentStageId);
  const maxRetries = stage?.maxRetries ?? 3;
  const meta = state.status.stageMeta?.[currentStageId];
  const currentRetries = (meta?.retryCount ?? 0) + 1;

  if (currentRetries > maxRetries) {
    markStageFailed(workspaceDir, taskId, currentStageId);
    const failed = loadTask(workspaceDir, taskId);
    return { ...state, status: failed };
  }

  incrementRetry(workspaceDir, taskId, currentStageId);
  const retried = loadTask(workspaceDir, taskId);
  return { ...state, status: retried };
}

export async function applyReviewDecision(
  state: EngineState,
  decision: 'approve' | 'reject',
  reason?: string,
): Promise<EngineState> {
  const { workspaceDir, taskId, workflow } = state;

  if (decision === 'approve') {
    setHumanReviewPending(workspaceDir, taskId, false);
    // Advance to next stage
    const nextStage = findNextStage(workflow, state.status.currentStage);
    if (!nextStage) {
      const completed = loadTask(workspaceDir, taskId);
      completed.status = 'completed';
      return { ...state, status: completed };
    }
    const advanced = updateTaskStatus(workspaceDir, taskId, 'in_progress', nextStage.id);
    return { ...state, status: advanced };
  }

  // Reject — mark stage as failed
  setHumanReviewPending(workspaceDir, taskId, true);
  if (reason) {
    markStageFailed(workspaceDir, taskId, state.status.currentStage);
  }
  const updated = loadTask(workspaceDir, taskId);
  return { ...state, status: updated };
}

export function saveRecoveryPoint(state: EngineState): void {
  const completedStages = Object.entries(state.status.stages)
    .filter(([, s]) => s === 'completed')
    .map(([id]) => id);
  saveRecoverySnapshot(state.workspaceDir, state.taskId, {
    lastStage: state.status.currentStage,
    completedStages,
  });
}

export function recoverFromSnapshot(projectRoot: string, workspaceDir: string, taskId: string): EngineState | null {
  const snapshot = loadRecoverySnapshot(workspaceDir, taskId);
  if (!snapshot) return null;

  const config = loadConfig(projectRoot);
  const status = loadTask(workspaceDir, taskId);
  const workflowPath = join(projectRoot, config.workflows.dir, `${status.workflow}.md`);
  const { frontmatter: workflow } = parseFrontmatter<WorkflowFrontmatter>(workflowPath);

  return {
    taskId,
    projectRoot,
    workspaceDir,
    workflow,
    status: { ...status, currentStage: (snapshot.lastStage as string) || status.currentStage },
  };
}

export function calculateBackoff(retryCount: number): number {
  return Math.min(Math.pow(2, retryCount) * 60000, 3600000);
}

// ── internal helpers ──

function findStageById(workflow: WorkflowFrontmatter, stageId: string): WorkflowStage | undefined {
  return workflow.stages.find((s) => s.id === stageId);
}

function findNextStage(workflow: WorkflowFrontmatter, currentStageId: string): WorkflowStage | undefined {
  const idx = workflow.stages.findIndex((s) => s.id === currentStageId);
  if (idx < 0 || idx >= workflow.stages.length - 1) return undefined;
  return workflow.stages[idx + 1];
}

function isTimedOut(meta: StageMeta): boolean {
  if (!meta.startedAt || !meta.timeoutMs) return false;
  const startedAt = new Date(meta.startedAt).getTime();
  return Date.now() - startedAt > meta.timeoutMs;
}

function handleTimeout(stage: WorkflowStage, meta: StageMeta, projectRoot: string): WorkflowAction {
  const maxRetries = stage.maxRetries ?? 3;
  const retryCount = meta.retryCount || 0;

  if (retryCount >= maxRetries) {
    return {
      type: 'error',
      stageId: stage.id,
      error: `Stage '${stage.id}' timed out after ${retryCount} retries (max ${maxRetries}).`,
    };
  }

  // Check role before retry dispatch
  const roleCheck = checkRole(stage, projectRoot);
  if (roleCheck) return roleCheck;

  const backoffMs = calculateBackoff(retryCount);
  return {
    type: 'dispatch_agent',
    agentName: stage.agent,
    stageId: stage.id,
    model: 'sonnet',
    backoffMs,
  };
}

function handleNoCurrentStage(workflow: WorkflowFrontmatter, projectRoot: string): WorkflowAction {
  const firstStage = workflow.stages[0];
  if (firstStage) {
    return buildDispatchAction(firstStage, projectRoot);
  }
  return { type: 'error', error: 'No stages defined in workflow' };
}

function checkRole(stage: WorkflowStage, projectRoot: string): WorkflowAction | null {
  if (!stage.role) return null;

  const userConfig = loadUserConfig(projectRoot);
  if (!userConfig) {
    return {
      type: 'wrong_role',
      stageId: stage.id,
      requiredRole: stage.role,
      error: `Stage '${stage.id}' requires role '${stage.role}', but no user config found. Run \`clockwork onboard\` to set up your identity.`,
    };
  }
  if (userConfig.role !== stage.role) {
    return {
      type: 'wrong_role',
      stageId: stage.id,
      requiredRole: stage.role,
      currentUserRole: userConfig.role,
      error: `Stage '${stage.id}' requires role '${stage.role}', but you are '${userConfig.role}'.`,
    };
  }
  return null;
}

function buildDispatchAction(stage: WorkflowStage, projectRoot: string): WorkflowAction {
  // Check role match before dispatching
  const roleCheck = checkRole(stage, projectRoot);
  if (roleCheck) return roleCheck;

  // Stages with agent "none" require framework actions (summarize, update knowledge, etc.)
  if (stage.agent === 'none') {
    return {
      type: 'dispatch_agent',
      agentName: 'none',
      stageId: stage.id,
    };
  }

  return {
    type: 'dispatch_agent',
    agentName: stage.agent,
    stageId: stage.id,
    model: 'sonnet',
  };
}
