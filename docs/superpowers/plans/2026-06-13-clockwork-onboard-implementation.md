# Clockwork Onboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive `clockwork onboard` wizard that guides users through workspace initialization in four stages (skeleton → repos → knowledge → validation).

**Architecture:** Extract project creation logic from `init.ts` into a shared `createProject()` function. Build the onboard wizard using `readline/promises` with chalk progress display. Stage 3 reuses P1's knowledge generate context logic. Stage 4 validates and auto-fixes common issues.

**Tech Stack:** TypeScript (strict), vitest, commander.js, Node.js readline/promises, chalk, YAML

---

## File structure

| File                                 | Responsibility                                           |
| ------------------------------------ | -------------------------------------------------------- |
| `cli/src/commands/init.ts`           | Refactor: extract `createProject()`, thin `init` wrapper |
| `cli/src/commands/onboard.ts`        | Interactive four-stage wizard                            |
| `cli/src/index.ts`                   | Register `onboard` command                               |
| `cli/tests/commands/onboard.test.ts` | Integration tests for onboard wizard                     |
| `cli/tests/commands/init.test.ts`    | Update for init refactor                                 |

---

### Task 1: Refactor init.ts to extract createProject()

**Files:**

- Modify: `cli/src/commands/init.ts`

Extract the project creation logic into an exported function so both `init` and `onboard` can use it.

- [ ] **Step 1: Refactor init.ts**

Replace `cli/src/commands/init.ts` with:

```typescript
import { Command } from 'commander';
import { mkdirSync, writeFileSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { stringify as stringifyYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ProjectConfig {
  name: string;
  ide: 'claude-code' | 'cursor' | 'codex';
  defaultModel: 'sonnet' | 'opus' | 'haiku';
  webPort: number;
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  name: 'my-project',
  ide: 'claude-code',
  defaultModel: 'sonnet',
  webPort: 4200,
};

function findTemplatesDir(): string | null {
  const distTemplates = join(__dirname, '..', 'templates');
  if (existsSync(distTemplates)) return distTemplates;

  const srcTemplates = join(__dirname, '..', '..', 'templates');
  if (existsSync(srcTemplates)) return srcTemplates;

  return null;
}

export function createProject(targetPath: string, projectConfig: ProjectConfig): void {
  const dirs = [
    '.clockwork',
    'agents',
    'skills',
    'knowledge/architecture',
    'knowledge/business',
    'knowledge/design-system',
    'knowledge/decisions',
    'workflows',
    'repos',
    'workspace',
  ];

  for (const dir of dirs) {
    mkdirSync(join(targetPath, dir), { recursive: true });
  }

  const config = {
    project: { name: projectConfig.name },
    ide: { primary: projectConfig.ide },
    agents: { dir: 'agents/', defaultModel: projectConfig.defaultModel },
    knowledge: { dir: 'knowledge/', index: 'knowledge/index.yaml', maxEntriesPerQuery: 5 },
    workflows: { dir: 'workflows/' },
    repos: { dir: 'repos/' },
    workspace: { dir: 'workspace/' },
    web: { port: projectConfig.webPort, host: 'localhost' },
  };

  const configPath = join(targetPath, '.clockwork', 'config.yaml');
  writeFileSync(configPath, stringifyYaml(config));

  const templatesDir = findTemplatesDir();
  if (templatesDir) {
    const copyDir = (name: string) => {
      const src = join(templatesDir, name);
      const dest = join(targetPath, name);
      if (existsSync(src)) {
        cpSync(src, dest, { recursive: true });
      }
    };
    copyDir('workflows');
    copyDir('agents');
    copyDir('skills');
    copyDir('knowledge');

    const ccSkillsDir = join(targetPath, '.claude', 'skills');
    const projectSkillsDir = join(targetPath, 'skills');
    if (existsSync(projectSkillsDir)) {
      mkdirSync(ccSkillsDir, { recursive: true });
      cpSync(projectSkillsDir, ccSkillsDir, { recursive: true });
    }
  }
}

export function initCommand(): Command {
  return new Command('init')
    .description('Initialize a new Clockwork project')
    .argument('[path]', 'Project path', process.cwd())
    .action((targetPath: string) => {
      createProject(targetPath, { ...DEFAULT_PROJECT_CONFIG, name: targetPath.split('/').pop() || 'my-project' });

      console.log(chalk.green('✓ Clockwork project initialized at'), targetPath);
      console.log(chalk.dim('  Created .clockwork/config.yaml'));
      console.log(chalk.dim('  Created agents/, skills/, knowledge/, workflows/, repos/, workspace/, .claude/skills/'));
    });
}
```

