import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = 'npx tsx src/index.ts';

describe('clockwork start', () => {
  const testDir = join(tmpdir(), 'clockwork-start-test-' + Date.now());

  beforeAll(() => {
    execSync(`cd ${__dirname}/../.. && ${CLI} init ${testDir}`, { encoding: 'utf8' });
    // Copy workflows and agents so the start command can find them
    execSync(`cp -r ${join(__dirname, '..', '..', '..', 'workflows')} ${testDir}/`);
    execSync(`cp -r ${join(__dirname, '..', '..', '..', 'agents')} ${testDir}/`);
    execSync(`cp -r ${join(__dirname, '..', '..', '..', 'knowledge')} ${testDir}/`);
  });

  afterAll(() => { rmSync(testDir, { recursive: true, force: true }); });

  it('creates a new task workspace for feature-dev', () => {
    const output = execSync(
      `cd ${__dirname}/../.. && echo "Add user login" | ${CLI} start feature-dev --project ${testDir} --slug user-login --repo backend`,
      { encoding: 'utf8' }
    );
    expect(output).toContain('Task created:');
    expect(output).toContain('user-login');
    expect(output).toContain('feature-dev');

    const wsDir = join(testDir, 'workspace');
    const dirs = readdirSync(wsDir);
    const taskDir = dirs.find((d: string) => d.includes('user-login'));
    expect(taskDir).toBeDefined();

    const statusPath = join(wsDir, taskDir!, 'status.yaml');
    expect(existsSync(statusPath)).toBe(true);
    const status = readFileSync(statusPath, 'utf8');
    expect(status).toContain('feature-dev');
    expect(status).toContain('backend');
    expect(status).toContain('user-login');
  });
});
