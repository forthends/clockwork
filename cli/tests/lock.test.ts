import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { acquireLock, releaseLock, isLocked, isLockExpired, cleanupLocks } from '../src/lock.js';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('lock', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'clockwork-lock-test-' + Date.now());
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  });

  it('acquires a lock by creating a .lock file', () => {
    acquireLock(dir, 'test-task');
    expect(isLocked(dir, 'test-task')).toBe(true);
  });

  it('releases a lock by removing the .lock file', () => {
    acquireLock(dir, 'test-task');
    releaseLock(dir, 'test-task');
    expect(isLocked(dir, 'test-task')).toBe(false);
  });

  it('throws when acquiring an already locked resource', () => {
    acquireLock(dir, 'test-task');
    expect(() => acquireLock(dir, 'test-task')).toThrow(/locked/);
  });

  it('releaseLock is safe on non-existent lock', () => {
    expect(() => releaseLock(dir, 'nonexistent')).not.toThrow();
  });

  it('isLocked returns false for non-existent lock', () => {
    expect(isLocked(dir, 'nonexistent')).toBe(false);
  });
});

const TTL_MS = 30 * 60 * 1000;

describe('lock TTL and expiration', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-lock-ttl-' + Date.now());
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  });

  it('isLockExpired returns false for a fresh lock', () => {
    acquireLock(dir, 'task-001');
    expect(isLockExpired(dir, 'task-001', TTL_MS)).toBe(false);
  });

  it('isLockExpired returns true for a lock past TTL', () => {
    acquireLock(dir, 'task-001');
    const oldData = JSON.stringify({
      acquiredAt: new Date(Date.now() - TTL_MS - 1000).toISOString(),
      pid: process.pid,
    });
    writeFileSync(join(dir, '.locks', 'task-001.lock'), oldData);
    expect(isLockExpired(dir, 'task-001', TTL_MS)).toBe(true);
  });

  it('cleanupLocks removes expired locks and keeps fresh ones', () => {
    acquireLock(dir, 'fresh');
    acquireLock(dir, 'expired');
    const oldData = JSON.stringify({
      acquiredAt: new Date(Date.now() - TTL_MS - 1).toISOString(),
      pid: process.pid,
    });
    writeFileSync(join(dir, '.locks', 'expired.lock'), oldData);
    const count = cleanupLocks(dir, TTL_MS);
    expect(count).toBe(1);
    expect(existsSync(join(dir, '.locks', 'fresh.lock'))).toBe(true);
    expect(existsSync(join(dir, '.locks', 'expired.lock'))).toBe(false);
  });

  it('isLockExpired returns false when lock does not exist', () => {
    expect(isLockExpired(dir, 'nonexistent', TTL_MS)).toBe(false);
  });

  it('cleanupLocks returns 0 when no locks exist', () => {
    expect(cleanupLocks(dir, TTL_MS)).toBe(0);
  });
});