Note: `init` now uses `DEFAULT_PROJECT_CONFIG` and derives the project name from the path argument. The `onboard` command will call `createProject` directly with user-provided config.

- [ ] **Step 2: Run init tests to verify no regressions**

Run: `cd cli && pnpm vitest run tests/commands/init.test.ts`
Expected: PASS — init still works correctly

- [ ] **Step 3: Run full test suite**

Run: `cd cli && pnpm test`
Expected: All 92 tests pass

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/init.ts
git commit -m "refactor: extract createProject() from init for reuse by onboard"
```

---

### Task 2: Create onboard command

**Files:**

- Create: `cli/src/commands/onboard.ts`

The interactive four-stage wizard.

- [ ] **Step 1: Write onboard command**

Create `cli/src/commands/onboard.ts`:

```typescript
import { Command } from 'commander';
import { existsSync, mkdirSync, readdirSync, cpSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline/promises';
import chalk from 'chalk';
import { createProject, DEFAULT_PROJECT_CONFIG, ProjectConfig } from './init.js';
import { loadConfig } from '../config.js';
import { buildIndex, saveIndex, loadIndex } from '../knowledge-indexer.js';
import { parseFrontmatter } from '../frontmatter.js';

function printHeader(stage: number, title: string): void {
  console.log('');
  console.log(chalk.bold('━━━━ '.repeat(9)));
  console.log(chalk.bold(`  Clockwork Onboard — ${title}`));
  console.log('');
  const stages = ['项目骨架', '仓库导入', '知识库生成', '配置检查'];
  for (let i = 1; i <= 4; i++) {
    const icon = i < stage ? chalk.green('✓') : i === stage ? chalk.cyan('...') : chalk.dim('○');
    const label =
      i === stage
        ? chalk.cyan(`[${i}/4] ${stages[i - 1]}`)
        : i < stage
          ? chalk.green(`[${i}/4] ${stages[i - 1]}`)
          : chalk.dim(`[${i}/4] ${stages[i - 1]}`);
    const suffix = i < stage ? chalk.green(' 完成') : i === stage ? chalk.cyan(' 进行中') : chalk.dim(' 待开始');
    console.log(`  ${icon} ${label}${suffix}`);
  }
  console.log(chalk.bold('━━━━ '.repeat(9)));
  console.log('');
}

async function question(rl: readline.Interface, prompt: string, defaultValue?: string): Promise<string> {
  const fullPrompt = defaultValue ? `${prompt} (默认: ${defaultValue}): ` : `${prompt}: `;
  const answer = await rl.question(chalk.cyan(fullPrompt));
  return answer.trim() || defaultValue || '';
}

async function stage1Project(rl: readline.Interface, targetPath: string): Promise<void> {
  printHeader(1, '工作空间初始化向导');

  const name = await question(rl, '项目名称', DEFAULT_PROJECT_CONFIG.name);

  console.log('');
  console.log('IDE 选择:');
  console.log(chalk.dim('  1. claude-code (默认)'));
  console.log(chalk.dim('  2. cursor'));
  console.log(chalk.dim('  3. codex'));
  const ideInput = await question(rl, '', '1');
  const ideMap: Record<string, ProjectConfig['ide']> = { '1': 'claude-code', '2': 'cursor', '3': 'codex' };
  const ide = ideMap[ideInput] || 'claude-code';

  console.log('');
  console.log('默认 AI 模型:');
  console.log(chalk.dim('  1. sonnet (默认)'));
  console.log(chalk.dim('  2. opus'));
  console.log(chalk.dim('  3. haiku'));
  const modelInput = await question(rl, '', '1');
  const modelMap: Record<string, ProjectConfig['defaultModel']> = { '1': 'sonnet', '2': 'opus', '3': 'haiku' };
  const model = modelMap[modelInput] || 'sonnet';

  const portInput = await question(rl, 'Web 工作台端口', String(DEFAULT_PROJECT_CONFIG.webPort));
  const port = parseInt(portInput, 10) || DEFAULT_PROJECT_CONFIG.webPort;

  const config: ProjectConfig = { name, ide, defaultModel: model, webPort: port };

  console.log('');
  console.log(chalk.bold('确认配置:'));
  console.log(chalk.dim(`  项目名称:  ${config.name}`));
  console.log(chalk.dim(`  IDE:       ${config.ide}`));
  console.log(chalk.dim(`  默认模型:  ${config.defaultModel}`));
  console.log(chalk.dim(`  Web 端口:  ${config.webPort}`));
  console.log('');

  const confirm = await question(rl, '确认创建? (Y/n)', 'y');
  if (confirm.toLowerCase() !== 'y' && confirm !== '') {
    console.log(chalk.yellow('已取消。'));
    process.exit(0);
  }

  console.log('');
  createProject(targetPath, config);

  console.log(chalk.green(`✓ 项目已创建: ${targetPath}`));
  console.log(chalk.dim('  创建了 .clockwork/config.yaml'));
  console.log(chalk.dim('  创建了 agents/, skills/, knowledge/, workflows/, repos/, workspace/, .claude/skills/'));
}

async function stage2Repos(rl: readline.Interface, targetPath: string): Promise<string[]> {
  printHeader(2, '仓库导入');

  const repos: string[] = [];
  const reposDir = join(targetPath, 'repos');
  const GIT_URL_RE = /^(https?:\/\/|git@)[^\s]+\.git$/;

  while (true) {
    const url = await question(rl, '仓库 URL (或按 Enter 跳过)', '');
    if (!url) break;

    const isValidUrl = GIT_URL_RE.test(url) || existsSync(url);
    if (!isValidUrl) {
      console.log(chalk.red(`  无效的 URL: ${url}`));
      console.log(chalk.dim('  格式示例: "https://github.com/org/repo.git"'));
      continue;
    }

    const defaultName = url.split('/').pop()?.replace('.git', '') || 'repo';
    const name = await question(rl, '子目录名称', defaultName);

    const repoPath = join(reposDir, name);
    if (existsSync(repoPath)) {
      console.log(chalk.yellow(`  目录已存在: repos/${name}`));
      continue;
    }

    try {
      console.log(chalk.dim(`  正在添加 ${name}...`));
      execSync(`git -c protocol.file.allow=always submodule add ${url} ${repoPath}`, {
        cwd: targetPath,
        stdio: 'pipe',
      });
      console.log(chalk.green(`  ✓ 已添加: repos/${name}`));
      repos.push(name);
    } catch {
      console.log(chalk.red(`  添加失败: ${url}`));
    }

    const more = await question(rl, '\n还要添加更多仓库吗? (y/N)', 'n');
    if (more.toLowerCase() !== 'y') break;
  }

  if (repos.length > 0) {
    try {
      execSync('git submodule update --init', { cwd: targetPath, stdio: 'pipe' });
    } catch {
      // non-fatal
    }
  } else {
    console.log(chalk.dim('  跳过仓库导入。稍后可用 `clockwork repo add <url>` 添加仓库。'));
  }

  return repos;
}

async function stage3Knowledge(rl: readline.Interface, targetPath: string, repos: string[]): Promise<void> {
  printHeader(3, '知识库生成');

  if (repos.length === 0) {
    console.log(chalk.dim('  无仓库，跳过知识库生成。'));
    console.log(chalk.dim('  稍后可用 `clockwork knowledge generate --repo <name>` 生成知识库。'));
    return;
  }

  let selectedRepos: string[];

  if (repos.length === 1) {
    selectedRepos = repos;
  } else {
    console.log('已导入的仓库:');
    for (let i = 0; i < repos.length; i++) {
      console.log(chalk.dim(`  ${i + 1}. ${repos[i]}`));
    }
    console.log(chalk.dim(`  ${repos.length + 1}. 全部`));
    console.log(chalk.dim(`  ${repos.length + 2}. 跳过`));
    console.log('');

    const choice = await question(rl, '要为哪个仓库生成知识库?', String(repos.length + 2));
    const idx = parseInt(choice, 10);

    if (isNaN(idx) || idx === repos.length + 2) {
      console.log(chalk.dim('  跳过知识库生成。稍后可用 `clockwork knowledge generate --repo <name>` 生成知识库。'));
      return;
    }
    if (idx === repos.length + 1) {
      selectedRepos = repos;
    } else if (idx >= 1 && idx <= repos.length) {
      selectedRepos = [repos[idx - 1]];
    } else {
      console.log(chalk.dim('  跳过知识库生成。'));
      return;
    }
  }

  for (const repo of selectedRepos) {
    console.log('');
    console.log(chalk.bold(`  仓库: ${repo}`));
    console.log(chalk.dim('  ─────────────────────'));

    const config = loadConfig(targetPath);
    const repoPath = join(targetPath, config.repos.dir, repo);
    const knowledgeDir = join(targetPath, config.knowledge.dir);
    const existingIndex = loadIndex(knowledgeDir);

    console.log(chalk.green(`  ✓ Knowledge generation context prepared`));
    console.log(chalk.bold(`    Agent:    `) + 'knowledge-keeper');
    console.log(chalk.bold(`    Repo:     `) + repo);
    console.log(chalk.bold(`    Category: `) + 'architecture → business → design-system → decisions');
    console.log(chalk.bold(`    Existing: `) + `${existingIndex.entries.length} knowledge entries`);
    console.log('');
    console.log('  请在 Claude Code 中执行:');
    console.log(chalk.bold(`    Skill:  `) + 'knowledge-keeper');
    console.log(chalk.bold(`    Input:  `) + `repo_path=repos/${repo}, category=all`);
  }

  console.log('');
}

async function stage4Validation(targetPath: string): Promise<void> {
  printHeader(4, '配置检查');

  console.log('检查项目完整性...\n');

  const checks: { label: string; ok: boolean; warning?: string }[] = [];
  const config = loadConfig(targetPath);

  // config.yaml
  const configPath = join(targetPath, '.clockwork', 'config.yaml');
  checks.push({ label: '.clockwork/config.yaml', ok: existsSync(configPath) });

  // directories
  for (const dir of ['agents', 'skills', 'knowledge', 'workflows', 'repos', 'workspace']) {
    const dirPath = join(targetPath, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      checks.push({ label: `${dir}/`, ok: true, warning: '已自动创建' });
    } else {
      checks.push({ label: `${dir}/`, ok: true });
    }
  }

  // knowledge index
  try {
    const knowledgeDir = join(targetPath, config.knowledge.dir);
    const index = loadIndex(knowledgeDir);
    checks.push({ label: `knowledge/ (${index.entries.length} 条知识, 索引正常)`, ok: true });
  } catch {
    const knowledgeDir = join(targetPath, config.knowledge.dir);
    const index = buildIndex(knowledgeDir);
    saveIndex(knowledgeDir, index);
    checks.push({ label: 'knowledge/ (索引已重建)', ok: true, warning: '已自动修复' });
  }

  // .claude/skills/ sync
  const ccSkillsDir = join(targetPath, '.claude', 'skills');
  const skillsDir = join(targetPath, 'skills');
  if (existsSync(skillsDir)) {
    mkdirSync(ccSkillsDir, { recursive: true });
    cpSync(skillsDir, ccSkillsDir, { recursive: true });
    checks.push({ label: '.claude/skills/ (已同步)', ok: true });
  } else {
    checks.push({ label: '.claude/skills/ (skills/ 不存在)', ok: false });
  }

  // git submodule
  try {
    execSync('git submodule status', { cwd: targetPath, stdio: 'pipe' });
    checks.push({ label: 'git submodule', ok: true });
  } catch {
    try {
      execSync('git submodule update --init', { cwd: targetPath, stdio: 'pipe' });
      checks.push({ label: 'git submodule (已初始化)', ok: true, warning: '已自动修复' });
    } catch {
      checks.push({ label: 'git submodule', ok: false });
    }
  }

  // agents
  const agentsDir = join(targetPath, 'agents');
  if (existsSync(agentsDir)) {
    let agentCount = 0;
    for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          parseFrontmatter(join(agentsDir, entry.name));
          agentCount++;
        } catch {
          checks.push({ label: `agents/${entry.name} (frontmatter 无效)`, ok: false });
        }
      }
    }
    checks.push({ label: `agents/ (${agentCount} 个 agent)`, ok: true });
  }

  // skills
  if (existsSync(skillsDir)) {
    let skillCount = 0;
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const skillMd = join(skillsDir, entry.name, 'SKILL.md');
        if (existsSync(skillMd)) {
          try {
            parseFrontmatter(skillMd);
            skillCount++;
          } catch {
            checks.push({ label: `skills/${entry.name}/SKILL.md (frontmatter 无效)`, ok: false });
          }
        }
      }
    }
    checks.push({ label: `skills/ (${skillCount} 个 skill)`, ok: true });
  }

  // workflows
  const workflowsDir = join(targetPath, 'workflows');
  if (existsSync(workflowsDir)) {
    let wfCount = 0;
    for (const entry of readdirSync(workflowsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          parseFrontmatter(join(workflowsDir, entry.name));
          wfCount++;
        } catch {
          checks.push({ label: `workflows/${entry.name} (frontmatter 无效)`, ok: false });
        }
      }
    }
    checks.push({ label: `workflows/ (${wfCount} 个工作流)`, ok: true });
  }

  // repos
  const reposDir = join(targetPath, 'repos');
  if (existsSync(reposDir)) {
    const repoEntries = readdirSync(reposDir, { withFileTypes: true }).filter(
      (e) => e.isDirectory() && !['.', '..', '.git'].includes(e.name),
    );
    if (repoEntries.length > 0) {
      checks.push({
        label: `repos/ (${repoEntries.length} 个仓库: ${repoEntries.map((e) => e.name).join(', ')})`,
        ok: true,
      });
    } else {
      checks.push({ label: 'repos/ (空)', ok: true });
    }
  }

  // Print results
  for (const check of checks) {
    if (check.ok) {
      const warning = check.warning ? chalk.yellow(` (${check.warning})`) : '';
      console.log(`  ${chalk.green('✓')} ${check.label}${warning}`);
    } else {
      console.log(`  ${chalk.red('✗')} ${check.label} ${chalk.red('⚠ 需手动修复')}`);
    }
  }

  // Final summary
  console.log('');
  console.log(chalk.bold('━━━━ '.repeat(9)));
  console.log(chalk.green.bold('  ✓ Clockwork 工作空间初始化完成!'));
  console.log('');
  console.log(chalk.bold(`  项目路径: ${targetPath}`));

  const knowledgeDir = join(targetPath, config.knowledge.dir);
  try {
    const index = loadIndex(knowledgeDir);
    console.log(chalk.bold(`  知识库:   ${index.entries.length} 条 (knowledge/)`));
  } catch {
    console.log(chalk.bold('  知识库:   0 条 (knowledge/)'));
  }

  const finalReposDir = join(targetPath, 'repos');
  const finalRepos = existsSync(finalReposDir)
    ? readdirSync(finalReposDir, { withFileTypes: true }).filter(
        (e) => e.isDirectory() && !['.', '..', '.git'].includes(e.name),
      )
    : [];
  console.log(chalk.bold(`  仓库:     ${finalRepos.length} 个 (repos/)`));
  console.log('');
  console.log(chalk.bold('  下一步:'));
  console.log(chalk.dim('    clockwork start feature-dev --slug <name> --repo <repo>'));
  console.log(chalk.dim('    clockwork web    # 打开 Web 工作台'));
  console.log(chalk.bold('━━━━ '.repeat(9)));
}

