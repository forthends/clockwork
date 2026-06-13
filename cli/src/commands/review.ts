import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { loadTask, setHumanReviewPending, markStageFailed } from '../workspace.js';
import { join } from 'path';
import chalk from 'chalk';

export function reviewCommand(): Command {
  return new Command('review')
    .description('Review task artifacts')
    .argument('<task-id>', 'Task ID to review')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .option('--approve', 'Approve the current stage')
    .option('--reject <reason>', 'Reject with reason')
    .action((taskId: string, options: { project: string; approve?: boolean; reject?: string }) => {
      const TASK_ID_RE = /^task-\d{3}-[a-z0-9-]+$/;
      if (!TASK_ID_RE.test(taskId)) {
        console.error(chalk.red(`Error: Invalid task ID "${taskId}".`));
        console.error(chalk.dim('  Task IDs must match the pattern: task-NNN-slug'));
        console.error(chalk.dim('  Example: "task-001-user-login"'));
        process.exit(1);
      }

      if (options.approve && options.reject) {
        console.error(chalk.red('Error: --approve and --reject are mutually exclusive'));
        process.exit(1);
      }

      const config = loadConfig(options.project);
      const wsDir = join(options.project, config.workspace.dir);
      const task = loadTask(wsDir, taskId);

      if (options.approve) {
        setHumanReviewPending(wsDir, taskId, false);
        console.log(chalk.green(`✓ Stage '${task.currentStage}' approved`));
        console.log(chalk.dim('  Run clockwork resume to continue'));
      } else if (options.reject) {
        setHumanReviewPending(wsDir, taskId, true);
        markStageFailed(wsDir, taskId, task.currentStage);
        console.log(chalk.red(`✗ Stage '${task.currentStage}' rejected: ${options.reject}`));
        console.log(chalk.dim('  Fix the issues and re-submit for review'));
      } else {
        console.log(chalk.bold(`Reviewing: ${task.taskId}`));
        console.log(chalk.dim(`  Stage: ${task.currentStage}`));
        console.log(chalk.dim(`  Status: ${task.status}`));
        console.log('');
        console.log(chalk.dim('Use --approve or --reject "<reason>" to act'));
      }
    });
}
