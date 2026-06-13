import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTask,
  markStageFailed,
  incrementRetry,
  saveRecoverySnapshot,
  loadRecoverySnapshot,
  setTaskInterrupted,
} from '../src/workspace.js';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('workspace recovery', () => {
  let wsDir: string;

  beforeEach(() => {
    wsDir = join(tmpdir(), 'clockwork-ws-' + Date.now());
    mkdirSync(wsDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(wsDir, { recursive: true, force: true });
    } catch {}
  });

  it('marks a stage as failed and records retry count', () => {
    const task = createTask(wsDir, 'feature-dev', 'test', []);
    const updated = markStageFailed(wsDir, task.taskId, 'plan');
    expect(updated.stages.plan).toBe('failed');
    expect(updated.stageMeta.plan.retryCount).toBe(1);
  });

  it('incrementRetry bumps retry count', () => {
    const task = createTask(wsDir, 'feature-dev', 'test', []);
    markStageFailed(wsDir, task.taskId, 'plan');
    const updated = incrementRetry(wsDir, task.taskId, 'plan');
    expect(updated.stageMeta.plan.retryCount).toBe(2);
  });

  it('sets task interrupted with recovery snapshot', () => {
    const task = createTask(wsDir, 'feature-dev', 'test', []);
    const updated = setTaskInterrupted(wsDir, task.taskId);
    expect(updated.status).toBe('interrupted');
    expect(updated.stages[updated.currentStage]).toBe('interrupted');
  });

  it('saves and loads recovery snapshot', () => {
    const task = createTask(wsDir, 'feature-dev', 'test', []);
    saveRecoverySnapshot(wsDir, task.taskId, { lastStage: 'plan', artifacts: ['PLAN.md'] });
    const snap = loadRecoverySnapshot(wsDir, task.taskId);
    expect(snap.lastStage).toBe('plan');
    expect(snap.artifacts).toEqual(['PLAN.md']);
  });

  it('loadRecoverySnapshot returns null when no snapshot exists', () => {
    expect(loadRecoverySnapshot(wsDir, 'nonexistent')).toBeNull();
  });
});
