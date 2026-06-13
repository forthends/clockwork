import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = 'npx tsx src/index.ts';

function runCli(cmd: string, cwd: string): string {
  return execSync(`cd ${join(__dirname, '..', '..')} && ${CLI} ${cmd}`, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000,
  });
}

describe('workflow integration: init → start → status → review', () => {
  let dir: string;
  const projectRoot = join(__dirname, '..', '..', '..');

  beforeAll(() => {
    dir = join(tmpdir(), 'cw-integration-' + Date.now());
    mkdirSync(dir, { recursive: true });

    // 1. init
    execSync(`cd ${join(__dirname, '..', '..')} && ${CLI} init ${dir}`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    expect(existsSync(join(dir, '.clockwork', 'config.yaml'))).toBe(true);

    // 2. Copy workflows, agents, and knowledge so commands can find them
    execSync(`cp ${join(projectRoot, 'workflows', '*.md')} ${join(dir, 'workflows/')}`, {
      stdio: 'pipe',
    });
    execSync(`cp ${join(projectRoot, 'agents', '*.md')} ${join(dir, 'agents/')}`, {
      stdio: 'pipe',
    });
    execSync(`cp -r ${join(projectRoot, 'knowledge', '*')} ${join(dir, 'knowledge/')}`, {
      stdio: 'pipe',
    });
  });

  afterAll(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  });

  it('runs feature-dev workflow state transitions', () => {
    // 2. start
    const startOut = runCli(
      `start feature-dev --slug test-feature --repo test-repo --project ${dir} --requirements "Add a health check endpoint"`,
      dir
    );
    expect(startOut).toContain('Task created');

    // Extract task ID
    const taskMatch = startOut.match(/task-\d{3}-test-feature/);
    expect(taskMatch).not.toBeNull();
    const taskId = taskMatch![0];

    // 3. status (list)
    const statusOut = runCli(`status --project ${dir}`, dir);
    expect(statusOut).toContain(taskId);

    // status (detail)
    const detailOut = runCli(`status ${taskId} --project ${dir}`, dir);
    expect(detailOut).toContain(taskId);
    expect(detailOut).toContain('feature-dev');
    expect(detailOut).toContain('plan');

    // 4. review --approve
    const approveOut = runCli(`review ${taskId} --approve --project ${dir}`, dir);
    expect(approveOut).toContain('approved');

    const statusAfterApprove = runCli(`status ${taskId} --project ${dir}`, dir);
    expect(statusAfterApprove).not.toContain('human review pending');

    // 5. verify workspace structure
    const wsDir = join(dir, 'workspace', taskId);
    expect(existsSync(join(wsDir, 'status.yaml'))).toBe(true);
    expect(existsSync(join(wsDir, 'agent-context'))).toBe(true);
  });

  it('review --reject marks stage as failed', () => {
    const startOut = runCli(
      `start feature-dev --slug rejected-feature --repo test-repo --project ${dir} --requirements "Test rejection"`,
      dir
    );
    const taskMatch = startOut.match(/task-\d{3}-rejected-feature/);
    expect(taskMatch).not.toBeNull();
    const taskId = taskMatch![0];

    const rejectOut = runCli(
      `review ${taskId} --reject "Incomplete requirements" --project ${dir}`,
      dir
    );
    expect(rejectOut).toContain('rejected');

    const statusOut = runCli(`status ${taskId} --project ${dir}`, dir);
    expect(statusOut).toContain('failed');
  });
});
