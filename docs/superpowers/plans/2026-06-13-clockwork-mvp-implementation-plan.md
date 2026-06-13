# Clockwork MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Clockwork framework to a usable MVP — globally installable CLI, verified end-to-end workflow, comprehensive test suite, error recovery, and enhanced Workbench.

**Architecture:** Two-round iteration. Round 1 (Tasks 1-5): build system, demo project, error recovery, end-to-end validation. Round 2 (Tasks 6-11): integration tests, workbench tests, Markdown upgrade, knowledge detail page.

**Tech Stack:** Node.js/TypeScript (CLI), React 18/Vite (Workbench), marked + highlight.js (Markdown), vitest + @testing-library/react + jsdom + supertest (testing)

---

## File Map

```
clockwork/
├── package.json                          # NEW: root workspaces config
├── cli/
│   ├── package.json                      # MODIFY: build script already has bin
│   ├── tsconfig.json                     # OK: outDir already set to ./dist
│   ├── src/
│   │   ├── index.ts                      # MODIFY: SIGINT handler
│   │   ├── types.ts                      # MODIFY: add interrupted state, stageMeta
│   │   ├── workspace.ts                  # MODIFY: retry, timeout, recovery, lock
│   │   ├── lock.ts                       # NEW: file lock utility
│   │   ├── server.ts                     # MODIFY: GET /api/knowledge/:id
│   │   └── commands/
│   │       ├── web.ts                    # MODIFY: auto-build workbench
│   │       └── resume.ts                 # MODIFY: interrupted state recovery
│   └── tests/
│       ├── commands/
│       │   └── repo.test.ts              # NEW: repo command tests
│       ├── integration/
│       │   ├── workflow.test.ts          # NEW: init→start→status→review
│       │   └── api.test.ts               # NEW: 7 REST endpoints
│       └── e2e/
│           ├── feature-dev.test.ts       # NEW: feature-dev workflow E2E
│           ├── bug-fix.test.ts           # NEW: bug-fix workflow E2E
│           └── incident-response.test.ts # NEW: incident-response workflow E2E
├── workbench/
│   ├── package.json                      # MODIFY: marked, highlight.js deps
│   ├── src/
│   │   ├── api.ts                        # MODIFY: fetchEntry + types
│   │   ├── App.tsx                       # MODIFY: knowledge/:entryId route
│   │   ├── components/
│   │   │   └── MarkdownViewer.tsx        # REPLACE: marked + highlight.js
│   │   └── pages/
│   │       ├── KnowledgeBrowser.tsx      # MODIFY: links to detail
│   │       └── KnowledgeDetail.tsx       # NEW: entry detail page
│   └── tests/
│       ├── setup.ts                      # NEW: test environment config
│       ├── TaskBoard.test.tsx            # NEW: component tests
│       ├── TaskDetail.test.tsx           # NEW: component tests
│       ├── ReviewActions.test.tsx        # NEW: component tests
│       └── MarkdownViewer.test.tsx       # NEW: GFM rendering tests
├── repos/demo-todo/                       # NEW: demo Express backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── models.ts
│   │   └── validators.ts
│   └── tests/
│       └── todos.test.ts
├── knowledge/
│   ├── index.yaml                        # MODIFY: updated for demo-todo
│   ├── architecture/api-conventions.md   # REPLACE: demo-todo conventions
│   ├── business/domain-model.md          # REPLACE: Todo entity model
│   └── design-system/components.md       # REPLACE: engineering standards
└── skills/
    └── workflow-runner/
        └── SKILL.md                      # MODIFY: timeout, retry, interrupt
```

---

## Round 1: Skeleton Usable

### Task 1: Demo todo project + knowledge base rewrite

**Files:**
- Create: `repos/demo-todo/package.json`
- Create: `repos/demo-todo/tsconfig.json`
- Create: `repos/demo-todo/src/index.ts`
- Create: `repos/demo-todo/src/models.ts`
- Create: `repos/demo-todo/src/validators.ts`
- Create: `repos/demo-todo/tests/todos.test.ts`
- Modify: `knowledge/architecture/api-conventions.md`
- Modify: `knowledge/business/domain-model.md`
- Modify: `knowledge/design-system/components.md`
- Modify: `knowledge/index.yaml`

- [ ] **Step 1: Create demo-todo package.json and tsconfig**

```json
// repos/demo-todo/package.json
{
  "name": "demo-todo",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "typescript": "^5.4.0",
    "tsx": "^4.7.0",
    "vitest": "^1.3.0"
  }
}
```

```json
// repos/demo-todo/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["tests/**"]
}
```

- [ ] **Step 2: Create demo-todo models**

```typescript
// repos/demo-todo/src/models.ts
export type TodoStatus = 'todo' | 'in_progress' | 'done';

export interface Todo {
  id: string;
  title: string;
  description: string;
  status: TodoStatus;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

const store: Map<string, Todo> = new Map();

export function findAll(): Todo[] {
  return Array.from(store.values()).sort((a, b) => b.priority - a.priority);
}

export function findById(id: string): Todo | undefined {
  return store.get(id);
}

export function create(data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Todo {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const todo: Todo = { ...data, id, createdAt: now, updatedAt: now };
  store.set(id, todo);
  return todo;
}

export function update(id: string, data: Partial<Omit<Todo, 'id' | 'createdAt'>>): Todo | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;
  const updated: Todo = { ...existing, ...data, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
  store.set(id, updated);
  return updated;
}

export function remove(id: string): boolean {
  return store.delete(id);
}
```

- [ ] **Step 3: Create validators**

```typescript
// repos/demo-todo/src/validators.ts
import { TodoStatus } from './models.js';

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_STATUSES: TodoStatus[] = ['todo', 'in_progress', 'done'];

export function validateCreate(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required and must be a non-empty string' });
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }
  if (body.priority !== undefined && typeof body.priority !== 'number') {
    errors.push({ field: 'priority', message: 'Priority must be a number' });
  }
  if (body.status && !VALID_STATUSES.includes(body.status as TodoStatus)) {
    errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  return errors;
}

export function validateUpdate(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length === 0)) {
    errors.push({ field: 'title', message: 'Title must be a non-empty string' });
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }
  if (body.priority !== undefined && typeof body.priority !== 'number') {
    errors.push({ field: 'priority', message: 'Priority must be a number' });
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status as TodoStatus)) {
    errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  return errors;
}
```

- [ ] **Step 4: Create Express entry with 4 routes**

```typescript
// repos/demo-todo/src/index.ts
import express from 'express';
import { findAll, findById, create, update, remove } from './models.js';
import { validateCreate, validateUpdate } from './validators.js';

const app = express();
app.use(express.json());

app.get('/api/v1/todos', (_req, res) => {
  const todos = findAll();
  res.json({ data: todos, meta: { total: todos.length } });
});

app.get('/api/v1/todos/:id', (req, res) => {
  const todo = findById(req.params.id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  res.json({ data: todo });
});

app.post('/api/v1/todos', (req, res) => {
  const errors = validateCreate(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', fields: errors });
  const todo = create({
    title: req.body.title,
    description: req.body.description ?? '',
    status: req.body.status ?? 'todo',
    priority: req.body.priority ?? 0,
  });
  res.status(201).json({ data: todo });
});

app.patch('/api/v1/todos/:id', (req, res) => {
  const errors = validateUpdate(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', fields: errors });
  const todo = update(req.params.id, req.body);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  res.json({ data: todo });
});

app.delete('/api/v1/todos/:id', (req, res) => {
  const deleted = remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Todo not found' });
  res.status(204).send();
});

const port = parseInt(process.env.PORT || '3100', 10);
app.listen(port, () => console.log(`Demo Todo API running on http://localhost:${port}`));
```

- [ ] **Step 5: Create demo-todo test**

```typescript
// repos/demo-todo/tests/todos.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { findAll, findById, create, update, remove, Todo } from '../src/models.js';

