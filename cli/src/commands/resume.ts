import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { loadTask } from '../workspace.js';
import { join } from 'path';
import chalk from 'chalk';

export function resumeCommand(): Command {
  return new Command('resume')
    .description('Resume a paused or failed task')
    .argument('<task-id>', 'Task ID to resume')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((taskId: string, options: { project: string }) => {
      const config = loadConfig(options.project);
      const wsDir = join(options.project, config.workspace.dir);
      const task = loadTask(wsDir, taskId);

      console.log(chalk.green(`✓ Resuming task: ${task.taskId}`));
      console.log(chalk.dim(`  Workflow: ${task.workflow}`));
      console.log(chalk.dim(`  Current stage: ${task.currentStage}`));
      if (task.humanReviewPending) {
        console.log(chalk.yellow(`  ⚠ Human review is pending — use 'clockwork review ${taskId}' first`));
        return;
      }
      console.log('');
      console.log(chalk.bold('Next: Start Claude Code and run:'));
      console.log(chalk.cyan(`  /clockwork:workflow-runner ${taskId}`));
    });
}
