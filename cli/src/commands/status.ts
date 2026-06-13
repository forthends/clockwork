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
      } else {
        const tasks = listTasks(wsDir);
        if (tasks.length === 0) {
          console.log(chalk.dim('No tasks found'));
          return;
        }
        for (const task of tasks) {
          const line = `${colorStatus(task.status)} ${task.taskId}  ${chalk.dim(task.workflow)}  ${task.status}`;
          console.log(line);
        }
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