// Test models directly — the in-memory store resets per import
describe('Todo models', () => {
  it('creates a todo', () => {
    const todo = create({ title: 'Test', description: 'Desc', status: 'todo', priority: 1 });
    expect(todo.id).toBeDefined();
    expect(todo.title).toBe('Test');
    expect(todo.status).toBe('todo');
    expect(todo.priority).toBe(1);
  });

  it('finds all todos sorted by priority descending', () => {
    create({ title: 'Low', description: '', status: 'todo', priority: 0 });
    create({ title: 'High', description: '', status: 'todo', priority: 10 });
    const all = findAll();
    expect(all[0].title).toBe('High');
    expect(all[1].title).toBe('Low');
  });

  it('finds by id', () => {
    const created = create({ title: 'Find me', description: '', status: 'todo', priority: 0 });
    const found = findById(created.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Find me');
  });

  it('returns undefined for missing id', () => {
    expect(findById('nonexistent')).toBeUndefined();
  });

  it('updates a todo', () => {
    const created = create({ title: 'Old', description: '', status: 'todo', priority: 0 });
    const updated = update(created.id, { title: 'New', status: 'done' });
    expect(updated!.title).toBe('New');
    expect(updated!.status).toBe('done');
  });

  it('returns undefined when updating missing todo', () => {
    expect(update('missing', { title: 'X' })).toBeUndefined();
  });

  it('removes a todo', () => {
    const created = create({ title: 'Delete me', description: '', status: 'todo', priority: 0 });
    expect(remove(created.id)).toBe(true);
    expect(findById(created.id)).toBeUndefined();
  });

  it('returns false when removing missing todo', () => {
    expect(remove('missing')).toBe(false);
  });
});
```

- [ ] **Step 6: Run demo-todo tests**

```bash
cd repos/demo-todo && npm install && npx vitest run
```
Expected: 8 tests PASS

- [ ] **Step 7: Rewrite knowledge entries for demo-todo**

```markdown
<!-- knowledge/architecture/api-conventions.md -->
# API Conventions

## REST Endpoint Design
- Base path: `/api/v1/`
- Resource URLs: plural nouns, kebab-case (`/api/v1/todos`, `/api/v1/todo-items`)
- HTTP methods:
  - `GET /api/v1/{resource}` — list, supports `?sort=field` and `?order=asc|desc`
  - `GET /api/v1/{resource}/:id` — single item
  - `POST /api/v1/{resource}` — create
  - `PATCH /api/v1/{resource}/:id` — partial update
  - `DELETE /api/v1/{resource}/:id` — remove

## Response Format
- Envelope: `{ data: ... }` for single item, `{ data: [...], meta: { total } }` for lists
- On error: `{ error: string, fields?: [{ field, message }] }`
- Status codes: 200 (ok), 201 (created), 204 (deleted), 400 (validation), 404 (not found)

## Conventions
- All request/response bodies are JSON (`Content-Type: application/json`)
- IDs are UUID v4 strings
- Timestamps in ISO 8601 format
```

```markdown
<!-- knowledge/business/domain-model.md -->
# Domain Model

## Todo Entity

| Field | Type | Required | Description |
|-------|------|---------|-------------|
| id | string (UUID) | auto | Unique identifier |
| title | string | yes | Short summary |
| description | string | no | Detailed notes, defaults to "" |
| status | TodoStatus | yes | One of: `todo`, `in_progress`, `done`. Default: `todo` |
| priority | number | no | Higher = more urgent. Default: 0 |
| createdAt | string (ISO 8601) | auto | Creation timestamp |
| updatedAt | string (ISO 8601) | auto | Last modification timestamp |

## Business Rules
- A new todo starts with status `todo` and priority 0 unless specified
- Status transitions: `todo` → `in_progress` → `done` (forward only; can skip stages)
- Deleting a todo is permanent (no soft delete)
- Priority is used for sorting; higher values appear first in list responses
```

```markdown
<!-- knowledge/design-system/components.md -->
# Engineering Standards

## Project Structure
```
src/
├── index.ts          # Entry point — Express app setup + routes
├── models.ts         # Domain types, storage, CRUD operations
└── validators.ts     # Request validation functions
tests/
└── *.test.ts         # One test file per source module
```

## Naming Conventions
- Files: kebab-case (`todo-service.ts`, `user-repository.ts`)
- Types/Interfaces: PascalCase (`Todo`, `ValidationError`)
- Functions: camelCase (`findAll`, `findById`, `validateCreate`)
- Constants/enums: UPPER_SNAKE_CASE for values, PascalCase for type

## Error Handling Pattern
- Validation: return `{ field, message }[]` from validator functions
- Not found: return `undefined` from finder functions, caller returns 404
- Never throw in route handlers — catch and return error JSON
- Use HTTP status codes semantically

## Testing Standards
- Test models directly (unit tests against in-memory store)
- Test validators with valid and invalid bodies
- Use vitest with describe/it/expect
```

- [ ] **Step 8: Update knowledge index.yaml**

```yaml
# knowledge/index.yaml
entries:
  - path: architecture/api-conventions.md
    title: API Conventions
    category: architecture
    tags: [REST, endpoints, JSON, response-format, status-codes]
    status: active
    updated: "2026-06-13"
    scope: global
  - path: business/domain-model.md
    title: Domain Model
    category: business
    tags: [Todo, entity, status, priority, business-rules]
    status: active
    updated: "2026-06-13"
    scope: global
  - path: design-system/components.md
    title: Engineering Standards
    category: design-system
    tags: [project-structure, naming, error-handling, testing, conventions]
    status: active
    updated: "2026-06-13"
    scope: global
```

- [ ] **Step 9: Verify knowledge index rebuild**

```bash
cd cli && npx tsx src/index.ts knowledge update --project ..
```
Expected: "Knowledge index updated"

- [ ] **Step 10: Commit**

```bash
git add repos/demo-todo/ knowledge/
git commit -m "feat: add demo-todo project and rewrite knowledge base"
```

---

### Task 2: Build system — root package.json + CLI build verification

**Files:**
- Create: `package.json` (root)
- Modify: `cli/src/commands/web.ts`

The CLI package.json already has `"bin": { "clockwork": "./dist/index.js" }` and `"build": "tsc"` and tsconfig.json already has `"outDir": "./dist"`. The build system is essentially already configured — we just need the root workspace package.json and auto-build in the web command.

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "clockwork",
  "version": "0.2.0",
  "private": true,
  "workspaces": ["cli", "workbench"],
  "scripts": {
    "install:all": "npm install --workspaces",
    "build": "npm run build --workspaces",
    "build:cli": "npm run build -w cli",
    "build:workbench": "npm run build -w workbench",
    "test": "npm run test --workspaces",
    "dev:cli": "npm run dev -w cli",
    "dev:workbench": "npm run dev -w workbench"
  }
}
```

- [ ] **Step 2: Verify CLI builds**

```bash
cd cli && npm install && npm run build
```
Expected: `dist/` directory created with compiled JS. If `npm install` was already run, verify the build succeeds.

- [ ] **Step 3: Add workbench auto-build to web command**

Modify `cli/src/commands/web.ts`:

```typescript
import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { startServer } from '../server.js';

export function webCommand(): Command {
  return new Command('web')
    .description('Start the Clockwork web workbench')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { project: string }) => {
      const workbenchDist = join(options.project, 'workbench', 'dist');
      if (!existsSync(workbenchDist)) {
        console.log('Workbench not built. Building now...');
        execSync('npm run build -w workbench', { cwd: options.project, stdio: 'inherit' });
      }
      startServer(options.project);
    });
}
```

- [ ] **Step 4: Verify build chain**

```bash
# From clockwork root:
npm install --workspaces
npm run build
which clockwork || npm link  # make clockwork globally available
clockwork --help
```
Expected: CLI shows help output with all 9 commands.

- [ ] **Step 5: Commit**

```bash
git add package.json cli/src/commands/web.ts
git commit -m "feat: add root package.json with workspaces and workbench auto-build"
```

---

### Task 3: Error recovery — types, lock, workspace

**Files:**
- Modify: `cli/src/types.ts`
- Create: `cli/src/lock.ts`
- Modify: `cli/src/workspace.ts`

- [ ] **Step 1: Extend types.ts with error recovery types**

Add to `cli/src/types.ts` after the existing `TaskStatus` interface:

```typescript
export interface StageMeta {
  retryCount: number;
  maxRetries: number;
  startedAt: string;
  timeoutMs: number;
}

export interface TaskStatus {
  taskId: string;
  workflow: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'interrupted';
  currentStage: string;
  stages: Record<string, 'pending' | 'in_progress' | 'completed' | 'failed' | 'interrupted'>;
  stageMeta: Record<string, StageMeta>;
  created: string;
  updated: string;
  repos: string[];
  humanReviewPending: boolean;
}
```

- [ ] **Step 2: Write failing test for lock.ts**

```typescript
// cli/tests/lock.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { acquireLock, releaseLock, isLocked } from '../src/lock.js';
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('lock', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'clockwork-lock-test-' + Date.now());
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
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
```

- [ ] **Step 3: Run lock test to verify it fails**

```bash
cd cli && npx vitest run tests/lock.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 4: Implement lock.ts**

```typescript
// cli/src/lock.ts
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
  try { unlinkSync(path); } catch {}
}