export function onboardCommand(): Command {
  return new Command('onboard')
    .description('Interactive workspace initialization wizard')
    .argument('[path]', 'Project path', process.cwd())
    .action(async (targetPath: string) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        // Stage 1: Project skeleton
        await stage1Project(rl, targetPath);

        // Stage 2: Repository import
        const repos = await stage2Repos(rl, targetPath);

        // Stage 3: Knowledge generation
        await stage3Knowledge(rl, targetPath, repos);

        // Stage 4: Validation
        await stage4Validation(targetPath);
      } finally {
        rl.close();
      }
    });
}
```

- [ ] **Step 2: Commit**

```bash
git add cli/src/commands/onboard.ts
git commit -m "feat: add clockwork onboard interactive wizard command"
```

---

### Task 3: Register onboard in CLI entry point

**Files:**

- Modify: `cli/src/index.ts`

- [ ] **Step 1: Add onboard import and registration**

In `cli/src/index.ts`, add the import:

```typescript
import { onboardCommand } from './commands/onboard.js';
```

And add the command registration after the existing commands:

```typescript
program.addCommand(onboardCommand());
```

The full `index.ts` after changes:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { startCommand } from './commands/start.js';
import { resumeCommand } from './commands/resume.js';
import { reviewCommand } from './commands/review.js';
import { repoCommand } from './commands/repo.js';
import { knowledgeCommand } from './commands/knowledge.js';
import { skillCommand } from './commands/skill.js';
import { webCommand } from './commands/web.js';
import { cleanupCommand } from './commands/cleanup.js';
import { onboardCommand } from './commands/onboard.js';

const program = new Command();

program.name('clockwork').description('AI collaboration governance framework for agile teams').version('0.1.0');

program.addCommand(initCommand());
program.addCommand(onboardCommand());
program.addCommand(startCommand());
program.addCommand(statusCommand());
program.addCommand(resumeCommand());
program.addCommand(reviewCommand());
program.addCommand(repoCommand());
program.addCommand(knowledgeCommand());
program.addCommand(skillCommand());
program.addCommand(webCommand());
program.addCommand(cleanupCommand());

process.on('SIGINT', () => {
  console.log('\nInterrupted. Use `clockwork resume <task-id>` to recover.');
  process.exit(1);
});

program.parse();
```

