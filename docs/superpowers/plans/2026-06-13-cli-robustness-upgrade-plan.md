# CLI Robustness Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lock TTL + cleanup command, task timeout detection, input validation, and polished progress output to the Clockwork CLI.

**Architecture:** Five sequential phases — upgrade lock format with TTL support, build cleanup command on top, add timeout detection to status/resume, add input validation to all commands, then polish progress output. Each phase has its own test gate.

**Tech Stack:** TypeScript, vitest, chalk, commander.js, Node.js readline

---

### Task 1: Upgrade lock format to structured JSON with TTL

**Files:**

- Modify: `cli/src/lock.ts`
- Modify: `cli/src/types.ts` (add `cli: { lockTTLMinutes: number }` to `ClockworkConfig`)
- Modify: `cli/src/config.ts` (add default `cli.lockTTLMinutes: 30`)
- Modify: `cli/tests/lock.test.ts`

- [ ] **Step 1: Add `cli` field to `ClockworkConfig` in types.ts**

In `cli/src/types.ts`, add to the `ClockworkConfig` interface before the closing brace:

```ts
cli: {
  lockTTLMinutes: number;
}
```

- [ ] **Step 2: Add default in config.ts**

In `cli/src/config.ts`, add to `DEFAULT_CONFIG`:

```ts
  cli: { lockTTLMinutes: 30 },
```

- [ ] **Step 3: Write failing tests for the new lock features**

Edit `cli/tests/lock.test.ts` — add tests at the end of the existing describe block:

```ts
const TTL_MS = 30 * 60 * 1000; // 30 minutes

describe('lock TTL and expiration', () => {
  const testBase = join(tmpdir(), 'cw-lock-ttl-test-' + Date.now());
  const lockDir = join(testBase, '.locks');

  beforeEach(() => {
    mkdirSync(testBase, { recursive: true });
  });

  afterEach(() => {
    rmSync(testBase, { recursive: true, force: true });
  });

  it('isLockExpired returns false for a fresh lock (within TTL)', () => {
    acquireLock(testBase, 'task-001');
    expect(isLockExpired(testBase, 'task-001', TTL_MS)).toBe(false);
  });

  it('isLockExpired returns true for a lock past TTL', () => {
    acquireLock(testBase, 'task-001');
    // Manually write old timestamp to simulate expired lock
    const oldData = JSON.stringify({
      acquiredAt: new Date(Date.now() - TTL_MS - 1000).toISOString(),
      pid: process.pid,
    });
    writeFileSync(join(lockDir, 'task-001.lock'), oldData);
    expect(isLockExpired(testBase, 'task-001', TTL_MS)).toBe(true);
  });

  it('cleanupLocks removes expired locks and keeps fresh ones', () => {
    acquireLock(testBase, 'fresh');
    acquireLock(testBase, 'expired');
    const oldData = JSON.stringify({ acquiredAt: new Date(Date.now() - TTL_MS - 1).toISOString(), pid: process.pid });
    writeFileSync(join(lockDir, 'expired.lock'), oldData);
    const count = cleanupLocks(testBase, TTL_MS);
    expect(count).toBe(1);
    expect(existsSync(join(lockDir, 'fresh.lock'))).toBe(true);
    expect(existsSync(join(lockDir, 'expired.lock'))).toBe(false);
  });

  it('acquireLock throws on fresh but not on expired lock when using withLock', () => {
    acquireLock(testBase, 'worker');
    // Write an expired timestamp
    const oldData = JSON.stringify({ acquiredAt: new Date(Date.now() - TTL_MS - 1).toISOString(), pid: process.pid });
    writeFileSync(join(lockDir, 'worker.lock'), oldData);
    // Should not throw — withLock checks expiry
    expect(() => acquireLock(testBase, 'worker')).not.toThrow(); // stale lock treated as available
  });
});
```

Also add missing imports at the top of the test file:

```ts
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd cli && pnpm vitest run tests/lock.test.ts
```

Expected: New tests FAIL — `isLockExpired`, `cleanupLocks` not defined.

