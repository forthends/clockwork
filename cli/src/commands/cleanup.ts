import { Command } from 'commander';
import { join } from 'path';
import { existsSync, readdirSync, rmSync } from 'fs';
import { loadConfig } from '../config.js';
import { cleanupLocks, isLockExpired } from '../lock.js';
import { buildIndex, saveIndex } from '../knowledge-indexer.js';
import chalk from 'chalk';

export function findOrphanTasks(workspaceDir: string): string[] {
  if (!existsSync(workspaceDir)) return [];
  return readdirSync(workspaceDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('task-'))
    .filter((e) => !existsSync(join(workspaceDir, e.name, 'status.yaml')))
    .map((e) => e.name);
}

export function cleanupCommand(): Command {
  const cmd = new Command('cleanup').description('Clean up expired locks, orphan tasks, and stale data');

  return cmd
    .option('--lock', 'Clean expired lock files only')
    .option('--orphans', 'Remove orphan task directories')
    .option('--rebuild-index', 'Rebuild knowledge index')
    .option('--all', 'Run all cleanup actions')
    .option('-p, --project <path>', 'Project path', process.cwd())
    .action(
      (options: { lock?: boolean; orphans?: boolean; rebuildIndex?: boolean; all?: boolean; project: string }) => {
        const config = loadConfig(options.project);
        const ttlMs = (config.cli?.lockTTLMinutes ?? 30) * 60 * 1000;
        const doLock = options.lock || options.all;
        const doOrphans = options.orphans || options.all;
        const doIndex = options.rebuildIndex || options.all;
        const isSummary = !options.lock && !options.orphans && !options.rebuildIndex;

        if (isSummary) {
          const lockDir = join(options.project, '.locks');
          let expiredCount = 0;
          if (existsSync(lockDir)) {
            for (const f of readdirSync(lockDir)) {
              if (f.endsWith('.lock') && isLockExpired(options.project, f.replace('.lock', ''), ttlMs)) {
                expiredCount++;
              }
            }
          }
          const wsDir = join(options.project, config.workspace.dir);
          const orphans = findOrphanTasks(wsDir);

          console.log(chalk.bold('Clockwork Cleanup'));
          console.log('');
          console.log(chalk.dim(`  Locks (${expiredCount} expired):`));
          if (expiredCount > 0) {
            console.log(chalk.dim(`    Run with --lock to clean ${expiredCount} expired lock(s)`));
          } else {
            console.log(chalk.dim('    No expired locks'));
          }
          console.log('');
          console.log(chalk.dim(`  Orphans (${orphans.length}):`));
          orphans.forEach((o) => console.log(chalk.dim(`    ${o}/ (no status.yaml)`)));
          if (orphans.length === 0) console.log(chalk.dim('    No orphan tasks'));
          if (orphans.length > 0)
            console.log(chalk.dim(`    Run with --orphans to remove ${orphans.length} orphan(s)`));
          console.log('');
          console.log(chalk.dim('  Use --lock, --orphans, --rebuild-index, or --all to execute cleanup.'));
          return;
        }

        console.log(chalk.bold('Clockwork Cleanup'));
        console.log('');
        let totalCleaned = 0;

        if (doLock) {
          console.log(chalk.dim('  Locks:'));
          const count = cleanupLocks(options.project, ttlMs);
          console.log(chalk.green(`    ✓ ${count} expired lock(s) cleaned`));
          totalCleaned += count;
          if (count === 0) console.log(chalk.dim('    No expired locks'));
        }

        if (doOrphans) {
          console.log(chalk.dim('  Orphans:'));
          const wsDir = join(options.project, config.workspace.dir);
          const orphans = findOrphanTasks(wsDir);
          orphans.forEach((o) => {
            rmSync(join(wsDir, o), { recursive: true, force: true });
            console.log(chalk.green(`    ✓ ${o}/`));
          });
          totalCleaned += orphans.length;
          if (orphans.length === 0) console.log(chalk.dim('    No orphan tasks'));
        }

        if (doIndex) {
          console.log(chalk.dim('  Knowledge index:'));
          const knowledgeDir = join(options.project, config.knowledge.dir);
          const index = buildIndex(knowledgeDir);
          saveIndex(knowledgeDir, index);
          console.log(chalk.green(`    ✓ Rebuilt: ${index.entries.length} entries`));
          totalCleaned += index.entries.length;
        }

        console.log('');
        console.log(chalk.green(`  Done — ${totalCleaned} items cleaned`));
      },
    );
}