- [ ] **Step 2: Verify CLI loads correctly**

Run: `cd cli && npx tsx src/index.ts --help`
Expected: Output lists `onboard` among available commands

- [ ] **Step 3: Commit**

```bash
git add cli/src/index.ts
git commit -m "feat: register onboard command in CLI"
```

---

### Task 4: Integration tests for onboard

**Files:**

- Create: `cli/tests/commands/onboard.test.ts`
- Modify: `cli/tests/commands/init.test.ts` (verify init still works with refactored code)

- [ ] **Step 1: Write onboard test**

Create `cli/tests/commands/onboard.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = 'npx tsx src/index.ts';

describe('clockwork onboard', () => {
  const testDir = join(tmpdir(), 'clockwork-onboard-test-' + Date.now());

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates a project with default answers', () => {
    // Pipe Enter for all prompts (accept defaults, confirm creation)
    const input = '\n\n\n\ny\n\n\n';
    const output = execSync(`cd ${__dirname}/../.. && printf '${input}' | ${CLI} onboard ${testDir}`, {
      encoding: 'utf8',
      timeout: 15000,
    });

    expect(output).toContain('项目已创建');
    expect(output).toContain('Clockwork 工作空间初始化完成');
    expect(existsSync(join(testDir, '.clockwork', 'config.yaml'))).toBe(true);
    expect(existsSync(join(testDir, 'agents'))).toBe(true);
    expect(existsSync(join(testDir, 'skills'))).toBe(true);
    expect(existsSync(join(testDir, 'knowledge'))).toBe(true);
    expect(existsSync(join(testDir, 'workflows'))).toBe(true);
    expect(existsSync(join(testDir, 'repos'))).toBe(true);

    // Verify config has default values
    const config = readFileSync(join(testDir, '.clockwork', 'config.yaml'), 'utf8');
    expect(config).toContain('claude-code');
    expect(config).toContain('sonnet');
    expect(config).toContain('4200');
  });

  it('creates a project with custom config', () => {
    const customDir = join(tmpdir(), 'clockwork-onboard-custom-' + Date.now());
    try {
      // Project name: custom-proj, IDE: 2 (cursor), model: 2 (opus), port: 4300
      const input = 'custom-proj\n2\n2\n4300\ny\n\n\n';
      execSync(`cd ${__dirname}/../.. && printf '${input}' | ${CLI} onboard ${customDir}`, {
        encoding: 'utf8',
        timeout: 15000,
      });

      const config = readFileSync(join(customDir, '.clockwork', 'config.yaml'), 'utf8');
      expect(config).toContain('custom-proj');
      expect(config).toContain('cursor');
      expect(config).toContain('opus');
      expect(config).toContain('4300');
    } finally {
      rmSync(customDir, { recursive: true, force: true });
    }
  });

  it('skips repo import when Enter is pressed', () => {
    const skipDir = join(tmpdir(), 'clockwork-onboard-skip-' + Date.now());
    try {
      // Accept all defaults, skip repo (Enter), skip knowledge
      const input = '\n\n\n\ny\n\n\nn\n';
      const output = execSync(`cd ${__dirname}/../.. && printf '${input}' | ${CLI} onboard ${skipDir}`, {
        encoding: 'utf8',
        timeout: 15000,
      });
      expect(output).toContain('跳过仓库导入');
      expect(output).toContain('无仓库，跳过知识库生成');
    } finally {
      rmSync(skipDir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run onboard tests**

Run: `cd cli && pnpm vitest run tests/commands/onboard.test.ts`
Expected: PASS — 3 tests pass

- [ ] **Step 3: Run full test suite to check for regressions**

Run: `cd cli && pnpm test`
Expected: All tests pass (92 + 3 = 95 tests)

- [ ] **Step 4: Commit**

```bash
git add cli/tests/commands/onboard.test.ts
git commit -m "test: add integration tests for clockwork onboard"
```

---

### Task 5: End-to-end verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass across CLI and workbench

- [ ] **Step 2: Manual smoke test**

Run: `cd /tmp && mkdir cw-smoke && cd cw-smoke && npx tsx /Users/tenet/Workspace/Projects/clockwork/cli/src/index.ts onboard /tmp/cw-smoke/test-project`

Pipe default answers and verify:

- Project directories created
- config.yaml has correct default values
- Templates copied
- Validation stage shows all green checks

- [ ] **Step 3: Verify onboard appears in help**

Run: `cd cli && npx tsx src/index.ts --help`
Expected: `onboard` appears in command list

---

## Completion checklist

- [ ] `createProject()` extracted from init.ts, both init and onboard use it
- [ ] `clockwork onboard` runs four stages in order
- [ ] Stage 1 collects interactive config and creates project
- [ ] Stage 2 supports looped repo import and skip
- [ ] Stage 3 prints knowledge-keeper instructions per repo
- [ ] Stage 4 validates and auto-fixes common issues
- [ ] `clockwork init` still works independently
- [ ] All tests pass (no regressions)
- [ ] `clockwork --help` lists onboard command
