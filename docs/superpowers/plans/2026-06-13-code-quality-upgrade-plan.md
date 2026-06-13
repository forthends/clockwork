# Code Quality Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 bugs, unify code style to pnpm+named-exports, and add ESLint/Prettier/lint-staged toolchain.

**Architecture:** Sequential phases — cleanup stale files, fix bugs, unify exports, migrate to pnpm, install toolchain, then final formatting pass. Each phase ends with a test gate.

**Tech Stack:** TypeScript, pnpm, ESLint v9 (flat config), Prettier, simple-git-hooks + lint-staged

---

### Task 1: Delete stale JS files from workbench/src

**Files:**

- Delete: `workbench/src/App.js`
- Delete: `workbench/src/api.js`
- Delete: `workbench/src/main.js`
- Delete: `workbench/src/components/Layout.js`
- Delete: `workbench/src/components/MarkdownViewer.js`
- Delete: `workbench/src/components/ReviewActions.js`
- Delete: `workbench/src/components/StatusBadge.js`
- Delete: `workbench/src/components/TaskCard.js`
- Delete: `workbench/src/pages/KnowledgeBrowser.js`
- Delete: `workbench/src/pages/KnowledgeDetail.js`
- Delete: `workbench/src/pages/TaskBoard.js`
- Delete: `workbench/src/pages/TaskDetail.js`
- Delete: `workbench/src/pages/TaskReview.js`