- [ ] **Step 5: Implement structured lock format + TTL functions**

Replace `cli/src/lock.ts` content:

```ts
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { loadConfig } from './config.js';

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
    // Check TTL
    const config = loadConfig(baseDir);
    const ttlMs = (config.cli?.lockTTLMinutes ?? 30) * 60 * 1000;
    if (isLockExpired(baseDir, resource, ttlMs)) {
      releaseLock(baseDir, resource);
    } else {
      throw new Error(`Resource is locked: ${resource}`);
    }
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
  if (!data) return false; // not locked
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
```

- [ ] **Step 6: Run lock tests to verify they pass**

```bash
cd cli && pnpm vitest run tests/lock.test.ts
```

Expected: All lock tests PASS.

- [ ] **Step 7: Commit**

```bash
git add cli/src/lock.ts cli/src/types.ts cli/src/config.ts cli/tests/lock.test.ts
git commit -m "feat: upgrade lock format to structured JSON with TTL support"
```

---

### Task 2: Build cleanup command

**Files:**

- Create: `cli/src/commands/cleanup.ts`
- Modify: `cli/src/index.ts` (register command)
- Create: `cli/tests/commands/cleanup.test.ts`

- [ ] **Step 1: Write failing test for cleanup command**

Create `cli/tests/commands/cleanup.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('cleanup locks', () => {
  const testBase = join(tmpdir(), 'cw-cleanup-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(testBase, { recursive: true });
    mkdirSync(join(testBase, '.clockwork'), { recursive: true });
    mkdirSync(join(testBase, '.locks'), { recursive: true });
    mkdirSync(join(testBase, 'workspace'), { recursive: true });
    writeFileSync(
      join(testBase, '.clockwork', 'config.yaml'),
      [
        'project:',
        '  name: test',
        'ide:',
        '  primary: claude-code',
        'agents:',
        '  dir: agents/',
        '  defaultModel: sonnet',
        'knowledge:',
        '  dir: knowledge/',
        '  index: knowledge/index.yaml',
        '  maxEntriesPerQuery: 5',
        'workflows:',
        '  dir: workflows/',
        'repos:',
        '  dir: repos/',
        'workspace:',
        '  dir: workspace/',
        'web:',
        '  port: 4200',
        '  host: localhost',
        'cli:',
        '  lockTTLMinutes: 30',
      ].join('\n'),
    );
  });

  afterEach(() => {
    rmSync(testBase, { recursive: true, force: true });
  });

  it('removes expired lock files', () => {
    const oldData = JSON.stringify({ acquiredAt: new Date(Date.now() - 3600000).toISOString(), pid: process.pid });
    writeFileSync(join(testBase, '.locks', 'task-001.lock'), oldData);

    const { cleanupLocks } = require('../src/lock.js');
    const count = cleanupLocks(testBase, 30 * 60 * 1000);
    expect(count).toBe(1);
    expect(existsSync(join(testBase, '.locks', 'task-001.lock'))).toBe(false);
  });

  it('keeps fresh lock files', () => {
    const freshData = JSON.stringify({ acquiredAt: new Date().toISOString(), pid: process.pid });
    writeFileSync(join(testBase, '.locks', 'fresh.lock'), freshData);

    const { cleanupLocks } = require('../src/lock.js');
    const count = cleanupLocks(testBase, 30 * 60 * 1000);
    expect(count).toBe(0);
    expect(existsSync(join(testBase, '.locks', 'fresh.lock'))).toBe(true);
  });
});

describe('cleanup orphans', () => {
  const testBase = join(tmpdir(), 'cw-orphan-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(testBase, { recursive: true });
    mkdirSync(join(testBase, '.clockwork'), { recursive: true });
    writeFileSync(
      join(testBase, '.clockwork', 'config.yaml'),
      [
        'project:',
        '  name: test',
        'ide:',
        '  primary: claude-code',
        'agents:',
        '  dir: agents/',
        '  defaultModel: sonnet',
        'knowledge:',
        '  dir: knowledge/',
        '  index: knowledge/index.yaml',
        '  maxEntriesPerQuery: 5',
        'workflows:',
        '  dir: workflows/',
        'repos:',
        '  dir: repos/',
        'workspace:',
        '  dir: workspace/',
        'web:',
        '  port: 4200',
        '  host: localhost',
        'cli:',
        '  lockTTLMinutes: 30',
      ].join('\n'),
    );
    mkdirSync(join(testBase, 'workspace', 'task-001-valid'), { recursive: true });
    writeFileSync(
      join(testBase, 'workspace', 'task-001-valid', 'status.yaml'),
      'taskId: task-001-valid\nworkflow: feature-dev\nstatus: pending\n',
    );
    mkdirSync(join(testBase, 'workspace', 'task-002-orphan'), { recursive: true });
    // no status.yaml — orphan
  });

  afterEach(() => {
    rmSync(testBase, { recursive: true, force: true });
  });

  it('detects orphan task directories without status.yaml', () => {
    const { findOrphanTasks } = require('../src/commands/cleanup.js');
    const wsDir = join(testBase, 'workspace');
    const orphans = findOrphanTasks(wsDir);
    expect(orphans).toEqual(['task-002-orphan']);
  });

  it('returns empty array when all tasks have status.yaml', () => {
    writeFileSync(
      join(testBase, 'workspace', 'task-002-orphan', 'status.yaml'),
      'taskId: task-002-orphan\nworkflow: bug-fix\nstatus: pending\n',
    );
    const { findOrphanTasks } = require('../src/commands/cleanup.js');
    const orphans = findOrphanTasks(join(testBase, 'workspace'));
    expect(orphans).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd cli && pnpm vitest run tests/commands/cleanup.test.ts
```

