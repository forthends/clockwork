import { Command } from 'commander';
import { join } from 'path';
import { loadConfig } from '../config.js';
import { buildIndex, saveIndex } from '../knowledge-indexer.js';
import chalk from 'chalk';

export function knowledgeCommand(): Command {
  const cmd = new Command('knowledge').description('Manage knowledge base');

  cmd.command('update')
    .description('Rebuild knowledge index from knowledge/ directory')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { project: string }) => {
      const config = loadConfig(options.project);
      const knowledgeDir = join(options.project, config.knowledge.dir);
      const index = buildIndex(knowledgeDir);
      saveIndex(knowledgeDir, index);
      console.log(chalk.green(`✓ Knowledge index updated — ${index.entries.length} entries`));
    });

  return cmd;
}
