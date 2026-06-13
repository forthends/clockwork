import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { loadTask, loadRecoverySnapshot, updateTaskStatus } from '../workspace.js';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { stringify as stringifyYaml } from 'yaml';
import chalk from 'chalk';

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function resumeCommand(): Command {
  return new Command('resume')
    .description('Resume a paused, failed, or interrupted task')
    .argument('<task-id>', 'Task ID to resume')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .option('--retry', 'Retry a timed-out stage')
    .option('--skip', 'Skip a timed-out stage')
    .option('--terminate', 'Terminate a timed-out task')
    .action((taskId: string, options: { project: string; retry?: boolean; skip?: boolean; terminate?: boolean }) => {
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

      const currentMeta = task.stageMeta?.[task.currentStage];
      if (currentMeta && task.stages[task.currentStage] === 'in_progress') {
        const startedAt = new Date(currentMeta.startedAt).getTime();
        const timeoutMs = currentMeta.timeoutMs || 600000;
        if (startedAt && Date.now() - startedAt > timeoutMs) {
          const ago = formatDuration(Date.now() - startedAt);
          const limit = formatDuration(timeoutMs);
          console.log(chalk.yellow(`  Stage '${task.currentStage}' has timed out (${ago} ago, timeout ${limit}).`));

          if (options.retry) {
            task.stages[task.currentStage] = 'pending';
            if (task.stageMeta?.[task.currentStage]) {
              task.stageMeta[task.currentStage].startedAt = '';
            }
            console.log(chalk.green('  Action: Retry — stage reset to pending'));
          } else if (options.skip) {
            task.stages[task.currentStage] = 'completed';
            console.log(chalk.green('  Action: Skip — stage marked as completed'));
          } else if (options.terminate) {
            task.status = 'failed';
            writeFileSync(join(wsDir, taskId, 'status.yaml'), stringifyYaml(task));
            console.log(chalk.red('  Action: Terminate — task marked as failed'));
            return;
          } else {
            console.log(chalk.bold('  Choose an action:'));
            console.log(chalk.dim('    --retry      Reset stage and try again'));
            console.log(chalk.dim('    --skip       Mark stage complete and continue'));
            console.log(chalk.dim('    --terminate  Mark task as failed'));
            console.log('');
            console.log(chalk.bold(`  Example: clockwork resume ${taskId} --retry`));
            return;
          }
          writeFileSync(join(wsDir, taskId, 'status.yaml'), stringifyYaml(task));
        }
      }

      if (task.status === 'interrupted') {
        const snapshot = loadRecoverySnapshot(wsDir, taskId);
        if (snapshot) {
          console.log(chalk.dim(`  Recovery: Last stage was '${snapshot.lastStage}', snapshot found`));
        }
        updateTaskStatus(wsDir, taskId, 'in_progress', task.currentStage);
        console.log(chalk.green('  Task restored to in_progress.'));
      }

      if (task.status === 'failed') {
        const failedMeta = task.stageMeta?.[task.currentStage];
        if (failedMeta) {
          const maxRetries = failedMeta.maxRetries || 3;
          const retryCount = failedMeta.retryCount || 0;
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
