import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { TaskStatus } from './types.js';

export function createTask(workspaceDir: string, workflow: string, slug: string, repos: string[]): TaskStatus {
  const existing = listTasks(workspaceDir);
  let maxNum = 0;
  for (const t of existing) {
    const match = t.taskId.match(/task-(\d+)/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  const padded = String(maxNum + 1).padStart(3, '0');
  const taskId = `task-${padded}-${slug}`;
  const taskDir = join(workspaceDir, taskId);
  mkdirSync(taskDir, { recursive: true });
  mkdirSync(join(taskDir, 'agent-context'), { recursive: true });
  mkdirSync(join(taskDir, 'logs'), { recursive: true });

  const now = new Date().toISOString();
  const status: TaskStatus = {
    taskId,
    workflow,
    status: 'pending',
    currentStage: '',
    stages: {},
    stageMeta: {},
    created: now,
    updated: now,
    repos,
    humanReviewPending: false,
  };

  writeFileSync(join(taskDir, 'status.yaml'), stringifyYaml(status));
  return status;
}

export function loadTask(workspaceDir: string, taskId: string): TaskStatus {
  const statusPath = join(workspaceDir, taskId, 'status.yaml');
  if (!existsSync(statusPath)) {
    throw new Error(`Task not found: ${taskId}`);
  }
  const raw = readFileSync(statusPath, 'utf8');
  return parseYaml(raw) as TaskStatus;
}

export function updateTaskStatus(
  workspaceDir: string, taskId: string,
  status: TaskStatus['status'], currentStage: string
): TaskStatus {
  const task = loadTask(workspaceDir, taskId);
  task.status = status;
  task.currentStage = currentStage;
  task.stages[currentStage] = 'in_progress';
  task.updated = new Date().toISOString();
  writeFileSync(join(workspaceDir, taskId, 'status.yaml'), stringifyYaml(task));
  return task;
}

export function markStageComplete(workspaceDir: string, taskId: string, stageId: string): TaskStatus {
  const task = loadTask(workspaceDir, taskId);
  task.stages[stageId] = 'completed';
  task.updated = new Date().toISOString();
  writeFileSync(join(workspaceDir, taskId, 'status.yaml'), stringifyYaml(task));
  return task;
}

export function setHumanReviewPending(workspaceDir: string, taskId: string, pending: boolean): TaskStatus {
  const task = loadTask(workspaceDir, taskId);
  task.humanReviewPending = pending;
  task.updated = new Date().toISOString();
  writeFileSync(join(workspaceDir, taskId, 'status.yaml'), stringifyYaml(task));
  return task;
}

export function listTasks(workspaceDir: string): TaskStatus[] {
  if (!existsSync(workspaceDir)) return [];
  return readdirSync(workspaceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      try { return loadTask(workspaceDir, entry.name); } catch { return null; }
    })
    .filter((t): t is TaskStatus => t !== null);
}

export function markStageFailed(workspaceDir: string, taskId: string, stageId: string): TaskStatus {
  const task = loadTask(workspaceDir, taskId);
  task.stages[stageId] = 'failed';
  task.status = 'failed';
  if (!task.stageMeta) task.stageMeta = {};
  if (!task.stageMeta[stageId]) task.stageMeta[stageId] = { retryCount: 0, maxRetries: 3, startedAt: '', timeoutMs: 600000 };
  task.stageMeta[stageId].retryCount = (task.stageMeta[stageId].retryCount || 0) + 1;
  task.updated = new Date().toISOString();
  writeFileSync(join(workspaceDir, taskId, 'status.yaml'), stringifyYaml(task));
  return task;
}

export function incrementRetry(workspaceDir: string, taskId: string, stageId: string): TaskStatus {
  const task = loadTask(workspaceDir, taskId);
  if (!task.stageMeta) task.stageMeta = {};
  if (!task.stageMeta[stageId]) task.stageMeta[stageId] = { retryCount: 0, maxRetries: 3, startedAt: '', timeoutMs: 600000 };
  task.stageMeta[stageId].retryCount += 1;
  task.updated = new Date().toISOString();
  writeFileSync(join(workspaceDir, taskId, 'status.yaml'), stringifyYaml(task));
  return task;
}

export function setTaskInterrupted(workspaceDir: string, taskId: string): TaskStatus {
  const task = loadTask(workspaceDir, taskId);
  task.status = 'interrupted';
  task.stages[task.currentStage] = 'interrupted';
  task.updated = new Date().toISOString();
  writeFileSync(join(workspaceDir, taskId, 'status.yaml'), stringifyYaml(task));
  return task;
}

export function saveRecoverySnapshot(workspaceDir: string, taskId: string, data: Record<string, unknown>): void {
  const recoveryDir = join(workspaceDir, taskId, 'recovery');
  mkdirSync(recoveryDir, { recursive: true });
  writeFileSync(join(recoveryDir, 'snapshot.yaml'), stringifyYaml(data));
}

export function loadRecoverySnapshot(workspaceDir: string, taskId: string): Record<string, unknown> | null {
  const path = join(workspaceDir, taskId, 'recovery', 'snapshot.yaml');
  if (!existsSync(path)) return null;
  return parseYaml(readFileSync(path, 'utf8'));
}
