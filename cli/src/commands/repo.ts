import { Command } from 'commander';
import { execSync } from 'child_process';
import { join } from 'path';
import { loadConfig } from '../config.js';
import chalk from 'chalk';

export function repoCommand(): Command {
  const cmd = new Command('repo').description('Manage code repositories');

  cmd.command('add')
    .description('Add a git repository as a submodule')
    .argument('<url>', 'Repository URL')
    .option('-n, --name <name>', 'Directory name for the submodule')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((url: string, options: { name?: string; project: string }) => {
      const config = loadConfig(options.project);
      const name = options.name || url.split('/').pop()?.replace('.git', '') || 'repo';
      const reposDir = join(options.project, config.repos.dir);

      try {
        execSync(`git submodule add ${url} ${join(reposDir, name)}`, {
          cwd: options.project,
          stdio: 'inherit',
        });
        console.log(chalk.green(`✓ Added repository: ${name}`));
      } catch {
        console.error(chalk.red(`Failed to add repository: ${url}`));
        process.exit(1);
      }
    });

  cmd.command('status')
    .description('Show repository status')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { project: string }) => {
      try {
        execSync('git submodule status', { cwd: options.project, stdio: 'inherit' });
      } catch {
        console.log(chalk.dim('No submodules'));
      }
    });

  return cmd;
}
