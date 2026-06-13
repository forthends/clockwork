# CLI Robustness Upgrade — Design Spec

**Date**: 2026-06-13
**Scope**: Lock TTL + cleanup command, task timeout detection, input validation, progress output for Clockwork CLI v0.2.0

## 1. Lock TTL + Cleanup Command

### 1.1 Lock file format upgrade (`cli/src/lock.ts`)

Lock files currently contain only an ISO timestamp. Upgrade to structured JSON:

```json
{ "acquiredAt": "2026-06-13T10:30:00.000Z", "pid": 12345 }
```

New functions:

- `isLockExpired(baseDir, resource, ttlMs)` — reads lock file, compares `acquiredAt + ttlMs` against now
- `cleanupLocks(baseDir, ttlMs)` — scans `.locks/`, removes expired ones, returns count

Default TTL: 30 minutes (1800000ms), configurable via `.clockwork/config.yaml` key `cli.lockTTLMinutes`.

### 1.2 Cleanup command (`cli/src/commands/cleanup.ts`)

```
clockwork cleanup                    Show summary of cleanable items
clockwork cleanup --lock             Clean expired locks only
clockwork cleanup --orphans          Clean orphan task directories only
clockwork cleanup --rebuild-index    Rebuild knowledge index only
clockwork cleanup --all              Execute all cleanup actions
```

**Orphan detection**: Iterate `workspace/` directories. A task is orphaned if `status.yaml` is missing, unreadable, or corrupted (fails YAML parse).

**Output** example:

```
Clockwork Cleanup

  Locks (2 expired):
    ✓ task-003-search.lock (expired 2h ago)
    ✓ task-004-tagging.lock (expired 1h ago)
    2 cleaned

  Orphans (1):
    ✓ task-005-corrupted/ (no status.yaml)
    1 cleaned

  Knowledge index:
    ✓ Rebuilt: 4 entries

  Done — 3 items cleaned
```

### 1.3 Config extension

Add to `.clockwork/config.yaml` default:

```yaml
cli:
  lockTTLMinutes: 30
```

## 2. Task Timeout Detection

### 2.1 `StageMeta` fields (already exist in `types.ts`)

- `startedAt: string` — ISO timestamp of stage start
- `timeoutMs: number` — timeout in milliseconds (default 600000 = 10min)

When a stage is marked `in_progress` via `updateTaskStatus`, `startedAt` is set to now.

### 2.2 status command — timeout warnings

When `stage === 'in_progress'` and `startedAt + timeoutMs < now`, display warning:

```
⚠ Stage 'implement' timed out (started 2h ago, timeout 10m)
```

Yellow text. Does NOT change task status.

### 2.3 resume command — timeout interception

If the current stage has timed out when resuming, prompt instead of auto-resuming:

```
Resuming task: task-003-user-registration
  Stage 'implement' has timed out (2h ago, timeout 10m).
  Choose: [R]etry  [S]kip  [T]erminate
```

| Action    | Effect                                              |
| --------- | --------------------------------------------------- |
| Retry     | Reset `startedAt`, set stage to `pending`, continue |
| Skip      | Mark stage as `completed`, advance to next stage    |
| Terminate | Mark task as `failed`                               |

Interactive prompt uses stdin.readline. Non-interactive mode (`--retry` / `--skip` / `--terminate` flags) for scripting.

## 3. Input Validation

### 3.1 slug validation (`start` command)

Pattern: `/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`
Reject: empty, uppercase, underscores, leading/trailing hyphens
Pass: `user-login`, `fix-auth-bug-42`, `v2`

### 3.2 task-id validation (`resume`, `review`, `status` commands)

Pattern: `/^task-\d{3}-[a-z0-9-]+$/`

### 3.3 repo URL validation (`repo add` command)

Pattern: `/^(https?:\/\/|git@)[^\s]+\.git$/`

### 3.4 approve/reject mutual exclusion (`review` command)

Error if both `--approve` and `--reject` are passed:

```
Error: --approve and --reject are mutually exclusive
```

### 3.5 Common behavior

All validation runs at command entry, before any file I/O. Failure message includes the expected format and example. Example:

```
Error: Invalid slug "Foo_Bar". Slugs must be lowercase alphanumeric with hyphens (e.g., "user-login").
```

## 4. Progress Output

### 4.1 Visual hierarchy (chalk colors)

| Level    | Color          | Prefix | Usage                   |
| -------- | -------------- | ------ | ----------------------- |
| Success  | `chalk.green`  | ✓      | Task created, done      |
| Info     | `chalk.dim`    | (none) | Metadata, details       |
| Warning  | `chalk.yellow` | ⚠      | Review pending, timeout |
| Error    | `chalk.red`    | ✗      | Failures                |
| Prompt   | `chalk.bold`   | (none) | Next steps, actions     |
| Code/cmd | `chalk.cyan`   | (none) | Claude Code commands    |

### 4.2 Per-command improvements

**`clockwork status` (no args)**:

```
Tasks:
  ▶ task-001-user-registration  feature-dev    in_progress
  · task-002-fix-auth          bug-fix         pending
  ✓ task-003-search             feature-dev     completed

3 tasks (1 in progress, 1 pending, 1 completed)
```

**`clockwork skill list`**:

```
Available skills (6):
  brainstorming          Analyze requirements and generate design options
  code-review            Review code changes for correctness and quality
  ...

6 skills loaded from skills/
```

**`clockwork start`** (add stage preview):

```
✓ Task created: task-004-tagging
  Workflow: feature-dev
  Stages:   plan → implement → review → deliver
  Next:     plan (planner) — Analyze requirements

  Start Claude Code and run:
  /clockwork:workflow-runner task-004-tagging
```

**`clockwork web`** (add page listing):

```
Clockwork workbench: http://localhost:4200

  Pages:
    /tasks               Task Board
    /tasks/:id           Task Detail
    /tasks/:id/review    Task Review
    /knowledge           Knowledge Base
```

**`clockwork resume`** (add recovery info):

```
Resuming task: task-001-user-registration
  Status:   interrupted → in_progress
  Recovery: Last stage was 'implement', snapshot found

  Start Claude Code and run:
  /clockwork:workflow-runner task-001-user-registration
```

## 5. Config (types.ts + config.ts)

Extend `ClockworkConfig`:

```typescript
cli: {
  lockTTLMinutes: number;
}
```

Default:

```typescript
cli: { lockTTLMinutes: 30 },
```

## 6. Verification

| Gate             | Command                                     |
| ---------------- | ------------------------------------------- |
| Tests pass       | `pnpm test`                                 |
| ESLint clean     | `pnpm lint`                                 |
| Build succeeds   | `pnpm build`                                |
| Cleanup dry run  | `clockwork cleanup` shows correct items     |
| Cleanup executes | `clockwork cleanup --all` removes correctly |
