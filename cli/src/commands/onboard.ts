import { Command } from 'commander';
import { existsSync, mkdirSync, readdirSync, cpSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createInterface, Interface } from 'readline';
import chalk from 'chalk';
import { createProject, DEFAULT_PROJECT_CONFIG, ProjectConfig } from './init.js';
import { loadConfig, loadUserConfig, saveUserConfig } from '../config.js';
import { buildIndex, saveIndex, loadIndex } from '../knowledge-indexer.js';
import { parseFrontmatter } from '../frontmatter.js';
import { UserConfig } from '../types.js';

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

/**
 * Create a question function backed by a persistent line queue.
 *
 * readline's promise-based question() loses buffered lines when stdin is a
 * pipe because the one-shot 'line' listener is torn down between microtask
 * ticks.  A persistent listener + queue avoids that.
 */
function createQuestions(rl: Interface) {
  const lineQueue: string[] = [];
  let waiter: ((line: string) => void) | null = null;

  rl.on('line', (line: string) => {
    if (waiter) {
      const w = waiter;
      waiter = null;
      w(line);
    } else {
      lineQueue.push(line);
    }
  });

  return async function question(prompt: string, defaultValue?: string): Promise<string> {
    const fullPrompt = defaultValue ? `${prompt} (默认: ${defaultValue}): ` : `${prompt}: `;
    process.stdout.write(chalk.cyan(fullPrompt));

    let line: string;
    if (lineQueue.length > 0) {
      line = lineQueue.shift()!;
    } else {
      line = await new Promise<string>((resolve) => {
        waiter = resolve;
      });
    }

    return line.trim() || defaultValue || '';
  };
}

type QuestionFn = (prompt: string, defaultValue?: string) => Promise<string>;

async function stage1Project(question: QuestionFn, targetPath: string): Promise<void> {
  printHeader(1, '工作空间初始化向导');

  const name = await question('项目名称', DEFAULT_PROJECT_CONFIG.name);

  console.log('');
  console.log('IDE 选择:');
  console.log(chalk.dim('  1. claude-code (默认)'));
  console.log(chalk.dim('  2. cursor'));
  console.log(chalk.dim('  3. codex'));
  const ideInput = await question('', '1');
  const ideMap: Record<string, ProjectConfig['ide']> = { '1': 'claude-code', '2': 'cursor', '3': 'codex' };
  const ide = ideMap[ideInput] || 'claude-code';

  console.log('');
  console.log('默认 AI 模型:');
  console.log(chalk.dim('  1. sonnet (默认)'));
  console.log(chalk.dim('  2. opus'));
  console.log(chalk.dim('  3. haiku'));
  const modelInput = await question('', '1');
  const modelMap: Record<string, ProjectConfig['defaultModel']> = { '1': 'sonnet', '2': 'opus', '3': 'haiku' };
  const model = modelMap[modelInput] || 'sonnet';

  const portInput = await question('Web 工作台端口', String(DEFAULT_PROJECT_CONFIG.webPort));
  const port = parseInt(portInput, 10) || DEFAULT_PROJECT_CONFIG.webPort;

  const config: ProjectConfig = { name, ide, defaultModel: model, webPort: port };

  console.log('');
  console.log(chalk.bold('确认配置:'));
  console.log(chalk.dim(`  项目名称:  ${config.name}`));
  console.log(chalk.dim(`  IDE:       ${config.ide}`));
  console.log(chalk.dim(`  默认模型:  ${config.defaultModel}`));
  console.log(chalk.dim(`  Web 端口:  ${config.webPort}`));
  console.log('');

  const confirm = await question('确认创建? (Y/n)', 'y');
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

async function stage2Repos(question: QuestionFn, targetPath: string): Promise<string[]> {
  printHeader(2, '仓库导入');

  const repos: string[] = [];
  const reposDir = join(targetPath, 'repos');
  const GIT_URL_RE = /^(https?:\/\/|git@)[^\s]+\.git$/;

  while (true) {
    const url = await question('仓库 URL (或按 Enter 跳过)', '');
    if (!url) break;

    const isValidUrl = GIT_URL_RE.test(url) || existsSync(url);
    if (!isValidUrl) {
      console.log(chalk.red(`  无效的 URL: ${url}`));
      console.log(chalk.dim('  格式示例: "https://github.com/org/repo.git"'));
      continue;
    }

    const defaultName = url.split('/').pop()?.replace('.git', '') || 'repo';
    const name = await question('子目录名称', defaultName);

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

    const more = await question('\n还要添加更多仓库吗? (y/N)', 'n');
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

async function stage3Knowledge(question: QuestionFn, targetPath: string, repos: string[]): Promise<void> {
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

    const choice = await question('要为哪个仓库生成知识库?', String(repos.length + 2));
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
    const knowledgeDir = join(targetPath, config.knowledge.dir);
    let existingIndex;
    try {
      existingIndex = loadIndex(knowledgeDir);
    } catch {
      existingIndex = { entries: [] };
    }

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

  let finalKnowledgeCount = 0;
  try {
    const knowledgeDir = join(targetPath, config.knowledge.dir);
    const index = loadIndex(knowledgeDir);
    finalKnowledgeCount = index.entries.length;
  } catch {
    // ignore
  }
  console.log(chalk.bold(`  知识库:   ${finalKnowledgeCount} 条 (knowledge/)`));

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

function printPersonalHeader(): void {
  console.log('');
  console.log(chalk.bold('━━━━ '.repeat(9)));
  console.log(chalk.bold('  个人信息'));
  console.log(chalk.bold('━━━━ '.repeat(9)));
  console.log('');
}

async function collectPersonalInfo(question: QuestionFn): Promise<UserConfig> {
  printPersonalHeader();

  let name = await question('你的姓名', '');
  while (!name) {
    console.log(chalk.yellow('  姓名不能为空'));
    const retry = await question('你的姓名', '');
    if (retry) name = retry;
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
