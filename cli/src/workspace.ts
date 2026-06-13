import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { TaskStatus } from './types.js';

let taskCounter = 0;

export function createTask(workspaceDir: string, workflow: string, slug: string, repos: string[]): TaskStatus {
  taskCounter++;
  const padded = String(taskCounter).padStart(3, '0');
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
