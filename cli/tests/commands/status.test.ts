import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { stringify as stringifyYaml } from 'yaml';

const CLI = 'npx tsx src/index.ts';

describe('clockwork status', () => {
  const testDir = join(tmpdir(), 'clockwork-status-test-' + Date.now());

  beforeAll(() => {
    execSync(`cd ${__dirname}/../.. && ${CLI} init ${testDir}`, { encoding: 'utf8' });
    mkdirSync(join(testDir, 'workspace', 'task-001-test'), { recursive: true });
    writeFileSync(
      join(testDir, 'workspace', 'task-001-test', 'status.yaml'),
      stringifyYaml({
        taskId: 'task-001-test',
        workflow: 'feature-dev',
        status: 'in_progress',
        currentStage: 'implement',
        stages: { plan: 'completed', implement: 'in_progress', review: 'pending', deliver: 'pending' },
        created: '2026-06-13T10:00:00Z',
        updated: '2026-06-13T11:30:00Z',
        repos: ['backend'],
        humanReviewPending: false,
      }),
    );
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('shows all tasks', () => {
    const output = execSync(`cd ${__dirname}/../.. && ${CLI} status --project ${testDir}`, { encoding: 'utf8' });
    expect(output).toContain('task-001-test');
    expect(output).toContain('feature-dev');
    expect(output).toContain('in_progress');
  });

  it('shows single task detail', () => {
    const output = execSync(`cd ${__dirname}/../.. && ${CLI} status task-001-test --project ${testDir}`, {
      encoding: 'utf8',
    });
    expect(output).toContain('plan: completed');
    expect(output).toContain('implement: in_progress');
    expect(output).toContain('backend');
  });
});
