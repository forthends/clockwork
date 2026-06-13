# Knowledge Keeper Agent & Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a knowledge-keeper agent that reads code from repos/ and generates structured knowledge entries across four categories.

**Architecture:** Follows existing agent + skill + CLI pattern. New `knowledge-keeper` agent definition and SKILL.md drive the analysis workflow. A new `clockwork knowledge generate` subcommand prepares agent context. Workflow deliver stages integrate incremental knowledge generation.

**Tech Stack:** TypeScript (strict), vitest, commander.js, YAML frontmatter

---

## File structure

| File                                             | Responsibility                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `agents/knowledge-keeper.md`                     | Agent role definition (YAML frontmatter + workflow instructions) |
| `skills/knowledge-keeper/SKILL.md`               | Four-stage code analysis skill instructions                      |
| `cli/templates/agents/knowledge-keeper.md`       | Template copy for `clockwork init`                               |
| `cli/templates/skills/knowledge-keeper/SKILL.md` | Template copy for `clockwork init`                               |
| `cli/src/commands/knowledge.ts`                  | `generate` subcommand — validates repo, prepares context         |
| `cli/tests/commands/knowledge.test.ts`           | Tests for `generate` subcommand                                  |
| `workflows/feature-dev.md`                       | Deliver stage: agent → knowledge-keeper, actions updated         |
| `workflows/bug-fix.md`                           | Deliver stage: agent → knowledge-keeper, actions updated         |
| `cli/templates/workflows/feature-dev.md`         | Sync with workflows/feature-dev.md                               |
| `cli/templates/workflows/bug-fix.md`             | Sync with workflows/bug-fix.md                                   |

---

### Task 1: Create agent definition

**Files:**

- Create: `agents/knowledge-keeper.md`
- Create: `cli/templates/agents/knowledge-keeper.md`

- [ ] **Step 1: Write agent definition**

Write `agents/knowledge-keeper.md`:

````markdown
---
name: knowledge-keeper
description: >
  Analyzes code repositories and generates structured knowledge base entries.
  Covers architecture patterns, business entities and rules, engineering
  standards, and key decisions across four categories.
role: Knowledge Keeper
capabilities:
  - Project structure and tech stack analysis
  - Business entity, state machine, and domain rule identification from code
  - Engineering convention and naming pattern recognition
  - Architecture decision documentation
boundaries:
  - Read-only: NEVER modify source files
  - Output only to knowledge/ directory
  - Generated entries default to status: draft (human review required)
  - Never fabricate business context not present in the code
input:
  required: [repo_path]
  optional: [category, knowledge_context]
output:
  - file: knowledge/{category}/{topic}.md
    description: Structured knowledge entry with YAML frontmatter
skills:
  - knowledge-keeper
model: sonnet
---

# Knowledge Keeper Agent

## Workflow

1. Read the specified repo directory structure and key files
2. Analyze code for the current category (architecture → business → design-system → decisions)
3. Generate knowledge entries in markdown with YAML frontmatter
4. Present preview to user and wait for confirmation before writing
5. After confirmation, write to `knowledge/{category}/{topic}.md`
6. Proceed to next category or remind user to run `clockwork knowledge update`

## Output Format

Every knowledge entry MUST include YAML frontmatter:

```yaml
---
tags: [tag1, tag2, tag3]
category: architecture
status: draft
updated: 'YYYY-MM-DD'
scope: global
---
```
````

## Category Analysis Guide

### Architecture

- Project directory structure and layering
- Tech stack (package.json, tsconfig, build config)
- API routes, endpoints, and middleware
- Data models (schemas, entities, migrations)
- External dependencies and service boundaries

### Business

- Domain entities (interfaces/types/classes named after business concepts)
- State machines and status transition logic
- Business validation rules
- Permission and role models
- Domain events

### Design System

- Directory structure conventions
- Naming conventions (files, functions, types)
- Error handling patterns
- Testing strategy and coverage conventions
- TypeScript strictness rules
- Code organization patterns

### Decisions

- Why specific libraries/frameworks were chosen
- Why specific architectural layering was adopted
- Implicit architectural assumptions (inferred from code organization)
- Known technical debt and tradeoffs

## Constraints

- NEVER modify source code — read and analyze only
- Skip categories where no meaningful content can be extracted; report the reason
- Default all entries to `status: draft`
- Ask user for confirmation after each category before proceeding

````

- [ ] **Step 2: Copy to templates directory**

