import { Command } from 'commander';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { stringify as stringifyYaml } from 'yaml';

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

      console.log(chalk.green('✓ Clockwork project initialized at'), targetPath);
      console.log(chalk.dim('  Created .clockwork/config.yaml'));
      console.log(chalk.dim('  Created agents/, skills/, knowledge/, workflows/, repos/, workspace/'));
    });
}