- [ ] **Step 1: Delete all .js files under workbench/src/**

```bash
rm workbench/src/App.js workbench/src/api.js workbench/src/main.js \
   workbench/src/components/Layout.js workbench/src/components/MarkdownViewer.js \
   workbench/src/components/ReviewActions.js workbench/src/components/StatusBadge.js \
   workbench/src/components/TaskCard.js workbench/src/pages/KnowledgeBrowser.js \
   workbench/src/pages/KnowledgeDetail.js workbench/src/pages/TaskBoard.js \
   workbench/src/pages/TaskDetail.js workbench/src/pages/TaskReview.js
```

- [ ] **Step 2: Verify workbench still builds and tests pass**

```bash
cd workbench && npx tsc --noEmit && npx vitest run
```

Expected: TypeScript compiles clean, all 4 test files pass.

- [ ] **Step 3: Commit**

```bash
git add workbench/src/
git commit -m "chore: remove stale JS files, keep only TypeScript sources"
```

---

### Task 2: Fix route ordering in App.tsx

**Files:**

- Modify: `workbench/src/App.tsx:18-19`

- [ ] **Step 1: Swap the two knowledge routes**

Edit `workbench/src/App.tsx`, lines 18-19. Change:

```tsx
        <Route path="/knowledge/*" element={<KnowledgeDetail />} />
        <Route path="/knowledge" element={<KnowledgeBrowser />} />
```

to:

```tsx
        <Route path="/knowledge" element={<KnowledgeBrowser />} />
        <Route path="/knowledge/*" element={<KnowledgeDetail />} />
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd workbench && npx tsc --noEmit
```

Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add workbench/src/App.tsx
git commit -m "fix: swap route order so /knowledge exact match takes priority over wildcard"
```

---

### Task 3: Fix task counter persistence in workspace.ts

**Files:**

- Modify: `cli/src/workspace.ts:6-12`

- [ ] **Step 1: Replace module-level counter with filesystem scan**

Edit `cli/src/workspace.ts`. Remove line 6 (`let taskCounter = 0;`). Replace `createTask` function (lines 8-33) with:

```ts
export function createTask(workspaceDir: string, workflow: string, slug: string, repos: string[]): TaskStatus {
  const existing = listTasks(workspaceDir);
  let maxNum = 0;
  for (const t of existing) {
    const match = t.taskId.match(/task-(\d+)/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  const padded = String(maxNum + 1).padStart(3, '0');
  const taskId = `task-${padded}-${slug}`;
  const taskDir = join(workspaceDir, taskId);
  mkdirSync(taskDir, { recursive: true });
  mkdirSync(join(taskDir, 'agent-context'), { recursive: true });
  mkdirSync(join(taskDir, 'logs'), { recursive: true });

  const now = new Date().toISOString();
  const status: TaskStatus = {
    taskId,
    workflow,
    status: 'pending',
    currentStage: '',
    stages: {},
    stageMeta: {},
    created: now,
    updated: now,
    repos,
    humanReviewPending: false,
  };

  writeFileSync(join(taskDir, 'status.yaml'), stringifyYaml(status));
  return status;
}
```

- [ ] **Step 2: Run CLI tests**

```bash
cd cli && npx vitest run
```

Expected: All CLI tests pass (the `workspace.test.ts` and `start.test.ts` exercises `createTask`).

- [ ] **Step 3: Commit**

```bash
git add cli/src/workspace.ts
git commit -m "fix: derive task counter from existing task IDs instead of in-memory variable"
```

---

### Task 4: Fix skill.ts path derivation

**Files:**

- Modify: `cli/src/commands/skill.ts:16`

- [ ] **Step 1: Replace string replace with direct path join**

In `cli/src/commands/skill.ts`, change line 16 from:

```ts
const skillsDir = join(options.project, config.agents.dir.replace('agents/', 'skills/'));
```

to:

```ts
const skillsDir = join(options.project, 'skills');
```

Also remove the unused `loadConfig` import since `config` is no longer used. Actually, `config` is not used elsewhere in this file after this change — check line 2 (`import { loadConfig } from '../config.js'`). Remove that import, and remove line 15 (`const config = loadConfig(options.project)`).

- [ ] **Step 2: Verify with TypeScript and existing test**

```bash
cd cli && npx tsc --noEmit && npx vitest run
```

Expected: Clean compile, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/skill.ts
git commit -m "fix: use direct path join for skills directory instead of string replace"
```

---

### Task 5: Fix status.ts path construction

**Files:**

- Modify: `cli/src/commands/status.ts:13`

- [ ] **Step 1: Replace string concatenation with path.join**

In `cli/src/commands/status.ts`, change line 13 from:

```ts
const wsDir = `${options.project}/${config.workspace.dir}`.replace('//', '/');
```

to:

```ts
const wsDir = join(options.project, config.workspace.dir);
```

Add `join` to the fs import on line 1 if not already present. (Currently `loadConfig` is imported from `../config.js`, `loadTask`/`listTasks` from `../workspace.js`, `chalk` from `chalk` — need to add `join` from `path`.)

Change line 1-4 from:

```ts
import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { loadTask, listTasks } from '../workspace.js';
import chalk from 'chalk';
```

to:

```ts
import { Command } from 'commander';
import { join } from 'path';
import { loadConfig } from '../config.js';
import { loadTask, listTasks } from '../workspace.js';
import chalk from 'chalk';
```

- [ ] **Step 2: Verify with TypeScript and existing test**

```bash
cd cli && npx tsc --noEmit && npx vitest run tests/commands/status.test.ts
```

Expected: Clean compile, status tests pass.

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/status.ts
git commit -m "fix: use path.join for workspace directory construction"
```

---

### Task 6: Fix knowledge index tags always empty

**Files:**

- Modify: `cli/src/knowledge-indexer.ts:2,10-30`

- [ ] **Step 1: Parse frontmatter tags from each markdown file during indexing**

Edit `cli/src/knowledge-indexer.ts`. Add `parseFrontmatter` import at the top. Change line 2 to include the frontmatter import:

```ts
import { writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { parseFrontmatter } from './frontmatter.js';
import { KnowledgeIndex, KnowledgeEntry } from './types.js';
```

Then in `buildIndex`, change the entry creation inside `walk` (where the entry is pushed, lines 21-28) to read the frontmatter and extract tags:

```ts
let tags: string[] = [];
try {
  const { frontmatter: fm } = parseFrontmatter<{ tags?: string[] }>(fullPath);
  tags = fm.tags || [];
} catch {
  // file has no frontmatter or invalid — use empty tags
}

entries.push({
  path: relPath,
  title: entry.name.replace('.md', '').replace(/-/g, ' '),
  category,
  tags,
  status: 'active',
  updated: now,
  scope: 'global',
});
```

- [ ] **Step 2: Run knowledge indexer tests**

```bash
cd cli && npx vitest run tests/knowledge-indexer.test.ts
```

Expected: Tests pass.

- [ ] **Step 3: Commit**

```bash
git add cli/src/knowledge-indexer.ts
git commit -m "fix: populate knowledge entry tags from markdown frontmatter"
```

---

### Task 7: Add useEffect cleanup to workbench page components

**Files:**

- Modify: `workbench/src/pages/TaskBoard.tsx`
- Modify: `workbench/src/pages/TaskDetail.tsx`
- Modify: `workbench/src/pages/TaskReview.tsx`
- Modify: `workbench/src/pages/KnowledgeBrowser.tsx` (if it uses useEffect with setState — need to check)

Actually let me check KnowledgeBrowser first:

Read `workbench/src/pages/KnowledgeBrowser.tsx` and `workbench/src/pages/KnowledgeDetail.tsx` to confirm they use useEffect with async operations.

Let me check the KnowledgeDetail page — from the route it takes `/knowledge/*` and likely uses fetch to load.

- [ ] **Step 1: Add cleanup to TaskBoard.tsx**

Edit the `useEffect` block (lines 10-15). Change from:

```tsx
useEffect(() => {
  fetchTasks()
    .then(setTasks)
    .catch((e) => setError(e.message))
    .finally(() => setLoading(false));
}, []);
```

to:

```tsx
useEffect(() => {
  let cancelled = false;
  fetchTasks()
    .then((data) => {
      if (!cancelled) setTasks(data);
    })
    .catch((e) => {
      if (!cancelled) setError(e.message);
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });
  return () => {
    cancelled = true;
  };
}, []);
```

- [ ] **Step 2: Add cleanup to TaskDetail.tsx**

Edit the first `useEffect` block (lines 16-26). Change from:

```tsx
useEffect(() => {
  if (!taskId) return;
  Promise.all([fetchTask(taskId), fetchArtifacts(taskId)])
    .then(([t, a]) => {
      setTask(t);
      setArtifacts(a);
      if (a.length > 0) setSelectedArtifact(a[0].name);
    })
    .catch((e) => setError(e.message))
    .finally(() => setLoading(false));
}, [taskId]);
```

to:

```tsx
useEffect(() => {
  if (!taskId) return;
  let cancelled = false;
  Promise.all([fetchTask(taskId), fetchArtifacts(taskId)])
    .then(([t, a]) => {
      if (!cancelled) {
        setTask(t);
        setArtifacts(a);
        if (a.length > 0) setSelectedArtifact(a[0].name);
      }
    })
    .catch((e) => {
      if (!cancelled) setError(e.message);
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });
  return () => {
    cancelled = true;
  };
}, [taskId]);
```

And the second `useEffect` (lines 28-33), change from:

```tsx
useEffect(() => {
  if (!taskId || !selectedArtifact) return;
  fetchArtifact(taskId, selectedArtifact)
    .then(setContent)
    .catch(() => setContent('*Unable to load artifact*'));
}, [taskId, selectedArtifact]);
```

to:

```tsx
useEffect(() => {
  if (!taskId || !selectedArtifact) return;
  let cancelled = false;
  fetchArtifact(taskId, selectedArtifact)
    .then((data) => {
      if (!cancelled) setContent(data);
    })
    .catch(() => {
      if (!cancelled) setContent('*Unable to load artifact*');
    });
  return () => {
    cancelled = true;
  };
}, [taskId, selectedArtifact]);
```

- [ ] **Step 3: Add cleanup to TaskReview.tsx**

Edit the `useEffect` block (lines 14-29). Change from:

```tsx
useEffect(() => {
  if (!taskId) return;
  Promise.all([fetchTask(taskId), fetchArtifacts(taskId)])
    .then(([_, arts]) => {
      setArtifacts(arts);
      return Promise.all(arts.map((a) => fetchArtifact(taskId, a.name).then((c) => ({ name: a.name, content: c }))));
    })
    .then((results) => {
      const map: Record<string, string> = {};
      results.forEach((r) => {
        map[r.name] = r.content;
      });
      setContents(map);
    })
    .finally(() => setLoading(false));
}, [taskId]);
```

to:

```tsx
useEffect(() => {
  if (!taskId) return;
  let cancelled = false;
  Promise.all([fetchTask(taskId), fetchArtifacts(taskId)])
    .then(([_, arts]) => {
      if (!cancelled) setArtifacts(arts);
      return Promise.all(arts.map((a) => fetchArtifact(taskId, a.name).then((c) => ({ name: a.name, content: c }))));
    })
    .then((results) => {
      if (!cancelled) {
        const map: Record<string, string> = {};
        results.forEach((r) => {
          map[r.name] = r.content;
        });
        setContents(map);
      }
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });
  return () => {
    cancelled = true;
  };
}, [taskId]);
```

- [ ] **Step 4: Check and fix KnowledgeBrowser and KnowledgeDetail**

Read the files first:

Read `workbench/src/pages/KnowledgeBrowser.tsx` and `workbench/src/pages/KnowledgeDetail.tsx`.

Then apply the same `cancelled` pattern to any `useEffect` that does async fetch + setState.

- [ ] **Step 5: Run workbench tests**

```bash
cd workbench && npx vitest run
```

Expected: All 4 test files (22 tests) pass with no new warnings.

- [ ] **Step 6: Commit**

```bash
git add workbench/src/pages/TaskBoard.tsx workbench/src/pages/TaskDetail.tsx \
        workbench/src/pages/TaskReview.tsx
git commit -m "fix: add useEffect cleanup to prevent setState on unmounted components"
```

---

### Task 8: Convert default exports to named exports in workbench

**Files:**

- Modify: All 11 workbench TSX source files and `api.ts`

- [ ] **Step 1: Convert component files to named exports**

For each of these files, replace `export default function Xxx` with `export function Xxx`:

| File                                          | Change                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `workbench/src/App.tsx`                       | `export default function App` → `export function App`                           |
| `workbench/src/components/Layout.tsx`         | `export default function Layout` → `export function Layout`                     |
| `workbench/src/pages/TaskBoard.tsx`           | `export default function TaskBoard` → `export function TaskBoard`               |
| `workbench/src/pages/TaskDetail.tsx`          | `export default function TaskDetail` → `export function TaskDetail`             |
| `workbench/src/pages/TaskReview.tsx`          | `export default function TaskReview` → `export function TaskReview`             |
| `workbench/src/pages/KnowledgeBrowser.tsx`    | `export default function KnowledgeBrowser` → `export function KnowledgeBrowser` |
| `workbench/src/pages/KnowledgeDetail.tsx`     | `export default function KnowledgeDetail` → `export function KnowledgeDetail`   |
| `workbench/src/components/TaskCard.tsx`       | `export default function TaskCard` → `export function TaskCard`                 |
| `workbench/src/components/StatusBadge.tsx`    | `export default function StatusBadge` → `export function StatusBadge`           |
| `workbench/src/components/MarkdownViewer.tsx` | `export default function MarkdownViewer` → `export function MarkdownViewer`     |
| `workbench/src/components/ReviewActions.tsx`  | `export default function ReviewActions` → `export function ReviewActions`       |

- [ ] **Step 2: Update imports in main.tsx**

Change `workbench/src/main.tsx` line 3 from:

```tsx
import App from './App';
```

to:

```tsx
import { App } from './App';
```

- [ ] **Step 3: Update imports in App.tsx**

Change `workbench/src/App.tsx` lines 3-8 from:

```tsx
import Layout from './components/Layout';
import TaskBoard from './pages/TaskBoard';
import TaskDetail from './pages/TaskDetail';
import TaskReview from './pages/TaskReview';
import KnowledgeBrowser from './pages/KnowledgeBrowser';
import KnowledgeDetail from './pages/KnowledgeDetail';
```

to:

```tsx
import { Layout } from './components/Layout';
import { TaskBoard } from './pages/TaskBoard';
import { TaskDetail } from './pages/TaskDetail';
import { TaskReview } from './pages/TaskReview';
import { KnowledgeBrowser } from './pages/KnowledgeBrowser';
import { KnowledgeDetail } from './pages/KnowledgeDetail';
```

- [ ] **Step 4: Update imports in page/component files**

Check and update all internal imports within workbench:

- `TaskBoard.tsx` imports `TaskCard` and `fetchTasks` → `import { TaskCard } from '../components/TaskCard'`, `import { fetchTasks } from '../api'`
- `TaskDetail.tsx` imports `StatusBadge`, `MarkdownViewer`, `fetchTask`, `fetchArtifacts`, `fetchArtifact` → `import { ... } from ...`
- `TaskReview.tsx` imports `ReviewActions`, `MarkdownViewer`, `fetchTask`, `fetchArtifacts`, `fetchArtifact` → `import { ... } from ...`

Run a grep to find all remaining `import ... from` patterns that might be importing default exports:

```bash
grep -r "import [A-Z]" workbench/src/
```

Fix any that are not already using named import syntax.

- [ ] **Step 5: Verify TypeScript and tests**

```bash
cd workbench && npx tsc --noEmit && npx vitest run
```

Expected: Clean compile, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add workbench/src/
git commit -m "refactor: convert all default exports to named exports"
```

---

### Task 9: Migrate to pnpm and tighten tsconfig

**Files:**

- Modify: `package.json` (root)
- Delete: `package-lock.json` (root)
- Modify: `cli/tsconfig.json`
- Modify: `workbench/tsconfig.json`

- [ ] **Step 1: Add packageManager to root package.json**

Edit the root `package.json`, add before the closing `}`:

```json
  "packageManager": "pnpm@9.15.0"
```

- [ ] **Step 2: Delete npm lock file**

```bash
rm package-lock.json
```

- [ ] **Step 3: Add strict tsconfig options**

Edit `cli/tsconfig.json` — in `compilerOptions`, after `"declaration": true` add a comma and:

```json
    "noUnusedLocals": true,
    "noUnusedParameters": true
```

Result for `cli/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["tests/**"]
}
```

Edit `workbench/tsconfig.json` — in `compilerOptions`, after `"skipLibCheck": true` add a comma and:

```json
    "noUnusedLocals": true,
    "noUnusedParameters": true
```

Result for `workbench/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Install with pnpm and verify**

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` generated, no errors.

```bash
pnpm build
```

Expected: Both CLI and workbench build successfully.

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml cli/tsconfig.json workbench/tsconfig.json .npmrc 2>/dev/null
git add .gitignore
git rm package-lock.json 2>/dev/null
git commit -m "chore: migrate from npm to pnpm, tighten tsconfig strictness"
```

---

### Task 10: Install and configure ESLint + Prettier + pre-commit hooks

**Files:**

- Create: `eslint.config.js` (root)
- Create: `.prettierrc` (root)
- Create: `.prettierignore` (root)
- Modify: `package.json` (root — scripts, lint-staged, simple-git-hooks)

- [ ] **Step 1: Install dev dependencies**

```bash
pnpm add -Dw eslint prettier typescript-eslint lint-staged simple-git-hooks eslint-config-prettier @eslint/js
```

- [ ] **Step 2: Create eslint.config.js**

Write `eslint.config.js`:

```js
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/', 'node_modules/', '.claude/'] },
  ...tseslint.configs.strict,
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
```

- [ ] **Step 3: Create .prettierrc and .prettierignore**

Write `.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 120,
  "tabWidth": 2
}
```

Write `.prettierignore`:

```
dist/
node_modules/
pnpm-lock.yaml
.claude/
```

- [ ] **Step 4: Add scripts and hooks to root package.json**

Add these entries to the root `package.json` scripts:

```json
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "simple-git-hooks"
```

Add these top-level entries to `package.json`:

```json
  "simple-git-hooks": {
    "pre-commit": "npx lint-staged"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write", "eslint --fix"],
    "*.{json,md,yaml}": ["prettier --write"]
  }
```

- [ ] **Step 5: Initialize git hooks**

```bash
npx simple-git-hooks
```

- [ ] **Step 6: Run format and lint fix**

```bash
pnpm format
pnpm lint:fix
```

Expected: All files formatted, any auto-fixable lint issues resolved.

- [ ] **Step 7: Verify final state**

```bash
pnpm build
pnpm test
pnpm lint
```

Expected: Clean build, all tests pass, zero lint errors.

- [ ] **Step 8: Commit**

```bash
git add eslint.config.js .prettierrc .prettierignore package.json
git add -u
git commit -m "chore: add ESLint, Prettier, and pre-commit hooks"
```

---

### Task 11: Final verification

- [ ] **Step 1: Full test suite**

```bash
pnpm test
```

- [ ] **Step 2: Full lint**

```bash
pnpm lint
```

- [ ] **Step 3: Full build**

```bash
pnpm build
```

- [ ] **Step 4: Check git status is clean**

```bash
git status
```

Expected: All three gates pass, working tree clean.