Expected: FAIL — `cleanup` command module not found.

- [ ] **Step 3: Implement cleanup command**

Create `cli/src/commands/cleanup.ts`:

```ts
import { Command } from 'commander';
import { join } from 'path';
import { existsSync, readdirSync, rmSync } from 'fs';
import { loadConfig } from '../config.js';
import { cleanupLocks } from '../lock.js';
import { buildIndex, saveIndex } from '../knowledge-indexer.js';
import chalk from 'chalk';

export function findOrphanTasks(workspaceDir: string): string[] {
  if (!existsSync(workspaceDir)) return [];
  return readdirSync(workspaceDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('task-'))
    .filter((e) => !existsSync(join(workspaceDir, e.name, 'status.yaml')))
    .map((e) => e.name);
}

export function cleanupCommand(): Command {
  const cmd = new Command('cleanup').description('Clean up expired locks, orphan tasks, and stale data');

  return cmd
    .option('--lock', 'Clean expired lock files only')
    .option('--orphans', 'Remove orphan task directories')
    .option('--rebuild-index', 'Rebuild knowledge index')
    .option('--all', 'Run all cleanup actions')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action(
      (options: { lock?: boolean; orphans?: boolean; rebuildIndex?: boolean; all?: boolean; project: string }) => {
        const config = loadConfig(options.project);
        const ttlMs = (config.cli?.lockTTLMinutes ?? 30) * 60 * 1000;
        const doLock = options.lock || options.all;
        const doOrphans = options.orphans || options.all;
        const doIndex = options.rebuildIndex || options.all;
        const doAll = !options.lock && !options.orphans && !options.rebuildIndex;

        if (doAll) {
          // Summary mode — show what would be cleaned
          const lockDir = join(options.project, '.locks');
          let expiredCount = 0;
          if (existsSync(lockDir)) {
            for (const f of readdirSync(lockDir)) {
              if (f.endsWith('.lock')) {
                const { isLockExpired } = require('../lock.js');
                if (isLockExpired(options.project, f.replace('.lock', ''), ttlMs)) expiredCount++;
              }
            }
          }
          const wsDir = join(options.project, config.workspace.dir);
          const orphans = findOrphanTasks(wsDir);

          console.log(chalk.bold('Clockwork Cleanup'));
          console.log('');
          if (expiredCount > 0 || doAll) {
            console.log(chalk.dim(`  Locks (${expiredCount} expired):`));
            if (expiredCount === 0) console.log(chalk.dim('    No expired locks'));
            console.log(chalk.dim(`    Run with --lock to clean ${expiredCount} expired lock(s)`));
          }
          console.log('');
          if (orphans.length > 0 || doAll) {
            console.log(chalk.dim(`  Orphans (${orphans.length}):`));
            orphans.forEach((o) => console.log(chalk.dim(`    ${o}/ (no status.yaml)`)));
            if (orphans.length === 0) console.log(chalk.dim('    No orphan tasks'));
            if (orphans.length > 0)
              console.log(chalk.dim(`    Run with --orphans to remove ${orphans.length} orphan(s)`));
          }
          console.log('');
          console.log(chalk.dim('  Use --lock, --orphans, --rebuild-index, or --all to execute cleanup.'));
          return;
        }

        console.log(chalk.bold('Clockwork Cleanup'));
        console.log('');
        let totalCleaned = 0;

        if (doLock) {
          console.log(chalk.dim(`  Locks:`));
          const count = cleanupLocks(options.project, ttlMs);
          console.log(chalk.green(`    ✓ ${count} expired lock(s) cleaned`));
          totalCleaned += count;
        }

        if (doOrphans) {
          console.log(chalk.dim(`  Orphans:`));
          const wsDir = join(options.project, config.workspace.dir);
          const orphans = findOrphanTasks(wsDir);
          orphans.forEach((o) => {
            rmSync(join(wsDir, o), { recursive: true, force: true });
            console.log(chalk.green(`    ✓ ${o}/`));
          });
          if (orphans.length === 0) console.log(chalk.dim('    No orphan tasks'));
          totalCleaned += orphans.length;
        }

        if (doIndex) {
          console.log(chalk.dim(`  Knowledge index:`));
          const knowledgeDir = join(options.project, config.knowledge.dir);
          const index = buildIndex(knowledgeDir);
          saveIndex(knowledgeDir, index);
          console.log(chalk.green(`    ✓ Rebuilt: ${index.entries.length} entries`));
          totalCleaned += index.entries.length;
        }

        console.log('');
        console.log(chalk.green(`  Done — ${totalCleaned} items cleaned`));
      },
    );
}
```

