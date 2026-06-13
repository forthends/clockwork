# Team Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-role team collaboration with personal identity config, role-driven workflow, and onboard auto-detection for new members joining existing projects.

**Architecture:** Split project config (`config.yaml`) from personal config (`user.yaml`). Add `UserConfig` type and `role` field to `WorkflowStage`. Create `team-feature-dev` workflow with role-gated stages. Enhance `onboard` to detect existing projects and route three scenarios.

**Tech Stack:** TypeScript (strict), vitest, commander.js, chalk, YAML

---

## File structure

| File                                          | Responsibility                                    |
| --------------------------------------------- | ------------------------------------------------- |
| `cli/src/types.ts`                            | Add `UserConfig`, `role` to `WorkflowStage`       |
| `cli/src/config.ts`                           | Add `loadUserConfig()`, `saveUserConfig()`        |
| `workflows/team-feature-dev.md`               | New role-driven workflow                          |
| `cli/templates/workflows/team-feature-dev.md` | Template copy                                     |
| `cli/src/commands/init.ts`                    | Add user.yaml to .gitignore                       |
| `cli/src/commands/onboard.ts`                 | Three-scenario routing + personal info collection |
| `cli/tests/commands/onboard.test.ts`          | Additional tests for scenarios                    |
| `cli/tests/e2e/team-feature-dev.test.ts`      | Workflow E2E test                                 |

---

### Task 1: Add types and config utilities

**Files:**

- Modify: `cli/src/types.ts`
- Modify: `cli/src/config.ts`

- [ ] **Step 1: Add UserConfig type and role to WorkflowStage**

In `cli/src/types.ts`, add after the existing types:

```typescript
export interface UserConfig {
  name: string;
  role: 'pm' | 'developer' | 'tester';
  email: string;
}
```

And modify `WorkflowStage` to add `role`:

```typescript
export interface WorkflowStage {
  id: string;
  agent: string;
  role?: 'pm' | 'developer' | 'tester';
  description: string;
  skills?: string[];
  input: { required: string[] };
  output?: string[];
  strategy?: 'sequential' | 'parallel';
  maxRetries?: number;
  humanReview: 'required' | 'optional' | 'none';
}
```

- [ ] **Step 2: Add loadUserConfig and saveUserConfig to config.ts**

Add to `cli/src/config.ts`:

```typescript
import { stringify as stringifyYaml } from 'yaml';
import { writeFileSync } from 'fs';
import { UserConfig } from './types.js';

export function loadUserConfig(projectRoot: string): UserConfig | null {
  const userPath = join(projectRoot, '.clockwork', 'user.yaml');
  if (!existsSync(userPath)) return null;
  try {
    const raw = readFileSync(userPath, 'utf8');
    const parsed = parseYaml(raw) as { user?: UserConfig };
    return parsed?.user || null;
  } catch {
    return null;
  }
}

export function saveUserConfig(projectRoot: string, user: UserConfig): void {
  const userPath = join(projectRoot, '.clockwork', 'user.yaml');
  writeFileSync(userPath, stringifyYaml({ user }));
}
```

The `join` and `existsSync` are already imported in config.ts. The `readFileSync` is already imported. Add `writeFileSync` to the fs import.

- [ ] **Step 3: Verify compilation**

Run: `cd cli && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run tests**

Run: `cd cli && pnpm test`
Expected: All 95 tests pass

- [ ] **Step 5: Commit**

```bash
git add cli/src/types.ts cli/src/config.ts
git commit -m "feat: add UserConfig type and load/save user config utilities"
```

---

### Task 2: Create team-feature-dev workflow

**Files:**

- Create: `workflows/team-feature-dev.md`
- Create: `cli/templates/workflows/team-feature-dev.md`

- [ ] **Step 1: Write workflow definition**

Create `workflows/team-feature-dev.md`:

```markdown
---
name: team-feature-dev
description: Multi-role feature development workflow for agile teams
trigger: PM provides requirements, team collaborates through design → implement → test
stages:
  - id: requirements
    agent: planner
    role: pm
    description: Define product requirements and acceptance criteria
    skills: [brainstorming]
    input:
      required: [feature_brief]
    output:
      - PRD.md
    human_review: required
  - id: design
    agent: planner
    role: developer
    description: Technical design based on PRD
    skills: [brainstorming, writing-plans]
    input:
      required: [PRD.md, knowledge_context]
    output:
      - SPEC.md
      - PLAN.md
    human_review: required
  - id: implementation
    agent: implementer
    role: developer
    description: TDD-driven implementation following PLAN
    skills: [test-driven-development]
    input:
      required: [SPEC.md, PLAN.md]
    strategy: sequential
    max_retries: 3
    human_review: none
  - id: testing
    agent: reviewer
    role: tester
    description: Generate test plan, execute tests, report bugs
    skills: [test-driven-development, systematic-debugging]
    input:
      required: [PRD.md, SPEC.md, code_changes]
    output:
      - TEST_PLAN.md
      - TEST_REPORT.md
    human_review: required
  - id: deliver
    agent: knowledge-keeper
    role: developer
    description: Summarize artifacts, update knowledge base
    input:
      required: [PRD.md, SPEC.md, TEST_REPORT.md]
    actions:
      - summarize_artifacts
      - update_knowledge_index
