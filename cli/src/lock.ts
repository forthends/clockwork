import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface LockData {
  acquiredAt: string;
  pid: number;
}

const LOCK_DIR = '.locks';

function lockDir(baseDir: string): string {
  return join(baseDir, LOCK_DIR);
}

function lockPath(baseDir: string, resource: string): string {
  return join(lockDir(baseDir), `${resource}.lock`);
}

function readLockData(baseDir: string, resource: string): LockData | null {
  const path = lockPath(baseDir, resource);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as LockData;
  } catch {
    return null;
  }
}

export function acquireLock(baseDir: string, resource: string): void {
  const dir = lockDir(baseDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = lockPath(baseDir, resource);
  if (existsSync(path)) {
    throw new Error(`Resource is locked: ${resource}`);
  }
  const data: LockData = { acquiredAt: new Date().toISOString(), pid: process.pid };
  writeFileSync(path, JSON.stringify(data));
}

export function releaseLock(baseDir: string, resource: string): void {
  const path = lockPath(baseDir, resource);
  try {
    unlinkSync(path);
  } catch {}
}

export function isLocked(baseDir: string, resource: string): boolean {
  return existsSync(lockPath(baseDir, resource));
}

export function isLockExpired(baseDir: string, resource: string, ttlMs: number): boolean {
  const data = readLockData(baseDir, resource);
  if (!data) return false;
  const acquiredAt = new Date(data.acquiredAt).getTime();
  return Date.now() - acquiredAt > ttlMs;
}

export function cleanupLocks(baseDir: string, ttlMs: number): number {
  const dir = lockDir(baseDir);
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.name.endsWith('.lock')) continue;
    const resource = entry.name.replace('.lock', '');
    if (isLockExpired(baseDir, resource, ttlMs)) {
      releaseLock(baseDir, resource);
      count++;
    }
  }
  return count;
}

export async function withLock<T>(
  baseDir: string,
  resource: string,
  fn: () => T | Promise<T>,
  maxRetries = 3,
  retryMs = 500,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      acquireLock(baseDir, resource);
      try {
        return await fn();
      } finally {
        releaseLock(baseDir, resource);
      }
    } catch (err) {
      if (attempt === maxRetries || !(err instanceof Error && err.message.includes('locked'))) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, retryMs));
    }
  }
  throw new Error(`Could not acquire lock after ${maxRetries} retries`);
}