Run: `cp agents/knowledge-keeper.md cli/templates/agents/knowledge-keeper.md`

- [ ] **Step 3: Commit**

```bash
git add agents/knowledge-keeper.md cli/templates/agents/knowledge-keeper.md
git commit -m "feat: add knowledge-keeper agent definition"
````

---

### Task 2: Create skill definition

**Files:**

- Create: `skills/knowledge-keeper/SKILL.md`
- Create: `cli/templates/skills/knowledge-keeper/SKILL.md`

- [ ] **Step 1: Create skill directory**

```bash
mkdir -p skills/knowledge-keeper cli/templates/skills/knowledge-keeper
```

- [ ] **Step 2: Write skill definition**

Write `skills/knowledge-keeper/SKILL.md`:

```markdown
---
name: knowledge-keeper
description: >
  Generate structured knowledge base entries by analyzing code repositories.
  Walks through four categories (architecture, business, design-system,
  decisions) with user confirmation at each stage.
license: MIT
---

# Knowledge Keeper

Generate knowledge base entries from code repositories.

## Input

- `repo_path` (required): Path to the repository to analyze, e.g. `repos/my-service`
- `category` (optional): Specific category to generate. One of: `architecture`, `business`, `design-system`, `decisions`. If omitted, proceeds through all four in order.

## Process

### Phase 1: Architecture Analysis

1. Read top-level config files: `package.json`, `tsconfig.json`, build config, linter config
2. Map directory structure — identify layering (src/, lib/, routes/, models/, etc.)
3. Identify API surface: route definitions, endpoint handlers, middleware chain
4. Identify data layer: schemas, entities, migrations, database-related files
5. Generate `knowledge/architecture/{topic}.md` covering:
   - Project structure overview
   - Tech stack inventory
   - API conventions (if applicable)
   - Data model overview (if applicable)
6. Present preview to user. Ask: "Does this architecture summary look accurate?"
7. If user approves, write to disk. If user provides corrections, revise and re-preview.

### Phase 2: Business Analysis

1. Scan for domain entity definitions: interfaces, types, classes named after business concepts
2. Identify state machines and status enums — trace transitions through the codebase
3. Find validation logic and business rule enforcement
4. Identify permission/authorization patterns
5. Generate `knowledge/business/{topic}.md` covering:
   - Domain entities and their fields
   - Business rules and invariants
   - Status/state lifecycles
6. Present preview. Ask: "Does this business domain summary look accurate?"
7. Confirm or revise as in Phase 1.

### Phase 3: Design System Analysis

1. Observe file naming patterns (kebab-case, PascalCase, etc.)
2. Observe code organization conventions (barrel exports, index files, feature folders)
3. Identify error handling patterns (try/catch placement, error types, HTTP error responses)
4. Review test file locations and naming (co-located vs separate, `.test.ts` vs `.spec.ts`)
5. Check TypeScript config strictness and type usage patterns
6. Generate `knowledge/design-system/{topic}.md` covering:
   - Naming and organization conventions
   - Error handling standards
   - Testing conventions
   - TypeScript rules
7. Present preview. Ask: "Do these engineering conventions look correct?"
8. Confirm or revise.

### Phase 4: Decisions Analysis

1. From the earlier phases, identify implicit decisions:
   - Framework choices (Express vs Fastify, etc.)
   - Architecture choices (layered vs hexagonal vs microservices)
   - Library choices (validation library, ORM, etc.)
2. Infer rationale from code organization (not speculation — describe what the code reveals)
3. Generate `knowledge/decisions/{topic}.md` covering:
   - Technology choices and their evidence
   - Architecture pattern choices and their evidence
   - Known tradeoffs visible in the code
4. Present preview. Ask: "Do these architecture decisions look accurate?"
5. Confirm or revise.

### Completion

After all categories are done, tell the user:
```

Knowledge generation complete. Run `clockwork knowledge update` to rebuild the index.
Review generated entries in knowledge/ and change `status: draft` to `active` after approval.

```

## Constraints

