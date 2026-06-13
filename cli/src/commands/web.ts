import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { startServer } from '../server.js';

export function webCommand(): Command {
  return new Command('web')
    .description('Start the Clockwork web workbench')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { project: string }) => {
      const workbenchDist = join(options.project, 'workbench', 'dist');
      if (!existsSync(workbenchDist)) {
        console.log('Workbench not built. Building now...');
        execSync('npm run build -w workbench', { cwd: options.project, stdio: 'inherit' });
      }
      startServer(options.project);
    });
}