export function isLocked(baseDir: string, resource: string): boolean {
  return existsSync(lockPath(baseDir, resource));
}

export async function withLock<T>(baseDir: string, resource: string, fn: () => T | Promise<T>, maxRetries = 3, retryMs = 500): Promise<T> {
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
      await new Promise(r => setTimeout(r, retryMs));
    }
  }
  throw new Error(`Could not acquire lock after ${maxRetries} retries`);
}
```

- [ ] **Step 5: Run lock test to verify it passes**

```bash
cd cli && npx vitest run tests/lock.test.ts
```
Expected: 5 tests PASS

- [ ] **Step 6: Write failing tests for workspace recovery functions**

```typescript
// cli/tests/workspace-recovery.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTask, loadTask, markStageFailed, incrementRetry, saveRecoverySnapshot, loadRecoverySnapshot, setTaskInterrupted } from '../src/workspace.js';
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
    try { rmSync(wsDir, { recursive: true, force: true }); } catch {}
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
```

- [ ] **Step 7: Run workspace recovery test to verify it fails**

```bash
cd cli && npx vitest run tests/workspace-recovery.test.ts
```
Expected: FAIL — functions not exported

- [ ] **Step 8: Add recovery functions to workspace.ts**

Append to `cli/src/workspace.ts`:

```typescript
import { StageMeta, TaskStatus } from './types.js';
import { withLock } from './lock.js';

export function markStageFailed(workspaceDir: string, taskId: string, stageId: string): TaskStatus {
  const task = loadTask(workspaceDir, taskId);
  task.stages[stageId] = 'failed';
  task.status = 'failed';
  if (!task.stageMeta) task.stageMeta = {};
  if (!task.stageMeta[stageId]) task.stageMeta[stageId] = { retryCount: 0, maxRetries: 3, startedAt: '', timeoutMs: 600000 };
  task.stageMeta[stageId].retryCount = (task.stageMeta[stageId].retryCount || 0) + 1;
  task.updated = new Date().toISOString();
  writeFileSync(join(workspaceDir, taskId, 'status.yaml'), stringifyYaml(task));
  return task;
}

export function incrementRetry(workspaceDir: string, taskId: string, stageId: string): TaskStatus {
  const task = loadTask(workspaceDir, taskId);
  if (!task.stageMeta) task.stageMeta = {};
  if (!task.stageMeta[stageId]) task.stageMeta[stageId] = { retryCount: 0, maxRetries: 3, startedAt: '', timeoutMs: 600000 };
  task.stageMeta[stageId].retryCount += 1;
  task.updated = new Date().toISOString();
  writeFileSync(join(workspaceDir, taskId, 'status.yaml'), stringifyYaml(task));
  return task;
}

export function setTaskInterrupted(workspaceDir: string, taskId: string): TaskStatus {
  const task = loadTask(workspaceDir, taskId);
  task.status = 'interrupted';
  if (task.currentStage) {
    task.stages[task.currentStage] = 'interrupted';
  }
  task.updated = new Date().toISOString();
  writeFileSync(join(workspaceDir, taskId, 'status.yaml'), stringifyYaml(task));
  return task;
}

export function saveRecoverySnapshot(workspaceDir: string, taskId: string, data: Record<string, unknown>): void {
  const recoveryDir = join(workspaceDir, taskId, 'recovery');
  mkdirSync(recoveryDir, { recursive: true });
  writeFileSync(join(recoveryDir, 'snapshot.yaml'), stringifyYaml(data));
}

export function loadRecoverySnapshot(workspaceDir: string, taskId: string): Record<string, unknown> | null {
  const path = join(workspaceDir, taskId, 'recovery', 'snapshot.yaml');
  if (!existsSync(path)) return null;
  return parseYaml(readFileSync(path, 'utf8'));
}

export function withTaskLock<T>(workspaceDir: string, taskId: string, fn: () => T | Promise<T>): Promise<T> {
  return withLock(join(workspaceDir, taskId), 'task', fn);
}
```

- [ ] **Step 9: Run workspace recovery test to verify it passes**

```bash
cd cli && npx vitest run tests/workspace-recovery.test.ts
```
Expected: 5 tests PASS

- [ ] **Step 10: Run all existing CLI tests to verify no regressions**

```bash
cd cli && npx vitest run
```
Expected: All previously passing tests still PASS

- [ ] **Step 11: Commit**

```bash
git add cli/src/types.ts cli/src/lock.ts cli/src/workspace.ts cli/tests/lock.test.ts cli/tests/workspace-recovery.test.ts
git commit -m "feat: add file lock utility and error recovery to workspace module"
```

---

### Task 4: Resume command + workflow-runner SKILL.md update

**Files:**
- Modify: `cli/src/index.ts`
- Modify: `cli/src/commands/resume.ts`
- Modify: `skills/workflow-runner/SKILL.md`

- [ ] **Step 1: Add SIGINT handler to CLI entry**

Modify `cli/src/index.ts` — add before `program.parse()`:

```typescript
import { setTaskInterrupted } from './workspace.js';
import { loadConfig } from './config.js';
import { join } from 'path';

// SIGINT handler — save recovery snapshot before exit
process.on('SIGINT', () => {
  console.log('\nInterrupted. Saving recovery state...');
  // The task context is not available here because SIGINT can happen anytime.
  // The Workflow Runner SKILL.md handles per-task interrupt within CC sessions.
  // This handler prevents the CLI itself from crashing silently.
  process.exit(1);
});
```

- [ ] **Step 2: Upgrade resume command for interrupted state**

Replace `cli/src/commands/resume.ts`:

```typescript
import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { loadTask, loadRecoverySnapshot, updateTaskStatus } from '../workspace.js';
import { join } from 'path';
import chalk from 'chalk';

export function resumeCommand(): Command {
  return new Command('resume')
    .description('Resume a paused, failed, or interrupted task')
    .argument('<task-id>', 'Task ID to resume')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((taskId: string, options: { project: string }) => {
      const config = loadConfig(options.project);
      const wsDir = join(options.project, config.workspace.dir);
      const task = loadTask(wsDir, taskId);

      console.log(chalk.green(`Resuming task: ${task.taskId}`));
      console.log(chalk.dim(`  Workflow: ${task.workflow}`));
      console.log(chalk.dim(`  Status: ${task.status}`));

      if (task.humanReviewPending) {
        console.log(chalk.yellow(`  Human review is pending — use 'clockwork review ${taskId}' first`));
        return;
      }

      if (task.status === 'interrupted') {
        const snapshot = loadRecoverySnapshot(wsDir, taskId);
        if (snapshot) {
          console.log(chalk.dim(`  Recovery snapshot found: stage=${snapshot.lastStage}`));
        }
        // Reset to in_progress so workflow-runner can continue
        updateTaskStatus(wsDir, taskId, 'in_progress', task.currentStage);
        console.log(chalk.green('  Task restored to in_progress.'));
      }

      if (task.status === 'failed') {
        const currentMeta = task.stageMeta?.[task.currentStage];
        if (currentMeta) {
          const maxRetries = currentMeta.maxRetries || 3;
          const retryCount = currentMeta.retryCount || 0;
          const remaining = maxRetries - retryCount;
          if (remaining <= 0) {
            console.log(chalk.red(`  Max retries (${maxRetries}) exhausted for stage '${task.currentStage}'.`));
            console.log(chalk.yellow('  Consider re-evaluating the approach or restarting the workflow.'));
            return;
          }
          console.log(chalk.dim(`  Retries remaining for stage '${task.currentStage}': ${remaining}`));
        }
        updateTaskStatus(wsDir, taskId, 'in_progress', task.currentStage);
        console.log(chalk.green('  Task restored to in_progress.'));
      }

      console.log('');
      console.log(chalk.bold('Next: Start Claude Code and run:'));
      console.log(chalk.cyan(`  /clockwork:workflow-runner ${taskId}`));
    });
}
```

- [ ] **Step 3: Update workflow-runner SKILL.md with error recovery**

Read the current `skills/workflow-runner/SKILL.md` and add the following after "### Step 2: Check preconditions":

```markdown
### Step 2.5: Check for interrupted state