---

# Team Feature Development Workflow

## Stage 1: Requirements

PM defines product requirements using the Planner agent. Outputs PRD.md with
acceptance criteria. PM must approve before design begins.

## Stage 2: Design

Developer produces technical design (SPEC.md) and implementation plan (PLAN.md)
based on the PRD. Developer or tech lead must approve before implementation.

## Stage 3: Implementation

Developer implements tasks from the PLAN using TDD. Auto-proceeds to testing
on completion. Max 3 retries per task.

## Stage 4: Testing

Tester generates TEST_PLAN.md, executes tests, and produces TEST_REPORT.md.
Bugs are filed as defect tasks. Tester must approve before delivery.

## Stage 5: Deliver

Knowledge Keeper summarizes artifacts and updates knowledge base.
Final notification for team review and merge.
```

- [ ] **Step 2: Copy to templates**

```bash
cp workflows/team-feature-dev.md cli/templates/workflows/team-feature-dev.md
```

- [ ] **Step 3: Verify workflow engine parses it**

Run: `cd cli && pnpm vitest run tests/workflow-engine.test.ts`
Expected: 19 tests pass (engine correctly parses new workflow)

- [ ] **Step 4: Commit**

```bash
git add workflows/team-feature-dev.md cli/templates/workflows/team-feature-dev.md
git commit -m "feat: add team-feature-dev multi-role workflow"
```

---

### Task 3: Update init.ts for .gitignore

**Files:**

- Modify: `cli/src/commands/init.ts`

- [ ] **Step 1: Add user.yaml to .gitignore in createProject()**

In `cli/src/commands/init.ts`, inside `createProject()`, add a `.gitignore` file if it doesn't exist, and add the user.yaml line. Add this after the directory creation loop but before the config write:

```typescript
// Write .gitignore with user.yaml exclusion
const gitignorePath = join(targetPath, '.gitignore');
const gitignoreLine = '.clockwork/user.yaml\n';
if (!existsSync(gitignorePath)) {
  writeFileSync(gitignorePath, gitignoreLine);
} else {
  const existing = readFileSync(gitignorePath, 'utf8');
  if (!existing.includes('.clockwork/user.yaml')) {
    writeFileSync(gitignorePath, existing + gitignoreLine);
  }
}
```

Requires `readFileSync` import (already imported at top of init.ts).

- [ ] **Step 2: Run tests**

Run: `cd cli && pnpm vitest run tests/commands/init.test.ts`
Expected: 1 test passes, .gitignore contains user.yaml line

- [ ] **Step 3: Run full test suite**

Run: `cd cli && pnpm test`
Expected: All 95 tests pass

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/init.ts
git commit -m "feat: add user.yaml to .gitignore in project creation"
```

---

### Task 4: Update onboard for three scenarios + personal info

**Files:**

- Modify: `cli/src/commands/onboard.ts`

- [ ] **Step 1: Add personal info collection function**

Add this function to `cli/src/commands/onboard.ts` (before `export function onboardCommand()`):

