import { Command } from 'commander';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter } from '../frontmatter.js';
import chalk from 'chalk';

export function skillCommand(): Command {
  const cmd = new Command('skill').description('Manage skills');

  cmd
    .command('list')
    .description('List all available skills')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { project: string }) => {
      const skillsDir = join(options.project, 'skills');

      if (!existsSync(skillsDir)) {
        console.log(chalk.dim('No skills directory found'));
        return;
      }

      const entries = readdirSync(skillsDir, { withFileTypes: true });
      let count = 0;
      console.log(chalk.bold('Available skills:'));
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillPath = join(skillsDir, entry.name, 'SKILL.md');
        if (!existsSync(skillPath)) continue;
        try {
          const { frontmatter } = parseFrontmatter<{ name: string; description: string }>(skillPath);
          const name = frontmatter.name.padEnd(22);
          console.log(`  ${chalk.bold(name)} ${chalk.dim(frontmatter.description.slice(0, 80))}`);
          count++;
        } catch {
          const name = entry.name.padEnd(22);
          console.log(`  ${chalk.dim(name)} (no valid SKILL.md)`);
        }
      }
      console.log('');
      console.log(chalk.dim(`${count} skills loaded from skills/`));
    });

  return cmd;
}
