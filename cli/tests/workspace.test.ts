import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTask, loadTask, updateTaskStatus } from '../src/workspace.js';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('workspace', () => {
  const testDir = join(tmpdir(), 'clockwork-ws-test-' + Date.now());
  const workspaceDir = join(testDir, 'workspace');

  beforeAll(async () => { await mkdir(workspaceDir, { recursive: true }); });
  afterAll(async () => { await rm(testDir, { recursive: true, force: true }); });

  it('creates a task workspace with status.yaml', () => {
    const task = createTask(workspaceDir, 'feature-dev', 'user-login', ['backend']);
    expect(task.taskId).toMatch(/^task-\d+-user-login$/);
    expect(task.status).toBe('pending');
    expect(task.workflow).toBe('feature-dev');
    expect(task.repos).toEqual(['backend']);
  });

  it('loads an existing task', () => {
    const task = createTask(workspaceDir, 'feature-dev', 'login', []);
    const loaded = loadTask(workspaceDir, task.taskId);
    expect(loaded.taskId).toBe(task.taskId);
  });

  it('updates task status', () => {
    const task = createTask(workspaceDir, 'feature-dev', 'status-test', []);
    const updated = updateTaskStatus(workspaceDir, task.taskId, 'in_progress', 'plan');
    expect(updated.status).toBe('in_progress');
    expect(updated.currentStage).toBe('plan');
    expect(updated.stages.plan).toBe('in_progress');
  });
});
