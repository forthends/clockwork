import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '../config.js';
import { createTask, updateTaskStatus } from '../workspace.js';
import { buildAgentContext, saveContextPackage } from '../context-builder.js';
import { parseFrontmatter } from '../frontmatter.js';
import { WorkflowFrontmatter } from '../types.js';
import chalk from 'chalk';

export function startCommand(): Command {
  return new Command('start')
    .description('Start a new task with a workflow')
    .argument('<workflow>', 'Workflow name (feature-dev, bug-fix, incident-response)')
    .requiredOption('--slug <slug>', 'Short task slug (e.g., user-login)')
    .option('--repo <repos...>', 'Associated repositories', [])
    .option('--requirements <text>', 'Task requirements (or read from stdin)')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action(
      async (workflow: string, options: { slug: string; repo: string[]; requirements?: string; project: string }) => {
        const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
        if (!SLUG_RE.test(options.slug)) {
          console.error(chalk.red(`Error: Invalid slug "${options.slug}".`));
          console.error(chalk.dim('  Slugs must be lowercase alphanumeric with optional hyphens.'));
          console.error(chalk.dim('  Examples: "user-login", "fix-auth-bug-42", "v2"'));
          process.exit(1);
        }

        const config = loadConfig(options.project);
        const workflowPath = join(options.project, config.workflows.dir, `${workflow}.md`);

        if (!existsSync(workflowPath)) {
          console.error(chalk.red(`Workflow not found: ${workflow}`));
          console.error(chalk.dim(`Available workflows are in ${config.workflows.dir}/`));
          process.exit(1);
        }

        const { frontmatter: wf } = parseFrontmatter<WorkflowFrontmatter>(workflowPath);

        let requirements = options.requirements || '';
        if (!requirements && !process.stdin.isTTY) {
          requirements = await readStdin();
        }

        const wsDir = join(options.project, config.workspace.dir);
        const task = createTask(wsDir, workflow, options.slug, options.repo);
        updateTaskStatus(wsDir, task.taskId, 'pending', wf.stages[0].id);

        const firstStage = wf.stages[0];
        if (firstStage.agent !== 'none') {
          const ctx = await buildAgentContext(options.project, firstStage.agent, {
            requirements: requirements || `Workflow: ${workflow}\nSlug: ${options.slug}`,
          });
          saveContextPackage(wsDir, task.taskId, ctx);
        }

        const stageNames = wf.stages.map((s) => s.id).join(' → ');

        console.log(chalk.green(`✓ Task created: ${task.taskId}`));
        console.log(chalk.dim(`  Workflow: ${workflow}`));
        console.log(chalk.dim(`  Stages:   ${stageNames}`));
        if (firstStage.agent !== 'none') {
          console.log(chalk.dim(`  Next:     ${firstStage.id} (${firstStage.agent}) — ${firstStage.description}`));
        }
        console.log(chalk.dim(`  Workspace: ${wsDir}/${task.taskId}`));

        if (firstStage.humanReview === 'required') {
          console.log(chalk.yellow(`  ⚠ Human review required after '${firstStage.id}' stage`));
        }

        console.log('');
        console.log(chalk.bold('Next: Start Claude Code in this directory and run:'));
        console.log(chalk.cyan(`  Use the workflow-runner skill to execute task: ${task.taskId}`));
      },
    );
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}