- [ ] **Step 4: Register cleanup command in index.ts**

Edit `cli/src/index.ts` — add after the web import:

```ts
import { cleanupCommand } from './commands/cleanup.js';
```

Add before `program.parse()`:

```ts
program.addCommand(cleanupCommand());
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd cli && pnpm vitest run tests/commands/cleanup.test.ts
```

Expected: All cleanup tests PASS.

- [ ] **Step 6: Run full test suite**

```bash
cd cli && pnpm test
```

Expected: All existing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add cli/src/commands/cleanup.ts cli/src/index.ts cli/tests/commands/cleanup.test.ts
git commit -m "feat: add cleanup command for expired locks, orphan tasks, and index rebuild"
```

---

### Task 3: Add timeout detection to status and resume commands

**Files:**

- Modify: `cli/src/workspace.ts` (set `startedAt` in `updateTaskStatus`)
- Modify: `cli/src/commands/status.ts` (show timeout warnings, summary count)
- Modify: `cli/src/commands/resume.ts` (interactive timeout prompt)
- Modify: `cli/tests/workspace.test.ts` (verify startedAt is set)
- Modify: `cli/tests/commands/status.test.ts` (verify timeout warning)

- [ ] **Step 1: Set startedAt in updateTaskStatus**

Edit `cli/src/workspace.ts` — in `updateTaskStatus`, after setting `task.currentStage`, add:

```ts
if (!task.stageMeta) task.stageMeta = {};
if (!task.stageMeta[currentStage]) {
  task.stageMeta[currentStage] = {
    retryCount: 0,
    maxRetries: 3,
    startedAt: new Date().toISOString(),
    timeoutMs: 600000,
  };
}
task.stageMeta[currentStage].startedAt = new Date().toISOString();
```

- [ ] **Step 2: Add timeout warning to status command**

Edit `cli/src/commands/status.ts` — after printing stage status on line 24, add timeout check:

```ts
if (taskId) {
  // ... existing detail output ...
  const currentMeta = task.stageMeta?.[task.currentStage];
  if (currentMeta && task.stages[task.currentStage] === 'in_progress') {
    const startedAt = new Date(currentMeta.startedAt).getTime();
    const timeoutMs = currentMeta.timeoutMs || 600000;
    if (startedAt && Date.now() - startedAt > timeoutMs) {
      const ago = formatDuration(Date.now() - startedAt);
      const limit = formatDuration(timeoutMs);
      console.log(chalk.yellow(`  ⚠ Stage '${task.currentStage}' timed out (started ${ago} ago, timeout ${limit})`));
    }
  }
}
```

Add helper at end of file:

```ts
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
```

Also update the no-args output to include summary. Replace the `listTasks` loop with:

```ts
const tasks = listTasks(wsDir);
if (tasks.length === 0) {
  console.log(chalk.dim('No tasks found'));
  return;
}
console.log(chalk.bold('Tasks:'));
for (const task of tasks) {
  const icon = colorStatus(task.status);
  console.log(`  ${icon} ${task.taskId.padEnd(28)} ${chalk.dim(task.workflow.padEnd(16))} ${task.status}`);
}
const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
const pending = tasks.filter((t) => t.status === 'pending').length;
const completed = tasks.filter((t) => t.status === 'completed').length;
console.log('');
console.log(chalk.dim(`${tasks.length} tasks (${inProgress} in progress, ${pending} pending, ${completed} completed)`));
```

- [ ] **Step 3: Add timeout interception to resume command**

Edit `cli/src/commands/resume.ts` — replace the main action body to add timeout check before restoring. After loading the task and before the `humanReviewPending` check, insert:

```ts
const currentMeta = task.stageMeta?.[task.currentStage];
if (currentMeta && task.stages[task.currentStage] === 'in_progress') {
  const startedAt = new Date(currentMeta.startedAt).getTime();
  const timeoutMs = currentMeta.timeoutMs || 600000;
  if (startedAt && Date.now() - startedAt > timeoutMs) {
    const ago = formatDuration(Date.now() - startedAt);
    const limit = formatDuration(timeoutMs);
    console.log(chalk.yellow(`  Stage '${task.currentStage}' has timed out (${ago} ago, timeout ${limit}).`));

    // Check for non-interactive flags
    if (options.retry) {
      task.stages[task.currentStage] = 'pending';
      task.stageMeta![task.currentStage].startedAt = '';
      console.log(chalk.green('  Action: Retry — stage reset to pending'));
    } else if (options.skip) {
      task.stages[task.currentStage] = 'completed';
      console.log(chalk.green('  Action: Skip — stage marked as completed'));
    } else if (options.terminate) {
      task.status = 'failed';
      writeFileSync(join(wsDir, task.taskId, 'status.yaml'), stringifyYaml(task));
      console.log(chalk.red('  Action: Terminate — task marked as failed'));
      return;
    } else {
      // Interactive — but since CLI can't really be interactive via commander,
      // show the options and exit
      console.log(chalk.bold('  Choose an action:'));
      console.log(chalk.dim('    --retry      Reset stage and try again'));
      console.log(chalk.dim('    --skip       Mark stage complete and continue'));
      console.log(chalk.dim('    --terminate  Mark task as failed'));
      console.log('');
      console.log(chalk.bold('  Example: clockwork resume ' + taskId + ' --retry'));
      return;
    }
    writeFileSync(join(wsDir, task.taskId, 'status.yaml'), stringifyYaml(task));
  }
}
```

Add new CLI options to the resume command definition:

```ts
    .option('--retry', 'Retry a timed-out stage')
    .option('--skip', 'Skip a timed-out stage')
    .option('--terminate', 'Terminate a timed-out task')