```typescript
function printPersonalHeader(): void {
  console.log('');
  console.log(chalk.bold('━━━━ '.repeat(9)));
  console.log(chalk.bold('  个人信息'));
  console.log(chalk.bold('━━━━ '.repeat(9)));
  console.log('');
}

async function collectPersonalInfo(question: QuestionFn): Promise<UserConfig> {
  printPersonalHeader();

  const name = await question('你的姓名', '');
  while (!name) {
    console.log(chalk.yellow('  姓名不能为空'));
    const retry = await question('你的姓名', '');
    if (retry) return { name: retry, role: 'developer', email: '' };
  }

  console.log('');
  console.log('你的角色:');
  console.log(chalk.dim('  1. pm (产品经理)'));
  console.log(chalk.dim('  2. developer (开发者)'));
  console.log(chalk.dim('  3. tester (测试)'));
  const roleInput = await question('', '2');
  const roleMap: Record<string, UserConfig['role']> = { '1': 'pm', '2': 'developer', '3': 'tester' };
  const role = roleMap[roleInput] || 'developer';

  const email = await question('你的邮箱', '');

  const user: UserConfig = { name, role, email };

  console.log('');
  console.log(chalk.bold('确认信息:'));
  console.log(chalk.dim(`  姓名: ${user.name}`));
  console.log(chalk.dim(`  角色: ${user.role}`));
  console.log(chalk.dim(`  邮箱: ${user.email || '(未填写)'}`));
  console.log('');

  const confirm = await question('确认? (Y/n)', 'y');
  if (confirm.toLowerCase() !== 'y' && confirm !== '') {
    console.log(chalk.yellow('已取消个人信息设置。可稍后重新运行 `clockwork onboard`。'));
    process.exit(0);
  }

  return user;
}
```

- [ ] **Step 2: Modify the onboard command to route three scenarios**

Replace the `onboardCommand()` function's `.action()` callback:

```typescript
export function onboardCommand(): Command {
  return new Command('onboard')
    .description('Interactive workspace initialization wizard')
    .argument('[path]', 'Project path', process.cwd())
    .action(async (targetPath: string) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const question = createQuestions(rl);

      try {
        const configExists = existsSync(join(targetPath, '.clockwork', 'config.yaml'));
        const userExists = loadUserConfig(targetPath) !== null;

        if (configExists && userExists) {
          // Scenario C: Both exist — show current and ask to modify
          const currentUser = loadUserConfig(targetPath)!;
          console.log('');
          console.log(chalk.bold('已检测到 Clockwork 项目及用户配置:'));
          console.log(chalk.dim(`  项目: ${targetPath}`));
          console.log(chalk.dim(`  姓名: ${currentUser.name}`));
          console.log(chalk.dim(`  角色: ${currentUser.role}`));
          console.log(chalk.dim(`  邮箱: ${currentUser.email || '(未填写)'}`));
          console.log('');
          const modify = await question('修改个人信息? (y/N)', 'n');
          if (modify.toLowerCase() === 'y') {
            const user = await collectPersonalInfo(question);
            saveUserConfig(targetPath, user);
            console.log(chalk.green('✓ 个人信息已更新'));
          }
        } else if (configExists && !userExists) {
          // Scenario B: Project exists, no user — new member joining
          console.log('');
          console.log(chalk.green(`✓ 已检测到 Clockwork 项目: ${targetPath}`));
          console.log(chalk.dim('  项目已就绪，跳过项目初始化阶段。'));
          const user = await collectPersonalInfo(question);
          saveUserConfig(targetPath, user);
          console.log(chalk.green('✓ 个人信息已保存'));
          await stage4Validation(targetPath);
        } else {
          // Scenario A: New project — full onboard flow
          await stage1Project(question, targetPath);
          const repos = await stage2Repos(question, targetPath);
          await stage3Knowledge(question, targetPath, repos);
          await stage4Validation(targetPath);
          const user = await collectPersonalInfo(question);
          saveUserConfig(targetPath, user);
          console.log(chalk.green('✓ 个人信息已保存'));
        }
      } finally {
        rl.close();
      }
    });
}
```

- [ ] **Step 3: Add imports**

Ensure these imports are at the top of onboard.ts:

```typescript
import { existsSync } from 'fs';
import { loadUserConfig, saveUserConfig } from '../config.js';
import { UserConfig } from '../types.js';
```

Note: `existsSync` is already imported from 'fs'. `join` is already imported from 'path'. Check existing imports and add only the missing ones.

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd cli && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run onboard tests**

Run: `cd cli && pnpm vitest run tests/commands/onboard.test.ts`
Expected: Tests pass (existing 3 tests for Scenario A still work)

- [ ] **Step 6: Run full test suite**

Run: `cd cli && pnpm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add cli/src/commands/onboard.ts
git commit -m "feat: add multi-scenario routing and personal info collection to onboard"
```

---

### Task 5: Update onboard tests for new scenarios

**Files:**

- Modify: `cli/tests/commands/onboard.test.ts`

- [ ] **Step 1: Add test for Scenario B (join existing project)**

