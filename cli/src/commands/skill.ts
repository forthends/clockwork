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
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillPath = join(skillsDir, entry.name, 'SKILL.md');
        if (!existsSync(skillPath)) continue;
        try {
          const { frontmatter } = parseFrontmatter<{ name: string; description: string }>(skillPath);
          console.log(`${chalk.bold(frontmatter.name)}  ${chalk.dim(frontmatter.description.slice(0, 80))}`);
        } catch {
          console.log(`${chalk.dim(entry.name)}  (no valid SKILL.md)`);
        }
      }
    });

  return cmd;
}