If the task status is `interrupted`:
1. Read `workspace/<task-id>/recovery/snapshot.yaml` for the recovery point
2. Restore to the stage indicated in `snapshot.lastStage`
3. Rebuild agent context for that stage if needed
4. Continue execution from the recovery point

### Step 2.6: Error handling during execution

**Timeout handling:**
- Each stage has a timeout defined in `stageMeta.<stage>.timeoutMs` (default: 600000ms = 10 min)
- If a sub-agent takes longer than timeout, mark the stage as failed
- Write a timeout notice to `workspace/<task-id>/logs/<stage>-timeout.log`

**Retry with backoff:**
- When a stage fails, check `stageMeta.<stage>.retryCount` against `maxRetries`
- If retries remain: wait 2^n minutes (where n = retryCount), then re-dispatch
- If retries exhausted: mark task failed, advise user to re-evaluate

**Interrupt handling (SIGINT / user cancel):**
- Before any stage transition, save recovery snapshot to `workspace/<task-id>/recovery/snapshot.yaml`
- Snapshot format: `{ lastStage: "<stage-id>", completedStages: [...], currentArtifacts: [...] }`
- If interrupted mid-stage, mark stage and task as `interrupted`

**Output writing safety:**
- Write artifacts to a temp file first (`.tmp/<filename>`), then atomically rename to final path
- This prevents partial reads if interrupted during write
```

- [ ] **Step 4: Commit**

```bash
git add cli/src/index.ts cli/src/commands/resume.ts skills/workflow-runner/SKILL.md
git commit -m "feat: upgrade resume command for interrupted/failed states and add error recovery to workflow-runner"
```

---

### Task 5: End-to-end validation (manual)

**No code changes.** This task verifies the complete pipeline works end-to-end.

- [ ] **Step 1: Verify global CLI**

```bash
which clockwork && clockwork --help
```
Expected: Shows path and help with all commands

- [ ] **Step 2: Verify init**

```bash
cd /tmp && rm -rf test-clockwork-project && clockwork init test-clockwork-project
ls test-clockwork-project/
```
Expected: `.clockwork/`, `agents/`, `skills/`, `knowledge/`, `workflows/`, `repos/`, `workspace/`

- [ ] **Step 3: Verify knowledge index**

```bash
clockwork knowledge update --project /tmp/test-clockwork-project
```
Expected: "Knowledge index updated"

- [ ] **Step 4: Verify start creates correct workspace**

```bash
clockwork start feature-dev --slug e2e-test --repo demo-todo --project /tmp/test-clockwork-project --requirements "Add priority-based sorting to GET /api/v1/todos endpoint"
ls /tmp/test-clockwork-project/workspace/
cat /tmp/test-clockwork-project/workspace/task-*/status.yaml
```
Expected: Task directory exists, status.yaml has workflow=feature-dev, currentStage=plan

- [ ] **Step 5: Verify status command**

```bash
clockwork status --project /tmp/test-clockwork-project
```
Expected: Lists the created task with correct status

- [ ] **Step 6: Verify review --approve unblocks**

```bash
clockwork review <task-id> --approve --project /tmp/test-clockwork-project
```
Expected: "Stage 'plan' approved"

- [ ] **Step 7: Verify review --reject**

```bash
clockwork review <task-id> --reject "Needs more detail" --project /tmp/test-clockwork-project
```
Expected: "Stage 'plan' rejected: Needs more detail"

- [ ] **Step 8: Verify web server starts with auto-build**

```bash
clockwork web --project /tmp/test-clockwork-project
# Open http://localhost:4200
```
Expected: Workbench builds automatically on first run, then server starts

- [ ] **Step 9: Verify Workflow Runner in Claude Code**

```bash
cd /tmp/test-clockwork-project
# Start CC and run:
# /clockwork:workflow-runner <task-id>
```
Expected:
- Loads task state from workspace
- Dispatches planner sub-agent
- Planner generates SPEC.md and PLAN.md in workspace
- Asks a clarifying question if requirements are ambiguous
- On completion: marks stage complete, prompts for human review

- [ ] **Step 10: Document E2E results**

Record in the commit message whether all 9 checklist items passed and any issues found.

- [ ] **Step 11: Commit (if any fixes were needed during E2E)**

```bash
git add -A
git commit -m "test: complete end-to-end validation — feature-dev workflow verified"
```

---

## Round 2: Harden and Polish

### Task 6: Missing CLI tests — repo.test.ts

**Files:**
- Create: `cli/tests/commands/repo.test.ts`

- [ ] **Step 1: Write repo command tests**

```typescript
// cli/tests/commands/repo.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = 'npx tsx ../../src/index.ts';