```

Add imports at top:

```ts
import { writeFileSync } from 'fs';
import { stringify as stringifyYaml } from 'yaml';
```

Add the `formatDuration` helper (same as in status.ts).

- [ ] **Step 4: Run full test suite**

```bash
cd cli && pnpm test
```

Expected: All existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add cli/src/workspace.ts cli/src/commands/status.ts cli/src/commands/resume.ts
git commit -m "feat: add task stage timeout detection and recovery options"
```

---

### Task 4: Add input validation to commands

**Files:**

- Modify: `cli/src/commands/start.ts` (slug validation)
- Modify: `cli/src/commands/review.ts` (mutual exclusion)
- Modify: `cli/src/commands/repo.ts` (URL validation)

- [ ] **Step 1: Add slug validation to start command**

In `cli/src/commands/start.ts`, add at the top of the action callback, before `loadConfig`:

```ts
const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
if (!SLUG_RE.test(options.slug)) {
  console.error(chalk.red(`Error: Invalid slug "${options.slug}".`));
  console.error(chalk.dim('  Slugs must be lowercase alphanumeric with optional hyphens.'));
  console.error(chalk.dim('  Examples: "user-login", "fix-auth-bug-42", "v2"'));
  process.exit(1);
}
```

- [ ] **Step 2: Add mutual exclusion to review command**

