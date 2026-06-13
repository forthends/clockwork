import { Command } from 'commander';
import { mkdirSync, writeFileSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { stringify as stringifyYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_CONFIG = {
  project: { name: 'clockwork-project' },
  ide: { primary: 'claude-code' },
  agents: { dir: 'agents/', defaultModel: 'sonnet' },
  knowledge: { dir: 'knowledge/', index: 'knowledge/index.yaml', maxEntriesPerQuery: 5 },
  workflows: { dir: 'workflows/' },
  repos: { dir: 'repos/' },
  workspace: { dir: 'workspace/' },
  web: { port: 4200, host: 'localhost' },
};

function findTemplatesDir(): string | null {
  // When compiled: dist/commands/init.js → dist/templates/
  const distTemplates = join(__dirname, '..', 'templates');
  if (existsSync(distTemplates)) return distTemplates;

  // When running via tsx: src/commands/init.ts → ../../templates/
  const srcTemplates = join(__dirname, '..', '..', 'templates');
  if (existsSync(srcTemplates)) return srcTemplates;

  return null;
}

export function initCommand(): Command {
  return new Command('init')
    .description('Initialize a new Clockwork project')
    .argument('[path]', 'Project path', process.cwd())
    .action((targetPath: string) => {
      const dirs = [
        '.clockwork',
        'agents',
        'skills',
        'knowledge/architecture',
        'knowledge/business',
        'knowledge/design-system',
        'knowledge/decisions',
        'workflows',
        'repos',
        'workspace',
      ];

      for (const dir of dirs) {
        mkdirSync(join(targetPath, dir), { recursive: true });
      }

      const configPath = join(targetPath, '.clockwork', 'config.yaml');
      writeFileSync(configPath, stringifyYaml(DEFAULT_CONFIG));

      // Copy built-in templates
      const templatesDir = findTemplatesDir();
      if (templatesDir) {
        const copyDir = (name: string) => {
          const src = join(templatesDir, name);
          const dest = join(targetPath, name);
          if (existsSync(src)) {
            cpSync(src, dest, { recursive: true });
          }
        };
        copyDir('workflows');
        copyDir('agents');
        copyDir('skills');
        copyDir('knowledge');

        // Set up Claude Code skills discovery
        const ccSkillsDir = join(targetPath, '.claude', 'skills');
        const projectSkillsDir = join(targetPath, 'skills');
        if (existsSync(projectSkillsDir)) {
          mkdirSync(ccSkillsDir, { recursive: true });
          cpSync(projectSkillsDir, ccSkillsDir, { recursive: true });
        }

        console.log(chalk.dim('  Copied built-in workflows, agents, skills, and knowledge'));
        console.log(chalk.dim('  Set up .claude/skills/ for Claude Code discovery'));
      } else {
        console.log(chalk.yellow('  Warning: Built-in templates not found. Add workflows/agents/skills manually.'));
      }

      console.log(chalk.green('✓ Clockwork project initialized at'), targetPath);
      console.log(chalk.dim('  Created .clockwork/config.yaml'));
      console.log(chalk.dim('  Created agents/, skills/, knowledge/, workflows/, repos/, workspace/, .claude/skills/'));
    });
}
