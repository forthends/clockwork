import { Command } from 'commander';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { loadConfig } from '../config.js';
import { buildIndex, saveIndex, loadIndex } from '../knowledge-indexer.js';
import { KnowledgeIndex } from '../types.js';
import chalk from 'chalk';

const VALID_CATEGORIES = ['architecture', 'business', 'design-system', 'decisions'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: string): value is Category {
  return VALID_CATEGORIES.includes(value as Category);
}

export function knowledgeCommand(): Command {
  const cmd = new Command('knowledge').description('Manage knowledge base');

  cmd
    .command('update')
    .description('Rebuild knowledge index from knowledge/ directory')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { project: string }) => {
      const config = loadConfig(options.project);
      const knowledgeDir = join(options.project, config.knowledge.dir);
      const index = buildIndex(knowledgeDir);
      saveIndex(knowledgeDir, index);
      console.log(chalk.green(`✓ Knowledge index updated — ${index.entries.length} entries`));
    });

  cmd
    .command('generate')
    .description('Generate knowledge entries by analyzing a code repository')
    .requiredOption('--repo <name>', 'Repository name under repos/')
    .option('--category <cat>', 'Category: architecture | business | design-system | decisions')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { repo: string; category?: string; project: string }) => {
      if (options.category && !isValidCategory(options.category)) {
        console.error(chalk.red(`Error: Invalid category "${options.category}".`));
        console.error(chalk.dim(`  Valid categories: ${VALID_CATEGORIES.join(', ')}`));
        process.exit(1);
      }

      const config = loadConfig(options.project);
      const repoPath = join(options.project, config.repos.dir, options.repo);

      if (!existsSync(repoPath)) {
        console.error(chalk.red(`Error: Repository "${options.repo}" not found at ${repoPath}`));
        console.error(chalk.dim('  Available repos:'));
        const reposDir = join(options.project, config.repos.dir);
        if (existsSync(reposDir)) {
          for (const entry of readdirSync(reposDir, { withFileTypes: true })) {
            if (entry.isDirectory() && entry.name !== '.git') {
              console.error(chalk.dim(`    - ${entry.name}`));
            }
          }
        }
        process.exit(1);
      }

      // Collect repo metadata
      const pkgJsonPath = join(repoPath, 'package.json');
      let pkgJson: Record<string, unknown> | null = null;

      if (existsSync(pkgJsonPath)) {
        try {
          pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
        } catch {
          // package.json exists but is invalid — ignore
        }
      }

      // Gather directory tree (first 2 levels, excluding noise dirs)
      function tree(dir: string, depth: number): string[] {
        if (depth > 2) return [];
        const lines: string[] = [];
        if (!existsSync(dir)) return lines;
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (['node_modules', '.git', 'dist', '.next', 'coverage'].includes(entry.name)) continue;
          const prefix = '  '.repeat(depth);
          if (entry.isDirectory()) {
            lines.push(`${prefix}${entry.name}/`);
            lines.push(...tree(join(dir, entry.name), depth + 1));
          } else {
            lines.push(`${prefix}${entry.name}`);
          }
        }
        return lines;
      }
      const dirTree = tree(repoPath, 0);

      // Load existing knowledge index
      const knowledgeDir = join(options.project, config.knowledge.dir);
      let existingIndex: KnowledgeIndex;
      try {
        existingIndex = loadIndex(knowledgeDir);
      } catch {
        existingIndex = { entries: [] };
      }

      const categories = options.category ? [options.category] : [...VALID_CATEGORIES];

      console.log(chalk.green('✓ Knowledge generation context prepared'));
      console.log(chalk.bold(`  Agent:    `) + 'knowledge-keeper');
      console.log(chalk.bold(`  Repo:     `) + options.repo);
      if (pkgJson) {
        const depCount = Object.keys((pkgJson.dependencies as object) || {}).length;
        console.log(chalk.bold(`  Tech:     `) + `${pkgJson.name || 'unknown'} (deps: ${depCount})`);
      }
      console.log(chalk.bold(`  Category: `) + categories.join(' → '));
      console.log(chalk.bold(`  Existing: `) + `${existingIndex.entries.length} knowledge entries`);
      console.log('');
      console.log(chalk.dim('  Repo structure:'));
      for (const line of dirTree.slice(0, 20)) {
        console.log(chalk.dim(`    ${line}`));
      }
      if (dirTree.length > 20) {
        console.log(chalk.dim(`    ... (${dirTree.length - 20} more lines)`));
      }
      console.log('');
      console.log('Next: Start Claude Code and use the knowledge-keeper skill:');
      console.log(chalk.bold('  Skill:  ') + 'knowledge-keeper');
      console.log(chalk.bold('  Input:  ') + `repo_path=repos/${options.repo}, category=${options.category || 'all'}`);
    });

  return cmd;
}