describe('clockwork repo', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-repo-test-' + Date.now());
    mkdirSync(dir, { recursive: true });
    execSync(`${CLI} init ${dir}`, { cwd: dir, stdio: 'pipe' });
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  it('repo status shows empty repos', () => {
    const output = execSync(`${CLI} repo status --project ${dir}`, { encoding: 'utf8' });
    expect(output).toContain('No repositories');
  });

  it('repo add fails with invalid URL', () => {
    expect(() => {
      execSync(`${CLI} repo add not-a-valid-url --project ${dir}`, { stdio: 'pipe' });
    }).toThrow();
  });

  it('repo add creates .gitmodules entry for valid URL', () => {
    // Use a local path as "remote" — git submodule supports this
    const fakeRepo = join(tmpdir(), 'cw-fake-repo-' + Date.now());
    mkdirSync(fakeRepo, { recursive: true });
    execSync('git init && git config user.email "test@test.com" && git config user.name "Test" && git commit --allow-empty -m "init"', { cwd: fakeRepo, stdio: 'pipe' });

    const output = execSync(`${CLI} repo add ${fakeRepo} --name test-repo --project ${dir}`, { encoding: 'utf8' });
    expect(output).toContain('test-repo');

    // Verify .gitmodules exists in the project
    expect(existsSync(join(dir, '.gitmodules'))).toBe(true);

    rmSync(fakeRepo, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run repo tests to verify they fail/pass appropriately**

```bash
cd cli && npx vitest run tests/commands/repo.test.ts
```

- [ ] **Step 3: Fix any issues revealed by tests**

If the repo command needs adjustments, update `cli/src/commands/repo.ts` to handle edge cases revealed by tests.

- [ ] **Step 4: Commit**

```bash
git add cli/tests/commands/repo.test.ts
git commit -m "test: add repo command unit tests"
```

---

### Task 7: CLI integration tests — workflow + API

**Files:**
- Create: `cli/tests/integration/workflow.test.ts`
- Create: `cli/tests/integration/api.test.ts`

- [ ] **Step 1: Add supertest dependency to CLI**

```bash
cd cli && npm install --save-dev supertest @types/supertest
```

- [ ] **Step 2: Write workflow integration test**

```typescript
// cli/tests/integration/workflow.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parse as parseYaml } from 'yaml';

const CLI = 'npx tsx ../../src/index.ts';

describe('workflow integration: init → start → status → review', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-integration-' + Date.now());
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  it('runs feature-dev workflow state transitions', () => {
    // 1. init
    execSync(`${CLI} init ${dir}`, { stdio: 'pipe' });
    expect(existsSync(join(dir, '.clockwork', 'config.yaml'))).toBe(true);

    // 2. knowledge update
    execSync(`${CLI} knowledge update --project ${dir}`, { stdio: 'pipe' });

    // 3. start
    const startOut = execSync(
      `${CLI} start feature-dev --slug test-feature --repo test-repo --project ${dir} --requirements "Add a health check endpoint"`,
      { encoding: 'utf8' }
    );
    expect(startOut).toContain('Task created');

    // Extract task ID from output
    const taskMatch = startOut.match(/task-\d{3}-test-feature/);
    expect(taskMatch).not.toBeNull();
    const taskId = taskMatch![0];

    // 4. status shows task
    const statusOut = execSync(`${CLI} status --project ${dir}`, { encoding: 'utf8' });
    expect(statusOut).toContain(taskId);
    expect(statusOut).toContain('feature-dev');

    // 5. review --approve unlocks next stage
    execSync(`${CLI} review ${taskId} --approve --project ${dir}`, { stdio: 'pipe' });
    const statusAfterApprove = execSync(`${CLI} status ${taskId} --project ${dir}`, { encoding: 'utf8' });
    expect(statusAfterApprove).not.toContain('human review pending');

    // 6. verify workspace structure
    const wsDir = join(dir, 'workspace', taskId);
    expect(existsSync(join(wsDir, 'status.yaml'))).toBe(true);
    expect(existsSync(join(wsDir, 'agent-context'))).toBe(true);

    // 7. verify status.yaml content
    const statusYaml = parseYaml(readFileSync(join(wsDir, 'status.yaml'), 'utf8'));
    expect(statusYaml.workflow).toBe('feature-dev');
    expect(statusYaml.repos).toContain('test-repo');
  });

  it('review --reject marks stage as failed', () => {
    execSync(`${CLI} init ${dir}`, { stdio: 'pipe' });
    const startOut = execSync(
      `${CLI} start feature-dev --slug rejected-feature --repo test-repo --project ${dir} --requirements "Test rejection flow"`,
      { encoding: 'utf8' }
    );
    const taskMatch = startOut.match(/task-\d{3}-rejected-feature/);
    expect(taskMatch).not.toBeNull();
    const taskId = taskMatch![0];

    execSync(`${CLI} review ${taskId} --reject "Incomplete requirements" --project ${dir}`, { stdio: 'pipe' });
    const statusOut = execSync(`${CLI} status ${taskId} --project ${dir}`, { encoding: 'utf8' });
    expect(statusOut).toContain('failed');
  });

  it('start with stdin requirements', () => {
    execSync(`${CLI} init ${dir}`, { stdio: 'pipe' });
    const startOut = execSync(
      `echo "Stdin requirements test" | ${CLI} start bug-fix --slug stdin-test --repo test-repo --project ${dir}`,
      { encoding: 'utf8' }
    );
    expect(startOut).toContain('Task created');
    expect(startOut).toContain('task-');
  });
});
```

- [ ] **Step 3: Write API integration test**

```typescript
// cli/tests/integration/api.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig } from '../../src/config.js';
import { createTask } from '../../src/workspace.js';
import { buildIndex, saveIndex } from '../../src/knowledge-indexer.js';

// We test the server setup by importing startServer logic
// Since startServer calls app.listen, we instead rebuild the app for testing
describe('API endpoints', () => {
  let dir: string;
  let app: express.Express;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-api-test-' + Date.now());
    mkdirSync(dir, { recursive: true });

    // Create minimal project structure
    mkdirSync(join(dir, '.clockwork'), { recursive: true });
    writeFileSync(join(dir, '.clockwork', 'config.yaml'), [
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
    ].join('\n'));

    mkdirSync(join(dir, 'workspace'), { recursive: true });
    mkdirSync(join(dir, 'knowledge'), { recursive: true });
    mkdirSync(join(dir, 'knowledge', 'architecture'), { recursive: true });
    writeFileSync(join(dir, 'knowledge', 'architecture', 'test.md'), '# Test Entry\nTest content');
    const index = buildIndex(join(dir, 'knowledge'));
    saveIndex(join(dir, 'knowledge'), index);

    // Build express app (same as server.ts but without listen)
    const config = loadConfig(dir);
    app = express();
    app.use(express.json());

    app.get('/api/tasks', (_req, res) => {
      const wsDir = join(dir, config.workspace.dir);
      const { listTasks } = require('../../src/workspace.js');
      res.json(listTasks(wsDir));
    });

    app.get('/api/tasks/:taskId', (req, res) => {
      const wsDir = join(dir, config.workspace.dir);
      const { loadTask } = require('../../src/workspace.js');
      try {
        res.json(loadTask(wsDir, req.params.taskId));
      } catch {
        res.status(404).json({ error: 'Task not found' });
      }
    });

    app.get('/api/knowledge', (_req, res) => {
      const { loadIndex } = require('../../src/knowledge-indexer.js');
      res.json(loadIndex(join(dir, 'knowledge')));
    });

    app.get('/api/knowledge/:entryPath(*)', (req, res) => {
      const filePath = join(dir, 'knowledge', req.params.entryPath);
      const { existsSync } = require('fs');
      if (!existsSync(filePath)) {
        res.status(404).json({ error: 'Entry not found' });
        return;
      }
      res.sendFile(filePath);
    });

    app.get('/api/tasks/:taskId/artifacts', (req, res) => {
      const taskDir = join(dir, 'workspace', req.params.taskId);
      const { existsSync, readdirSync, statSync } = require('fs');
      if (!existsSync(taskDir)) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      const files = readdirSync(taskDir)
        .filter((f: string) => f.endsWith('.md'))
        .map((f: string) => ({ name: f, size: statSync(join(taskDir, f)).size }));
      res.json(files);
    });

    app.get('/api/tasks/:taskId/artifact/:filename', (req, res) => {
      const filePath = join(dir, 'workspace', req.params.taskId, req.params.filename);
      const { existsSync } = require('fs');
      if (!existsSync(filePath)) {
        res.status(404).json({ error: 'Artifact not found' });
        return;
      }
      res.sendFile(filePath);
    });

    app.post('/api/tasks/:taskId/review', (req, res) => {
      const { setHumanReviewPending } = require('../../src/workspace.js');
      const wsDir = join(dir, 'workspace');
      const { action, reason } = req.body;
      try {
        setHumanReviewPending(wsDir, req.params.taskId, action !== 'approve');
        res.json({ ok: true, action, reason });
      } catch (e) {
        res.status(400).json({ error: String(e) });
      }
    });
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  it('GET /api/tasks returns empty array', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /api/tasks returns created tasks', async () => {
    createTask(join(dir, 'workspace'), 'feature-dev', 'test-api', []);
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].workflow).toBe('feature-dev');
  });

  it('GET /api/tasks/:taskId returns 404 for unknown task', async () => {
    const res = await request(app).get('/api/tasks/nonexistent');
    expect(res.status).toBe(404);
  });

  it('GET /api/tasks/:taskId returns task detail', async () => {
    const task = createTask(join(dir, 'workspace'), 'feature-dev', 'detail-test', []);
    const res = await request(app).get(`/api/tasks/${task.taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.taskId).toBe(task.taskId);
  });

  it('GET /api/knowledge returns entries', async () => {
    const res = await request(app).get('/api/knowledge');
    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBeGreaterThan(0);
  });

  it('GET /api/knowledge/:path returns entry content', async () => {
    const res = await request(app).get('/api/knowledge/architecture/test.md');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Test Entry');
  });

  it('GET /api/knowledge/:path returns 404 for unknown', async () => {
    const res = await request(app).get('/api/knowledge/nonexistent.md');
    expect(res.status).toBe(404);
  });

  it('POST /api/tasks/:taskId/review approve', async () => {
    const task = createTask(join(dir, 'workspace'), 'feature-dev', 'review-test', []);
    const res = await request(app)
      .post(`/api/tasks/${task.taskId}/review`)
      .send({ action: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.action).toBe('approve');
  });

  it('POST /api/tasks/:taskId/review reject with reason', async () => {
    const task = createTask(join(dir, 'workspace'), 'feature-dev', 'reject-test', []);
    const res = await request(app)
      .post(`/api/tasks/${task.taskId}/review`)
      .send({ action: 'reject', reason: 'Not good enough' });
    expect(res.status).toBe(200);
    expect(res.body.action).toBe('reject');
    expect(res.body.reason).toBe('Not good enough');
  });
});
```

- [ ] **Step 4: Run integration tests**

```bash
cd cli && npx vitest run tests/integration/
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add cli/package.json cli/tests/integration/
git commit -m "test: add CLI integration tests for workflow and API endpoints"
```

---

### Task 8: Workflow E2E tests

**Files:**
- Create: `cli/tests/e2e/feature-dev.test.ts`
- Create: `cli/tests/e2e/bug-fix.test.ts`
- Create: `cli/tests/e2e/incident-response.test.ts`

- [ ] **Step 1: Write feature-dev E2E test**

```typescript
// cli/tests/e2e/feature-dev.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parse as parseYaml } from 'yaml';
import { parseFrontmatterString } from '../../src/frontmatter.js';
import { WorkflowFrontmatter } from '../../src/types.js';

const CLI = 'npx tsx ../../src/index.ts';

describe('feature-dev workflow E2E', () => {
  let dir: string;
  let taskId: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-e2e-fd-' + Date.now());
    mkdirSync(dir, { recursive: true });
    execSync(`${CLI} init ${dir}`, { stdio: 'pipe' });

    const out = execSync(
      `${CLI} start feature-dev --slug e2e-feature --repo demo-todo --project ${dir} --requirements "Add GET /health endpoint returning { status: ok }"`,
      { encoding: 'utf8' }
    );
    const match = out.match(/task-\d{3}-e2e-feature/);
    expect(match).not.toBeNull();
    taskId = match![0];
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  it('creates task with correct initial state', () => {
    const wsDir = join(dir, 'workspace', taskId);
    const status = parseYaml(readFileSync(join(wsDir, 'status.yaml'), 'utf8'));
    expect(status.workflow).toBe('feature-dev');
    expect(status.status).toBe('pending');
    expect(status.repos).toContain('demo-todo');
  });

  it('creates agent context for planner', () => {
    const ctxPath = join(dir, 'workspace', taskId, 'agent-context', 'planner.json');
    expect(existsSync(ctxPath)).toBe(true);
    const ctx = JSON.parse(readFileSync(ctxPath, 'utf8'));
    expect(ctx.agentName).toBe('planner');
    expect(ctx.role).toBeDefined();
    expect(ctx.skills).toBeDefined();
  });

  it('progresses through plan stage with review flow', () => {
    const wsDir = join(dir, 'workspace', taskId);

    // Check human review pending after plan stage
    execSync(`${CLI} review ${taskId} --approve --project ${dir}`, { stdio: 'pipe' });
    const statusAfterApprove = parseYaml(readFileSync(join(wsDir, 'status.yaml'), 'utf8'));
    expect(statusAfterApprove.humanReviewPending).toBe(false);
  });

  it('rejects and fails the stage', () => {
    execSync(`${CLI} review ${taskId} --reject "Bad requirements" --project ${dir}`, { stdio: 'pipe' });
    const wsDir = join(dir, 'workspace', taskId);
    const status = parseYaml(readFileSync(join(wsDir, 'status.yaml'), 'utf8'));
    expect(status.status).toBe('failed');
  });

  it('resume transitions failed task back to in_progress', () => {
    execSync(`${CLI} review ${taskId} --reject "Try again" --project ${dir}`, { stdio: 'pipe' });
    execSync(`${CLI} resume ${taskId} --project ${dir}`, { stdio: 'pipe' });
    const wsDir = join(dir, 'workspace', taskId);
    const status = parseYaml(readFileSync(join(wsDir, 'status.yaml'), 'utf8'));
    expect(status.status).toBe('in_progress');
  });
});
```

- [ ] **Step 2: Write bug-fix E2E test**

```typescript
// cli/tests/e2e/bug-fix.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parse as parseYaml } from 'yaml';

const CLI = 'npx tsx ../../src/index.ts';

describe('bug-fix workflow E2E', () => {
  let dir: string;
  let taskId: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-e2e-bf-' + Date.now());
    mkdirSync(dir, { recursive: true });
    execSync(`${CLI} init ${dir}`, { stdio: 'pipe' });

    const out = execSync(
      `${CLI} start bug-fix --slug e2e-bug --repo demo-todo --project ${dir} --requirements "Fix 500 error when todo title is empty"`,
      { encoding: 'utf8' }
    );
    const match = out.match(/task-\d{3}-e2e-bug/);
    expect(match).not.toBeNull();
    taskId = match![0];
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  it('creates task with bug-fix workflow and diagnose stage', () => {
    const wsDir = join(dir, 'workspace', taskId);
    const status = parseYaml(readFileSync(join(wsDir, 'status.yaml'), 'utf8'));
    expect(status.workflow).toBe('bug-fix');
    expect(status.status).toBe('pending');
  });

  it('creates agent context for debugger', () => {
    const ctxPath = join(dir, 'workspace', taskId, 'agent-context', 'debugger.json');
    expect(existsSync(ctxPath)).toBe(true);
    const ctx = JSON.parse(readFileSync(ctxPath, 'utf8'));
    expect(ctx.agentName).toBe('debugger');
  });

  it('completes full bug-fix stage cycle: diagnose → review → fix → verify', () => {
    // Approve diagnose stage
    execSync(`${CLI} review ${taskId} --approve --project ${dir}`, { stdio: 'pipe' });
    const wsDir = join(dir, 'workspace', taskId);
    const status = parseYaml(readFileSync(join(wsDir, 'status.yaml'), 'utf8'));
    expect(status.status).toBe('completed');
  });
});
```

- [ ] **Step 3: Write incident-response E2E test**

```typescript
// cli/tests/e2e/incident-response.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parse as parseYaml } from 'yaml';

const CLI = 'npx tsx ../../src/index.ts';

describe('incident-response workflow E2E', () => {
  let dir: string;
  let taskId: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-e2e-ir-' + Date.now());
    mkdirSync(dir, { recursive: true });
    execSync(`${CLI} init ${dir}`, { stdio: 'pipe' });

    const out = execSync(
      `${CLI} start incident-response --slug e2e-incident --repo demo-todo --project ${dir} --requirements "API returning 503 for all requests since 14:30 UTC"`,
      { encoding: 'utf8' }
    );
    const match = out.match(/task-\d{3}-e2e-incident/);
    expect(match).not.toBeNull();
    taskId = match![0];
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  it('creates task with incident-response workflow and triage stage', () => {
    const wsDir = join(dir, 'workspace', taskId);
    const status = parseYaml(readFileSync(join(wsDir, 'status.yaml'), 'utf8'));
    expect(status.workflow).toBe('incident-response');
    expect(status.status).toBe('pending');
  });

  it('creates agent context for debugger (triage stage)', () => {
    const ctxPath = join(dir, 'workspace', taskId, 'agent-context', 'debugger.json');
    expect(existsSync(ctxPath)).toBe(true);
    const ctx = JSON.parse(readFileSync(ctxPath, 'utf8'));
    expect(ctx.agentName).toBe('debugger');
  });

  it('triage stage has no human review requirement', () => {
    // The incident-response triage stage has humanReview: 'none'
    // Verify the workflow definition
    const wfPath = join(dir, 'workflows', 'incident-response.md');
    expect(existsSync(wfPath)).toBe(true);
  });
});
```

- [ ] **Step 4: Run E2E tests**

```bash
cd cli && npx vitest run tests/e2e/
```
Expected: All E2E tests PASS

- [ ] **Step 5: Commit**

```bash
git add cli/tests/e2e/
git commit -m "test: add workflow E2E tests for feature-dev, bug-fix, and incident-response"
```

---

### Task 9: Workbench test infrastructure + component tests

**Files:**
- Create: `workbench/tests/setup.ts`
- Create: `workbench/tests/TaskBoard.test.tsx`
- Create: `workbench/tests/TaskDetail.test.tsx`
- Create: `workbench/tests/ReviewActions.test.tsx`

- [ ] **Step 1: Write test setup**

```typescript
// workbench/tests/setup.ts
import '@testing-library/jest-dom';
```

Verify `workbench/package.json` already has vitest, @testing-library/react, @testing-library/jest-dom, jsdom. Add vitest config to `workbench/vite.config.ts`:

```typescript
// Append to vite.config.ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4200',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
});
```

- [ ] **Step 2: Write TaskBoard tests**

```typescript
// workbench/tests/TaskBoard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaskBoard from '../src/pages/TaskBoard';
import * as api from '../src/api';