In `cli/src/commands/review.ts`, add at the top of the action callback:

```ts
if (options.approve && options.reject) {
  console.error(chalk.red('Error: --approve and --reject are mutually exclusive'));
  process.exit(1);
}
```

- [ ] **Step 3: Add URL validation to repo add command**

In `cli/src/commands/repo.ts`, add at the top of the `add` action callback:

```ts
const GIT_URL_RE = /^(https?:\/\/|git@)[^\s]+\.git$/;
if (!GIT_URL_RE.test(url)) {
  console.error(chalk.red(`Error: Invalid repository URL "${url}".`));
  console.error(chalk.dim('  URL must start with git@ or https:// and end with .git'));
  console.error(chalk.dim('  Examples: "https://github.com/org/repo.git", "git@github.com:org/repo.git"'));
  process.exit(1);
}
```

- [ ] **Step 3.5: Add task-id validation to resume and review commands**

In `cli/src/commands/resume.ts`, add at the top of the action callback:

```ts
const TASK_ID_RE = /^task-\d{3}-[a-z0-9-]+$/;
if (!TASK_ID_RE.test(taskId)) {
  console.error(chalk.red(`Error: Invalid task ID "${taskId}".`));
  console.error(chalk.dim('  Task IDs must match the pattern: task-NNN-slug'));
  console.error(chalk.dim('  Example: "task-001-user-login"'));
  process.exit(1);
}
```

In `cli/src/commands/review.ts`, add the same validation at the top of the action callback:

```ts
const TASK_ID_RE = /^task-\d{3}-[a-z0-9-]+$/;
if (!TASK_ID_RE.test(taskId)) {
  console.error(chalk.red(`Error: Invalid task ID "${taskId}".`));
  console.error(chalk.dim('  Task IDs must match the pattern: task-NNN-slug'));
  console.error(chalk.dim('  Example: "task-001-user-login"'));
  process.exit(1);
}
```

- [ ] **Step 4: Run full test suite**

```bash
cd cli && pnpm test
```

Expected: All existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/start.ts cli/src/commands/review.ts cli/src/commands/repo.ts cli/src/commands/resume.ts
git commit -m "feat: add input validation for slug, repo URL, task ID, and review flags"
```

---

### Task 5: Polish progress output across all commands

**Files:**

- Modify: `cli/src/commands/start.ts` (stage preview)
- Modify: `cli/src/commands/skill.ts` (count summary)
- Modify: `cli/src/commands/web.ts` (page listing)
- Modify: `cli/src/commands/resume.ts` (recovery info)

- [ ] **Step 1: Add stage preview to start command**

In `cli/src/commands/start.ts`, after the "Task created" message, add:

```ts
const stageNames = wf.stages.map((s) => s.id).join(' → ');
console.log(chalk.dim(`  Stages:   ${stageNames}`));