- READ ONLY: Never modify any file outside `knowledge/`
- All generated entries MUST be written to `knowledge/{category}/` directories
- Every entry MUST have valid YAML frontmatter with tags, category, status, updated, scope
- Default status is `draft` — human must explicitly approve
- If a category has nothing meaningful to extract, say so and skip it
- Never fabricate information not present in the code
```

- [ ] **Step 3: Copy to templates directory**

```bash
cp skills/knowledge-keeper/SKILL.md cli/templates/skills/knowledge-keeper/SKILL.md
```

- [ ] **Step 4: Commit**

```bash
git add skills/knowledge-keeper/SKILL.md cli/templates/skills/knowledge-keeper/SKILL.md
git commit -m "feat: add knowledge-keeper skill definition"
```

---

### Task 3: Add CLI generate subcommand

**Files:**

- Modify: `cli/src/commands/knowledge.ts`

- [ ] **Step 1: Write the failing test**

Create `cli/tests/commands/knowledge.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = 'npx tsx src/index.ts';

describe('clockwork knowledge generate', () => {
  const testDir = join(tmpdir(), 'clockwork-knowledge-test-' + Date.now());

  beforeAll(() => {
    // Initialize project and set up minimal repo
    execSync(`cd ${__dirname}/../.. && ${CLI} init ${testDir}`, { encoding: 'utf8' });
    // Copy workflows, agents, knowledge templates
    execSync(`cp -r ${join(__dirname, '..', '..', '..', 'workflows')} ${testDir}/`);
    execSync(`cp -r ${join(__dirname, '..', '..', '..', 'agents')} ${testDir}/`);
    execSync(`cp -r ${join(__dirname, '..', '..', '..', 'knowledge')} ${testDir}/`);
    // Create a minimal test repo in repos/
    const repoDir = join(testDir, 'repos', 'test-repo');
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, 'package.json'),
      JSON.stringify({ name: 'test-repo', dependencies: { express: '^4.18.0' } }, null, 2),
    );
    mkdirSync(join(repoDir, 'src'));
    writeFileSync(
      join(repoDir, 'src', 'index.ts'),
      `import express from 'express';\nconst app = express();\napp.get('/api/v1/items', (req, res) => res.json({ data: [] }));\nexport { app };`,
    );
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('rejects when repo does not exist', () => {
    expect(() =>
      execSync(`cd ${__dirname}/../.. && ${CLI} knowledge generate --repo nonexistent --project ${testDir}`, {
        encoding: 'utf8',
      }),
    ).toThrow();
  });

  it('prepares context for a valid repo', () => {
    const output = execSync(
      `cd ${__dirname}/../.. && ${CLI} knowledge generate --repo test-repo --project ${testDir}`,
      { encoding: 'utf8' },
    );
    expect(output).toContain('Knowledge generation context prepared');
    expect(output).toContain('knowledge-keeper');
    expect(output).toContain('test-repo');
  });

  it('generates context for a specific category', () => {
    const output = execSync(
      `cd ${__dirname}/../.. && ${CLI} knowledge generate --repo test-repo --category architecture --project ${testDir}`,
      { encoding: 'utf8' },
    );
    expect(output).toContain('architecture');
    expect(output).not.toContain('business');
  });

  it('rejects invalid category', () => {
    expect(() =>
      execSync(
        `cd ${__dirname}/../.. && ${CLI} knowledge generate --repo test-repo --category invalid --project ${testDir}`,
        { encoding: 'utf8' },
      ),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && pnpm vitest run tests/commands/knowledge.test.ts`
Expected: FAIL — test file doesn't exist yet (or if it does, tests fail because generate subcommand doesn't exist)

- [ ] **Step 3: Implement the generate subcommand**

Modify `cli/src/commands/knowledge.ts`. Replace the existing file content:

```typescript
import { Command } from 'commander';
import { join } from 'path';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { loadConfig } from '../config.js';
import { buildIndex, saveIndex, loadIndex } from '../knowledge-indexer.js';
import chalk from 'chalk';

const VALID_CATEGORIES = ['architecture', 'business', 'design-system', 'decisions'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: string): value is Category {
  return VALID_CATEGORIES.includes(value as Category);
}

export function knowledgeCommand(): Command {
  const cmd = new Command('knowledge').description('Manage knowledge base');

  cmd
    .command('update')
    .description('Rebuild knowledge index from knowledge/ directory')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { project: string }) => {
      const config = loadConfig(options.project);
      const knowledgeDir = join(options.project, config.knowledge.dir);
      const index = buildIndex(knowledgeDir);
      saveIndex(knowledgeDir, index);
      console.log(chalk.green(`✓ Knowledge index updated — ${index.entries.length} entries`));
    });

  cmd
    .command('generate')
    .description('Generate knowledge entries by analyzing a code repository')
    .requiredOption('--repo <name>', 'Repository name under repos/')
    .option('--category <cat>', 'Category: architecture | business | design-system | decisions')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { repo: string; category?: string; project: string }) => {
      if (options.category && !isValidCategory(options.category)) {
        console.error(chalk.red(`Error: Invalid category "${options.category}".`));
        console.error(chalk.dim(`  Valid categories: ${VALID_CATEGORIES.join(', ')}`));
        process.exit(1);
      }

      const config = loadConfig(options.project);
      const repoPath = join(options.project, config.repos.dir, options.repo);

      if (!existsSync(repoPath)) {
        console.error(chalk.red(`Error: Repository "${options.repo}" not found at ${repoPath}`));
        console.error(chalk.dim('  Available repos:'));
        const reposDir = join(options.project, config.repos.dir);
        if (existsSync(reposDir)) {
          for (const entry of readdirSync(reposDir, { withFileTypes: true })) {
            if (entry.isDirectory() && entry.name !== '.git') {
              console.error(chalk.dim(`    - ${entry.name}`));
            }
          }
        }
        process.exit(1);
      }

      // Collect repo metadata
      const pkgJsonPath = join(repoPath, 'package.json');
      const tsconfigPath = join(repoPath, 'tsconfig.json');
      let pkgJson: Record<string, unknown> | null = null;
      let hasTsConfig = false;

      if (existsSync(pkgJsonPath)) {
        try {
          pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
        } catch {
          // package.json exists but is invalid — ignore
        }
      }
      hasTsConfig = existsSync(tsconfigPath);

      // Gather directory tree (first 2 levels, excluding node_modules and .git)
      function tree(dir: string, depth: number): string[] {
        if (depth > 2) return [];
        const lines: string[] = [];
        if (!existsSync(dir)) return lines;
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (['node_modules', '.git', 'dist', '.next', 'coverage'].includes(entry.name)) continue;
          const prefix = '  '.repeat(depth);
          if (entry.isDirectory()) {
            lines.push(`${prefix}${entry.name}/`);
            lines.push(...tree(join(dir, entry.name), depth + 1));
          } else {
            lines.push(`${prefix}${entry.name}`);
          }
        }
        return lines;
      }
      const dirTree = tree(repoPath, 0);

      // Load existing knowledge index
      const knowledgeDir = join(options.project, config.knowledge.dir);
      const existingIndex = loadIndex(knowledgeDir);

      const categories = options.category ? [options.category] : [...VALID_CATEGORIES];

      console.log(chalk.green('✓ Knowledge generation context prepared'));
      console.log(chalk.bold(`  Agent:    `) + 'knowledge-keeper');
      console.log(chalk.bold(`  Repo:     `) + options.repo);
      if (pkgJson) {
        console.log(
          chalk.bold(`  Tech:     `) +
            `${pkgJson.name || 'unknown'} (deps: ${Object.keys(pkgJson.dependencies || {}).length})`,
        );
      }
      console.log(chalk.bold(`  Category: `) + categories.join(' → '));
      console.log(chalk.bold(`  Existing: `) + `${existingIndex.entries.length} knowledge entries`);
      console.log('');
      console.log(chalk.dim('  Repo structure:'));
      for (const line of dirTree.slice(0, 20)) {
        console.log(chalk.dim(`    ${line}`));
      }
      if (dirTree.length > 20) {
        console.log(chalk.dim(`    ... (${dirTree.length - 20} more lines)`));
      }
      console.log('');
      console.log('Next: Start Claude Code and use the knowledge-keeper skill:');
      console.log(chalk.bold('  Skill:  ') + 'knowledge-keeper');
      console.log(chalk.bold('  Input:  ') + `repo_path=repos/${options.repo}, category=${options.category || 'all'}`);
    });

  return cmd;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && pnpm vitest run tests/commands/knowledge.test.ts`
Expected: PASS — 4 tests pass

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `cd cli && pnpm test`
Expected: All existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add cli/src/commands/knowledge.ts cli/tests/commands/knowledge.test.ts
git commit -m "feat: add knowledge generate subcommand for repo analysis context"
```

---

### Task 4: Update workflow deliver stages

**Files:**

- Modify: `workflows/feature-dev.md`
- Modify: `workflows/bug-fix.md`
- Modify: `cli/templates/workflows/feature-dev.md`
- Modify: `cli/templates/workflows/bug-fix.md`

- [ ] **Step 1: Update feature-dev deliver stage**

In `workflows/feature-dev.md`, replace the deliver stage frontmatter block. Find the text:

```yaml
- id: deliver
  agent: none
  description: Summarize artifacts, update knowledge, notify for final approval
  actions:
    - summarize_artifacts
    - update_knowledge
```

Replace with:

```yaml
- id: deliver
  agent: knowledge-keeper
  description: Summarize artifacts, generate incremental knowledge, notify for final approval
  input:
    required: [SPEC.md, PLAN.md, code_changes]
  actions:
    - summarize_artifacts
    - generate_incremental_knowledge
    - update_knowledge_index
```

Also update the body section (Stage 4 description). Find:

```
## Stage 4: Deliver

Framework summarizes all artifacts, updates Knowledge with new findings,
notifies human for final review and merge.
```

Replace with:

```
## Stage 4: Deliver

Knowledge Keeper agent summarizes all artifacts, generates incremental
knowledge entries for new patterns or entities discovered during implementation.
Updates knowledge index. Notifies human for final review and merge.
```

- [ ] **Step 2: Update bug-fix deliver stage**

In `workflows/bug-fix.md`, replace the deliver stage frontmatter block. Find the text:

```yaml
- id: deliver
  agent: none
  description: Summarize fix, update knowledge if root cause reveals new learning
  actions:
    - summarize_artifacts
    - update_knowledge
```

Replace with:

```yaml
- id: deliver
  agent: knowledge-keeper
  description: Summarize fix, generate incremental knowledge if root cause reveals new learning
  input:
    required: [DIAGNOSIS.md, code_changes]
  actions:
    - summarize_artifacts
    - generate_incremental_knowledge
    - update_knowledge_index
```

Also update the body section (Stage 4 description). Find:

```
## Stage 4: Deliver

Framework summarizes and updates Knowledge if root cause reveals new insight.
```

Replace with:

```
## Stage 4: Deliver

Knowledge Keeper agent summarizes fix, generates incremental knowledge
if root cause analysis reveals new architectural insights or patterns.
Updates knowledge index. Notifies human for final review and merge.
```

- [ ] **Step 3: Sync templates**

```bash
cp workflows/feature-dev.md cli/templates/workflows/feature-dev.md
cp workflows/bug-fix.md cli/templates/workflows/bug-fix.md
```

- [ ] **Step 4: Verify workflow engine still validates**

Run: `cd cli && pnpm vitest run tests/workflow-engine.test.ts`
Expected: All workflow engine tests pass (engine parses updated workflow definitions without error)

- [ ] **Step 5: Commit**

```bash
git add workflows/feature-dev.md workflows/bug-fix.md cli/templates/workflows/feature-dev.md cli/templates/workflows/bug-fix.md
git commit -m "feat: wire knowledge-keeper agent into deliver stage of feature-dev and bug-fix workflows"
```

---

### Task 5: End-to-end verification

**Files:**

- Verify: `cli/tests/e2e/feature-dev.test.ts`
- Verify: `cli/tests/e2e/bug-fix.test.ts`

- [ ] **Step 1: Run e2e tests**

Run: `cd cli && pnpm vitest run tests/e2e/`
Expected: All e2e tests pass (workflows with updated deliver stages still execute correctly)

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: All 88+ tests pass across both CLI and workbench packages

- [ ] **Step 3: Verify skill discoverability**

Run: `cd cli && npx tsx src/index.ts skill list`
Expected: Output lists `knowledge-keeper` among available skills

---

## Completion checklist

- [ ] `agents/knowledge-keeper.md` exists with valid YAML frontmatter
- [ ] `skills/knowledge-keeper/SKILL.md` exists with four-phase analysis process
- [ ] Template files exist in `cli/templates/` for both agent and skill
- [ ] `clockwork knowledge generate --repo <name>` works and validates input
- [ ] `clockwork knowledge generate --repo <name> --category architecture` scopes to one category
- [ ] Invalid repo name produces clear error with available repos listed
- [ ] Invalid category name produces clear error with valid categories listed
- [ ] `clockwork skill list` shows knowledge-keeper
- [ ] Feature-dev deliver stage references knowledge-keeper agent
- [ ] Bug-fix deliver stage references knowledge-keeper agent
- [ ] All existing tests pass (no regressions)
- [ ] Template workflows are in sync with source workflows