Add these test cases to the existing `cli/tests/commands/onboard.test.ts`:

```typescript
it('detects existing project and collects personal info (Scenario B)', () => {
  const joinDir = join(tmpdir(), 'clockwork-onboard-join-' + Date.now());
  try {
    // First, create a project with init
    execSync(`cd ${__dirname}/../.. && ${CLI} init ${joinDir}`, { encoding: 'utf8', timeout: 10000 });
    // Also init git so stage4 validation doesn't fail on submodule check
    execSync(`cd ${joinDir} && git init && git add -A && git commit -m "init"`, { encoding: 'utf8', timeout: 10000 });

    // Now run onboard — should detect project and ask for personal info only
    const input = '李四\n1\nlisi@example.com\ny\n';
    const output = execSync(`cd ${__dirname}/../.. && printf '${input}' | ${CLI} onboard ${joinDir}`, {
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(output).toContain('已检测到 Clockwork 项目');
    expect(output).toContain('个人信息已保存');

    // Verify user.yaml exists
    expect(existsSync(join(joinDir, '.clockwork', 'user.yaml'))).toBe(true);

    // Verify it does NOT contain project creation output
    expect(output).not.toContain('项目已创建');
  } finally {
    rmSync(joinDir, { recursive: true, force: true });
  }
}, 30000);

it('shows current user info and allows modification (Scenario C)', () => {
  const modDir = join(tmpdir(), 'clockwork-onboard-mod-' + Date.now());
  try {
    // Create project with init and write a user.yaml manually
    execSync(`cd ${__dirname}/../.. && ${CLI} init ${modDir}`, { encoding: 'utf8', timeout: 10000 });
    execSync(`cd ${modDir} && git init && git add -A && git commit -m "init"`, { encoding: 'utf8', timeout: 10000 });
    const userYaml = join(modDir, '.clockwork', 'user.yaml');
    writeFileSync(userYaml, 'user:\n  name: 王五\n  role: developer\n  email: wangwu@test.com\n');

    // Run onboard — should show current info and ask to modify
    const input = 'y\n赵六\n3\nzhaoliu@test.com\ny\n';
    const output = execSync(`cd ${__dirname}/../.. && printf '${input}' | ${CLI} onboard ${modDir}`, {
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(output).toContain('王五');
    expect(output).toContain('个人信息已更新');

    const config = readFileSync(join(modDir, '.clockwork', 'user.yaml'), 'utf8');
    expect(config).toContain('赵六');
  } finally {
    rmSync(modDir, { recursive: true, force: true });
  }
}, 30000);
```

Requires adding `writeFileSync` to the existing imports from 'fs'.

- [ ] **Step 2: Run onboard tests**

Run: `cd cli && pnpm vitest run tests/commands/onboard.test.ts`
Expected: 5 tests pass (3 original + 2 new)

- [ ] **Step 3: Run full test suite**

Run: `cd cli && pnpm test`
Expected: All 97 tests pass

- [ ] **Step 4: Commit**

```bash
git add cli/tests/commands/onboard.test.ts
git commit -m "test: add Scenario B and C tests for onboard personal info collection"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass across CLI and workbench

- [ ] **Step 2: Verify skill list includes team-feature-dev**

Run: `cd cli && npx tsx src/index.ts skill list --project /Users/tenet/Workspace/Projects/clockwork`
Expected: No breakage, skills still load correctly

- [ ] **Step 3: Manual smoke test — Scenario A**

Run onboard on a fresh directory with default inputs, verify:

- Directory structure created
- config.yaml has project settings
- user.yaml has personal info
- .gitignore has user.yaml line

- [ ] **Step 4: Manual smoke test — Scenario B**

```bash
mkdir /tmp/cw-team && cd /tmp/cw-team
clockwork init . --project /path/to/clockwork
# Then run onboard — verify it detects the project
```

- [ ] **Step 5: Verify user.yaml is gitignored**

```bash
git status  # should NOT show .clockwork/user.yaml as untracked
```

---

## Completion checklist

- [ ] `UserConfig` type added to types.ts
- [ ] `loadUserConfig()` and `saveUserConfig()` in config.ts
- [ ] `role` field on `WorkflowStage`
- [ ] `team-feature-dev` workflow created and template synced
- [ ] `.gitignore` template includes `.clockwork/user.yaml`
- [ ] `onboard` routes three scenarios (A/B/C)
- [ ] Personal info collection: name, role, email with confirmation
- [ ] All tests pass, no regressions
