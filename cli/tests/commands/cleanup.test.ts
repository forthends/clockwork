import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { findOrphanTasks } from '../../src/commands/cleanup.js';
import { cleanupLocks, acquireLock } from '../../src/lock.js';

const TTL_MS = 30 * 60 * 1000;

describe('cleanup locks', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-cleanup-locks-' + Date.now());
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  });

  it('removes expired lock files', () => {
    acquireLock(dir, 'task-001');
    const oldData = JSON.stringify({
      acquiredAt: new Date(Date.now() - TTL_MS - 1).toISOString(),
      pid: process.pid,
    });
    writeFileSync(join(dir, '.locks', 'task-001.lock'), oldData);
    const count = cleanupLocks(dir, TTL_MS);
    expect(count).toBe(1);
    expect(existsSync(join(dir, '.locks', 'task-001.lock'))).toBe(false);
  });

  it('keeps fresh lock files', () => {
    acquireLock(dir, 'fresh');
    const count = cleanupLocks(dir, TTL_MS);
    expect(count).toBe(0);
    expect(existsSync(join(dir, '.locks', 'fresh.lock'))).toBe(true);
  });
});

describe('cleanup orphans', () => {
  let dir: string;
  let wsDir: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-orphans-' + Date.now());
    wsDir = join(dir, 'workspace');
    mkdirSync(dir, { recursive: true });
    mkdirSync(wsDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  });

  it('detects orphan task directories without status.yaml', () => {
    mkdirSync(join(wsDir, 'task-001-valid'), { recursive: true });
    writeFileSync(
      join(wsDir, 'task-001-valid', 'status.yaml'),
      'taskId: task-001-valid\nworkflow: feature-dev\nstatus: pending\n',
    );
    mkdirSync(join(wsDir, 'task-002-orphan'), { recursive: true });
    // no status.yaml — orphan

    const orphans = findOrphanTasks(wsDir);
    expect(orphans).toEqual(['task-002-orphan']);
  });

  it('returns empty array when all tasks have status.yaml', () => {
    mkdirSync(join(wsDir, 'task-001-valid'), { recursive: true });
    writeFileSync(
      join(wsDir, 'task-001-valid', 'status.yaml'),
      'taskId: task-001-valid\nworkflow: feature-dev\nstatus: pending\n',
    );
    mkdirSync(join(wsDir, 'task-002-valid'), { recursive: true });
    writeFileSync(
      join(wsDir, 'task-002-valid', 'status.yaml'),
      'taskId: task-002-valid\nworkflow: bug-fix\nstatus: pending\n',
    );

    expect(findOrphanTasks(wsDir)).toEqual([]);
  });
});
