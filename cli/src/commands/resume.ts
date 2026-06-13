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
      console.log(chalk.bold('Next: Start Claude Code in this directory and run:'));
      console.log(chalk.cyan(`  Use the workflow-runner skill to execute task: ${taskId}`));
    });
}