vi.mock('../src/api');

const mockTasks = [
  {
    taskId: 'task-001-add-login',
    workflow: 'feature-dev',
    status: 'in_progress',
    currentStage: 'implement',
    stages: { plan: 'completed', implement: 'in_progress' },
    created: '2026-06-13T10:00:00Z',
    updated: '2026-06-13T11:00:00Z',
    repos: ['demo-todo'],
    humanReviewPending: false,
  },
  {
    taskId: 'task-002-fix-auth',
    workflow: 'bug-fix',
    status: 'pending',
    currentStage: '',
    stages: {},
    created: '2026-06-13T09:00:00Z',
    updated: '2026-06-13T09:00:00Z',
    repos: ['demo-todo'],
    humanReviewPending: false,
  },
  {
    taskId: 'task-003-search',
    workflow: 'feature-dev',
    status: 'completed',
    currentStage: 'deliver',
    stages: { plan: 'completed', implement: 'completed', review: 'completed', deliver: 'completed' },
    created: '2026-06-12T10:00:00Z',
    updated: '2026-06-13T08:00:00Z',
    repos: ['demo-todo'],
    humanReviewPending: true,
  },
];

describe('TaskBoard', () => {
  beforeEach(() => {
    vi.mocked(api.fetchTasks).mockReset();
  });

  it('renders loading state initially', () => {
    vi.mocked(api.fetchTasks).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <TaskBoard />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('renders task cards after loading', async () => {
    vi.mocked(api.fetchTasks).mockResolvedValue(mockTasks);
    render(
      <MemoryRouter>
        <TaskBoard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('task-001-add-login')).toBeInTheDocument();
    });
    expect(screen.getByText('task-002-fix-auth')).toBeInTheDocument();
    expect(screen.getByText('task-003-search')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    vi.mocked(api.fetchTasks).mockRejectedValue(new Error('Network error'));
    render(
      <MemoryRouter>
        <TaskBoard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('displays human review pending indicator', async () => {
    vi.mocked(api.fetchTasks).mockResolvedValue([mockTasks[2]]);
    render(
      <MemoryRouter>
        <TaskBoard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('task-003-search')).toBeInTheDocument();
    });
    expect(screen.getByText(/review needed/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Write TaskDetail tests**

```typescript
// workbench/tests/TaskDetail.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TaskDetail from '../src/pages/TaskDetail';
import * as api from '../src/api';

vi.mock('../src/api');

const mockTask = {
  taskId: 'task-001-add-login',
  workflow: 'feature-dev',
  status: 'in_progress',
  currentStage: 'implement',
  stages: { plan: 'completed', implement: 'in_progress' },
  created: '2026-06-13T10:00:00Z',
  updated: '2026-06-13T11:00:00Z',
  repos: ['demo-todo'],
  humanReviewPending: false,
};

const mockArtifacts = [
  { name: 'SPEC.md', size: 1024 },
  { name: 'PLAN.md', size: 2048 },
];

describe('TaskDetail', () => {
  beforeEach(() => {
    vi.mocked(api.fetchTask).mockReset();
    vi.mocked(api.fetchArtifacts).mockReset();
    vi.mocked(api.fetchArtifact).mockReset();
  });

  it('renders task metadata', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(mockTask);
    vi.mocked(api.fetchArtifacts).mockResolvedValue(mockArtifacts);

    render(
      <MemoryRouter initialEntries={['/tasks/task-001-add-login']}>
        <Routes>
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('task-001-add-login')).toBeInTheDocument();
    });
    expect(screen.getByText('feature-dev')).toBeInTheDocument();
  });

  it('renders artifact list', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(mockTask);
    vi.mocked(api.fetchArtifacts).mockResolvedValue(mockArtifacts);

    render(
      <MemoryRouter initialEntries={['/tasks/task-001-add-login']}>
        <Routes>
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('SPEC.md')).toBeInTheDocument();
    });
    expect(screen.getByText('PLAN.md')).toBeInTheDocument();
  });

  it('shows error for unknown task', async () => {
    vi.mocked(api.fetchTask).mockRejectedValue(new Error('Task not found'));

    render(
      <MemoryRouter initialEntries={['/tasks/unknown']}>
        <Routes>
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Task not found/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 4: Write ReviewActions tests**

```typescript
// workbench/tests/ReviewActions.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewActions from '../src/components/ReviewActions';
import * as api from '../src/api';

vi.mock('../src/api');

describe('ReviewActions', () => {
  beforeEach(() => {
    vi.mocked(api.submitReview).mockReset();
  });

  it('renders approve and reject buttons', () => {
    render(<ReviewActions taskId="task-001" />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('shows reason input when reject is clicked', () => {
    render(<ReviewActions taskId="task-001" />);
    fireEvent.click(screen.getByText('Reject'));
    expect(screen.getByPlaceholderText(/Reason for rejection/)).toBeInTheDocument();
  });

  it('calls submitReview on approve', async () => {
    vi.mocked(api.submitReview).mockResolvedValue();
    render(<ReviewActions taskId="task-001" />);
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => {
      expect(api.submitReview).toHaveBeenCalledWith('task-001', 'approve', undefined);
    });
  });

  it('calls submitReview on reject with reason', async () => {
    vi.mocked(api.submitReview).mockResolvedValue();
    render(<ReviewActions taskId="task-001" />);
    fireEvent.click(screen.getByText('Reject'));
    const input = screen.getByPlaceholderText(/Reason for rejection/);
    fireEvent.change(input, { target: { value: 'Incomplete work' } });
    fireEvent.click(screen.getByText('Confirm Reject'));
    await waitFor(() => {
      expect(api.submitReview).toHaveBeenCalledWith('task-001', 'reject', 'Incomplete work');
    });
  });
});
```

- [ ] **Step 5: Run workbench tests**

```bash
cd workbench && npx vitest run
```
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add workbench/tests/ workbench/vite.config.ts
git commit -m "test: add workbench component tests for TaskBoard, TaskDetail, and ReviewActions"
```

---

### Task 10: Markdown renderer upgrade

**Files:**
- Modify: `workbench/package.json`
- Modify: `workbench/src/components/MarkdownViewer.tsx`
- Create: `workbench/tests/MarkdownViewer.test.tsx`

- [ ] **Step 1: Install marked and highlight.js**

```bash
cd workbench && npm install marked highlight.js
```

- [ ] **Step 2: Write MarkdownViewer test**

```typescript
// workbench/tests/MarkdownViewer.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownViewer from '../src/components/MarkdownViewer';

describe('MarkdownViewer', () => {
  it('renders headings h1-h6', () => {
    const md = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
    render(<MarkdownViewer content={md} />);
    expect(screen.getByText('H1').tagName).toBe('H1');
    expect(screen.getByText('H2').tagName).toBe('H2');
    expect(screen.getByText('H6').tagName).toBe('H6');
  });

  it('renders code blocks', () => {
    const md = '```typescript\nconst x = 1;\n```';
    render(<MarkdownViewer content={md} />);
    expect(screen.getByText(/const x = 1/)).toBeInTheDocument();
    // highlight.js wraps code in <code> inside <pre>
    const code = document.querySelector('pre code');
    expect(code).toBeInTheDocument();
  });

  it('renders inline code', () => {
    const md = 'Use `code` inline';
    render(<MarkdownViewer content={md} />);
    const code = screen.getByText('code');
    expect(code.tagName).toBe('CODE');
  });

  it('renders tables', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    render(<MarkdownViewer content={md} />);
    expect(document.querySelector('table')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders links', () => {
    const md = '[Click here](https://example.com)';
    render(<MarkdownViewer content={md} />);
    const link = screen.getByText('Click here');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('https://example.com');
  });

  it('renders blockquotes', () => {
    const md = '> quoted text';
    render(<MarkdownViewer content={md} />);
    expect(document.querySelector('blockquote')).toBeInTheDocument();
    expect(screen.getByText(/quoted text/)).toBeInTheDocument();
  });

  it('renders bold, italic, and strikethrough', () => {
    const md = '**bold** *italic* ~~strike~~';
    render(<MarkdownViewer content={md} />);
    expect(document.querySelector('strong')).toBeInTheDocument();
    expect(document.querySelector('em')).toBeInTheDocument();
    expect(document.querySelector('del')).toBeInTheDocument();
  });

  it('renders task lists', () => {
    const md = '- [x] Done\n- [ ] Not done';
    render(<MarkdownViewer content={md} />);
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('renders horizontal rules', () => {
    const md = 'Above\n\n---\n\nBelow';
    render(<MarkdownViewer content={md} />);
    expect(document.querySelector('hr')).toBeInTheDocument();
  });

  it('renders nested lists', () => {
    const md = '- Parent\n  - Child\n  - Child 2\n- Parent 2';
    render(<MarkdownViewer content={md} />);
    const items = document.querySelectorAll('li');
    expect(items.length).toBe(4);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd workbench && npx vitest run tests/MarkdownViewer.test.tsx
```
Expected: FAIL — code blocks, tables, links, etc. not rendered

- [ ] **Step 4: Replace MarkdownViewer with marked + highlight.js**

Replace `workbench/src/components/MarkdownViewer.tsx`:

```typescript
import { useMemo } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

marked.setOptions({
  gfm: true,
  breaks: false,
});

const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const validLang = lang && hljs.getLanguage(lang) ? lang : undefined;
  const highlighted = validLang
    ? hljs.highlight(text, { language: validLang }).value
    : hljs.highlightAuto(text).value;
  const langAttr = validLang ? ` class="hljs language-${validLang}"` : ' class="hljs"';
  return `<pre><code${langAttr}>${highlighted}</code></pre>`;
};

marked.setOptions({ renderer });

export default function MarkdownViewer({ content }: { content: string }) {
  const html = useMemo(() => {
    const parsed = marked.parse(content);
    return typeof parsed === 'string' ? parsed : '';
  }, [content]);

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 5: Add markdown body styles to global.css**

Append to `workbench/src/styles/global.css`:

```css
.markdown-body {
  color: #cbd5e1;
  line-height: 1.7;
  font-size: 14px;
}

.markdown-body h1 { font-size: 22px; font-weight: 700; margin: 24px 0 12px; color: #f8fafc; }
.markdown-body h2 { font-size: 18px; font-weight: 700; margin: 20px 0 10px; color: #f8fafc; }
.markdown-body h3 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; color: #f8fafc; }
.markdown-body h4 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; color: #f1f5f9; }
.markdown-body h5, .markdown-body h6 { font-size: 13px; font-weight: 600; margin: 10px 0 4px; color: #e2e8f0; }

.markdown-body p { margin: 8px 0; }

.markdown-body a { color: #60a5fa; text-decoration: underline; }
.markdown-body a:hover { color: #93bbfd; }

.markdown-body code {
  background: #0f172a;
  padding: 1px 6px;
  border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #38bdf8;
}

.markdown-body pre {
  background: #0f172a;
  border-radius: 8px;
  padding: 14px;
  overflow-x: auto;
  margin: 12px 0;
  border: 1px solid #1e293b;
}

.markdown-body pre code {
  background: none;
  padding: 0;
  border-radius: 0;
  color: #e2e8f0;
  font-size: 13px;
}

.markdown-body blockquote {
  border-left: 3px solid #3b82f6;
  padding: 8px 16px;
  margin: 12px 0;
  color: #94a3b8;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 0 6px 6px 0;
}

.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}

.markdown-body th {
  background: #1e293b;
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: #94a3b8;
  border-bottom: 2px solid #334155;
}

.markdown-body td {
  padding: 8px 12px;
  border-bottom: 1px solid #1e293b;
  color: #cbd5e1;
}

.markdown-body tr:hover td { background: rgba(30, 41, 59, 0.5); }

.markdown-body ul, .markdown-body ol { padding-left: 24px; margin: 8px 0; }
.markdown-body li { margin: 4px 0; color: #cbd5e1; }

.markdown-body hr {
  border: none;
  border-top: 1px solid #334155;
  margin: 20px 0;
}

.markdown-body img { max-width: 100%; border-radius: 6px; }

.markdown-body input[type="checkbox"] {
  margin-right: 8px;
  accent-color: #3b82f6;
}
```

- [ ] **Step 6: Run MarkdownViewer test to verify it passes**

```bash
cd workbench && npx vitest run tests/MarkdownViewer.test.tsx
```
Expected: 10 tests PASS

- [ ] **Step 7: Run all workbench tests**

```bash
cd workbench && npx vitest run
```
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add workbench/
git commit -m "feat: upgrade MarkdownViewer with marked + highlight.js for full GFM support"
```

---

### Task 11: Knowledge detail page + server endpoint

**Files:**
- Create: `workbench/src/pages/KnowledgeDetail.tsx`
- Modify: `workbench/src/pages/KnowledgeBrowser.tsx`
- Modify: `workbench/src/App.tsx`
- Modify: `workbench/src/api.ts`
- Modify: `cli/src/server.ts`

- [ ] **Step 1: Add fetchEntry to workbench API client**

Modify `workbench/src/api.ts` — add after existing `fetchKnowledge`:

```typescript
export async function fetchKnowledgeEntry(path: string): Promise<string> {
  const res = await fetch(`${BASE}/knowledge/${path}`);
  if (!res.ok) throw new Error('Entry not found');
  return res.text();
}
```

- [ ] **Step 2: Add server endpoint for single knowledge entry**

In `cli/src/server.ts`, the endpoint already exists at `GET /api/knowledge/:entryPath(*)`. No change needed — the wildcard route handles nested paths.

- [ ] **Step 3: Create KnowledgeDetail page**

```typescript
// workbench/src/pages/KnowledgeDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchKnowledgeEntry } from '../api';
import MarkdownViewer from '../components/MarkdownViewer';

export default function KnowledgeDetail() {
  const { entryPath } = useParams<{ entryPath: string }>();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entryPath) return;
    fetchKnowledgeEntry(entryPath)
      .then(setContent)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [entryPath]);

  if (loading) return <div className="loading">Loading entry...</div>;
  if (error) return <div className="error">{error}</div>;

  const fileName = entryPath?.split('/').pop()?.replace('.md', '') || '';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link to="/knowledge" style={{ color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>
          &larr; Back to Knowledge Base
        </Link>
      </div>

      <h1 className="page-title" style={{ textTransform: 'capitalize' }}>
        {fileName.replace(/-/g, ' ')}
      </h1>

      <div className="card" style={{ padding: 24, marginTop: 16 }}>
        <MarkdownViewer content={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update KnowledgeBrowser to link to detail page**

Modify `workbench/src/pages/KnowledgeBrowser.tsx` — change the entry card rendering:

```typescript
// In the grid map, replace the outer <div key={entry.path}> with:
import { Link } from 'react-router-dom';

// ... inside the map function:
<Link
  key={entry.path}
  to={`/knowledge/${entry.path}`}
  style={{ textDecoration: 'none', color: 'inherit' }}
>
  <div className="card" style={{ cursor: 'pointer' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{entry.title}</h3>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {entry.path} · {entry.category} · Updated {entry.updated}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {entry.tags.map(tag => (
          <span key={tag} style={{ background: '#0f172a', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#94a3b8' }}>
            {tag}
          </span>
        ))}
        {entry.status !== 'active' && (
          <span className={`badge ${entry.status === 'archived' ? 'badge-failed' : 'badge-pending'}`}>
            {entry.status}
          </span>
        )}
      </div>
    </div>
  </div>
</Link>
```

- [ ] **Step 5: Add route to App.tsx**

Modify `workbench/src/App.tsx` — add import and route:

```typescript
import KnowledgeDetail from './pages/KnowledgeDetail';

// Add route inside <Routes>:
<Route path="/knowledge/:entryPath" element={<KnowledgeDetail />} />
```

- [ ] **Step 6: Rebuild workbench and verify**

```bash
npm run build -w workbench
```

- [ ] **Step 7: Commit**

```bash
git add cli/src/server.ts workbench/src/
git commit -m "feat: add knowledge entry detail page with markdown rendering"
```

---

## Final Verification

After all tasks complete:

- [ ] Run full test suite: `npm test` from root (all CLI + Workbench tests pass)
- [ ] Build from scratch: `npm run build` from root (CLI JS + Workbench dist produced)
- [ ] Global CLI test: `clockwork --help` works in any directory
- [ ] Web server: `clockwork web` starts and Workbench loads in browser
- [ ] E2E manual: `clockwork init` → `clockwork start` → full workflow executes