const nextStage = wf.stages[0];
if (nextStage.agent !== 'none') {
  console.log(chalk.dim(`  Next:     ${nextStage.id} (${nextStage.agent}) — ${nextStage.description}`));
}
```

- [ ] **Step 2: Add count summary to skill list**

In `cli/src/commands/skill.ts`, replace the action body. Keep the existing loop but add count tracking and summary:

Replace the action callback with:

```ts
    .action((options: { project: string }) => {
      const skillsDir = join(options.project, 'skills');

      if (!existsSync(skillsDir)) {
        console.log(chalk.dim('No skills directory found'));
        return;
      }

      const entries = readdirSync(skillsDir, { withFileTypes: true });
      let count = 0;
      console.log(chalk.bold(`Available skills:`));
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillPath = join(skillsDir, entry.name, 'SKILL.md');
        if (!existsSync(skillPath)) continue;
        try {
          const { frontmatter } = parseFrontmatter<{ name: string; description: string }>(skillPath);
          const name = frontmatter.name.padEnd(22);
          console.log(`  ${chalk.bold(name)} ${chalk.dim(frontmatter.description.slice(0, 80))}`);
          count++;
        } catch {
          const name = entry.name.padEnd(22);
          console.log(`  ${chalk.dim(name)} (no valid SKILL.md)`);
        }
      }
      console.log('');
      console.log(chalk.dim(`${count} skills loaded from skills/`));
    });
```

- [ ] **Step 3: Add page listing to web command**

In `cli/src/commands/web.ts`, after `startServer(options.project)`, add:

```ts
// Pages are listed by the server on startup — add to server output
```

Instead, modify `cli/src/server.ts` to print page listing on startup. Add after the existing listen callback:

```ts
const port = config.web.port;
const host = config.web.host;
app.listen(port, host, () => {
  console.log(chalk.bold(`Clockwork workbench: http://${host}:${port}`));
  console.log('');
  console.log(chalk.dim('  Pages:'));
  console.log(chalk.dim(`    /tasks               Task Board`));
  console.log(chalk.dim(`    /tasks/:id           Task Detail`));
  console.log(chalk.dim(`    /tasks/:id/review    Task Review`));
  console.log(chalk.dim(`    /knowledge           Knowledge Base`));
});
```

Add `import chalk from 'chalk'` to server.ts.

- [ ] **Step 4: Run full test suite**

```bash
cd cli && pnpm test
```

Expected: All existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/start.ts cli/src/commands/skill.ts cli/src/commands/web.ts cli/src/server.ts cli/src/commands/resume.ts
git commit -m "feat: polish CLI progress output with summaries, stage previews, and page listings"
```

---

### Task 6: Final verification

- [ ] **Step 1: Full test suite**

```bash
pnpm test
```

Target: All 57+ CLI tests pass, 22 workbench tests pass.

- [ ] **Step 2: Lint check**

```bash
pnpm lint
```

Target: 0 errors.

- [ ] **Step 3: Full build**

```bash
pnpm build
```

Target: Both packages build successfully.

- [ ] **Step 4: Manual smoke test**

```bash
# Build and link globally
pnpm build:cli
npm link

# Test cleanup
clockwork cleanup

# Test slug validation
clockwork start feature-dev --slug "BAD_SLUG" --requirements "test"
# Expected: Error message about invalid slug

# Test review mutual exclusion
clockwork review task-001-test --approve --reject "reason"
# Expected: Error about mutual exclusivity

# Test status output
clockwork status
# Expected: Aligned table with summary

npm unlink -g @clockwork/cli
```

- [ ] **Step 5: Commit remaining files**

```bash
git add -u
git commit -m "chore: final verification and cleanup for CLI robustness upgrade"
```
