import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOCK_DIR = '.locks';

function lockDir(baseDir: string): string {
  return join(baseDir, LOCK_DIR);
}

function lockPath(baseDir: string, resource: string): string {
  return join(lockDir(baseDir), `${resource}.lock`);
}

export function acquireLock(baseDir: string, resource: string): void {
  const dir = lockDir(baseDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = lockPath(baseDir, resource);
  if (existsSync(path)) {
    throw new Error(`Resource is locked: ${resource}`);
  }
  writeFileSync(path, new Date().toISOString());
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
