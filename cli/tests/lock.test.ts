import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { acquireLock, releaseLock, isLocked } from '../src/lock.js';
import { mkdirSync, rmSync } from 'fs';
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
