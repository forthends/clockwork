import { Command } from 'commander';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { startServer } from '../server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findWorkbenchDist(): string | null {
  // Running from source: cli/src/commands/web.ts → ../../../workbench/dist
  const srcPath = join(__dirname, '..', '..', '..', 'workbench', 'dist');
  if (existsSync(srcPath)) return srcPath;
  // Running compiled: cli/dist/commands/web.js → ../../../workbench/dist
  const distPath = join(__dirname, '..', '..', '..', 'workbench', 'dist');
  if (existsSync(distPath)) return distPath;
  return null;
}

function findMonorepoRoot(): string | null {
  // cli/src/commands → ../../.. → monorepo root
  const srcRoot = join(__dirname, '..', '..', '..');
  if (existsSync(join(srcRoot, 'pnpm-workspace.yaml')) || existsSync(join(srcRoot, 'package.json'))) return srcRoot;
  // cli/dist/commands → ../../.. → monorepo root
  const distRoot = join(__dirname, '..', '..', '..');
  if (existsSync(join(distRoot, 'pnpm-workspace.yaml')) || existsSync(join(distRoot, 'package.json'))) return distRoot;
  return null;
}

export function webCommand(): Command {
  return new Command('web')
    .description('Start the Clockwork web workbench')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action((options: { project: string }) => {
      let workbenchDist = findWorkbenchDist();

      if (!workbenchDist) {
        // Not found alongside CLI — try building from monorepo root
        const monorepoRoot = findMonorepoRoot();
        if (!monorepoRoot) {
          console.error('Could not locate workbench. Make sure Clockwork is installed correctly.');
          process.exit(1);
        }
        console.log('Workbench not built. Building now...');
        try {
          execSync('pnpm -r build', { cwd: monorepoRoot, stdio: 'inherit' });
          workbenchDist = findWorkbenchDist();
          if (!workbenchDist) {
            console.error('Workbench build completed but dist not found.');
            process.exit(1);
          }
        } catch {
          console.error('Workbench build failed. Run `pnpm build` in the Clockwork monorepo first.');
          process.exit(1);
        }
      }

      startServer(options.project, workbenchDist);
    });
}
