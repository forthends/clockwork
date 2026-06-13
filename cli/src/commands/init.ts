import { Command } from 'commander';
import { mkdirSync, writeFileSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { stringify as stringifyYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ProjectConfig {
  name: string;
  ide: 'claude-code' | 'cursor' | 'codex';
  defaultModel: 'sonnet' | 'opus' | 'haiku';
  webPort: number;
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  name: 'my-project',
  ide: 'claude-code',
  defaultModel: 'sonnet',
  webPort: 4200,
};

function findTemplatesDir(): string | null {
  const distTemplates = join(__dirname, '..', 'templates');
  if (existsSync(distTemplates)) return distTemplates;

  const srcTemplates = join(__dirname, '..', '..', 'templates');
  if (existsSync(srcTemplates)) return srcTemplates;

  return null;
}

export function createProject(targetPath: string, projectConfig: ProjectConfig): void {
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

  const config = {
    project: { name: projectConfig.name },
    ide: { primary: projectConfig.ide },
    agents: { dir: 'agents/', defaultModel: projectConfig.defaultModel },
    knowledge: { dir: 'knowledge/', index: 'knowledge/index.yaml', maxEntriesPerQuery: 5 },
    workflows: { dir: 'workflows/' },
    repos: { dir: 'repos/' },
    workspace: { dir: 'workspace/' },
    web: { port: projectConfig.webPort, host: 'localhost' },
  };

  const configPath = join(targetPath, '.clockwork', 'config.yaml');
  writeFileSync(configPath, stringifyYaml(config));

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

    const ccSkillsDir = join(targetPath, '.claude', 'skills');
    const projectSkillsDir = join(targetPath, 'skills');
    if (existsSync(projectSkillsDir)) {
      mkdirSync(ccSkillsDir, { recursive: true });
      cpSync(projectSkillsDir, ccSkillsDir, { recursive: true });
    }
  }
}

export function initCommand(): Command {
  return new Command('init')
    .description('Initialize a new Clockwork project')
    .argument('[path]', 'Project path', process.cwd())
    .action((targetPath: string) => {
      createProject(targetPath, { ...DEFAULT_PROJECT_CONFIG, name: targetPath.split('/').pop() || 'my-project' });

      console.log(chalk.green('✓ Clockwork project initialized at'), targetPath);
      console.log(chalk.dim('  Created .clockwork/config.yaml'));
      console.log(chalk.dim('  Created agents/, skills/, knowledge/, workflows/, repos/, workspace/, .claude/skills/'));
    });
}
