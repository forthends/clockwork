import { Command } from 'commander';
import { startServer } from '../server.js';

export function webCommand(): Command {
  return new Command('web')
    .description('Start the Clockwork web workbench')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { project: string }) => {
      startServer(options.project);
    });
}
