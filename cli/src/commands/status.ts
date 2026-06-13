import { Command } from 'commander';
import { join } from 'path';
import { loadConfig } from '../config.js';
import { loadTask, listTasks } from '../workspace.js';
import chalk from 'chalk';

export function statusCommand(): Command {
  return new Command('status')
    .description('Show task status')
    .argument('[task-id]', 'Specific task ID')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((taskId: string | undefined, options: { project: string }) => {
      const config = loadConfig(options.project);
      const wsDir = join(options.project, config.workspace.dir);

      if (taskId) {
        const task = loadTask(wsDir, taskId);
        console.log(chalk.bold(`Task: ${task.taskId}`));
        console.log(`  Workflow: ${task.workflow}`);
        console.log(`  Status:   ${colorStatus(task.status)}`);
        console.log(`  Stage:    ${task.currentStage}`);
        console.log(`  Repos:    ${task.repos.join(', ') || 'none'}`);
        console.log(`  Updated:  ${task.updated}`);
        console.log(chalk.dim('  Stages:'));
        for (const [stage, status] of Object.entries(task.stages)) {
          const icon = status === 'completed' ? '✓' : status === 'in_progress' ? '▶' : '·';
          console.log(`    ${icon} ${stage}: ${status}`);
        }
        if (task.humanReviewPending) {
          console.log(chalk.yellow('  ⚠ Human review pending'));
        }
        const currentMeta = task.stageMeta?.[task.currentStage];
        if (currentMeta && task.stages[task.currentStage] === 'in_progress') {
          const startedAt = new Date(currentMeta.startedAt).getTime();
          const timeoutMs = currentMeta.timeoutMs || 600000;
          if (startedAt && Date.now() - startedAt > timeoutMs) {
            const ago = formatDuration(Date.now() - startedAt);
            const limit = formatDuration(timeoutMs);
            console.log(
              chalk.yellow(`  ⚠ Stage '${task.currentStage}' timed out (started ${ago} ago, timeout ${limit})`),
            );
          }
        }
      } else {
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
        console.log(
          chalk.dim(`${tasks.length} tasks (${inProgress} in progress, ${pending} pending, ${completed} completed)`),
        );
      }
    });
}

function colorStatus(status: string): string {
  switch (status) {
    case 'completed':
      return chalk.green('✓');
    case 'in_progress':
      return chalk.yellow('▶');
    case 'failed':
      return chalk.red('✗');
    default:
      return chalk.dim('·');
  }
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
