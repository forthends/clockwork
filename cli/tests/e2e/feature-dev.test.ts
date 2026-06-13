import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parse as parseYaml } from 'yaml';

const CLI_DIR = join(__dirname, '..', '..');
const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const TSX = join(CLI_DIR, 'node_modules', '.bin', 'tsx');
const CLI_SRC = join(CLI_DIR, 'src', 'index.ts');

function cw(cmd: string, cwd: string): string {
  return execSync(`${TSX} ${CLI_SRC} ${cmd}`, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000,
  });
}

function setupProject(): { dir: string; taskId: string } {
  const dir = join(tmpdir(), 'cw-e2e-fd-' + Date.now());
  mkdirSync(dir, { recursive: true });
  cw(`init ${dir}`, dir);
  execSync(`cp ${join(PROJECT_ROOT, 'workflows', '*.md')} ${join(dir, 'workflows/')}`, { stdio: 'pipe' });
  execSync(`cp ${join(PROJECT_ROOT, 'agents', '*.md')} ${join(dir, 'agents/')}`, { stdio: 'pipe' });
  const out = cw(
    `start feature-dev --slug e2e-feature --repo demo-todo --project ${dir} --requirements "Add GET /health endpoint"`,
    dir,
  );
  const match = out.match(/task-\d{3}-e2e-feature/);
  if (!match) throw new Error('Task not created: ' + out);
  return { dir, taskId: match[0] };
}

describe('feature-dev workflow E2E', () => {
  const projects: { dir: string; taskId: string }[] = [];

  afterAll(() => {
    projects.forEach((p) => {
      try {
        rmSync(p.dir, { recursive: true, force: true });
      } catch {}
    });
  });

  it('creates task with correct initial state', () => {
    const { dir, taskId } = setupProject();
    projects.push({ dir, taskId });

    const status = parseYaml(readFileSync(join(dir, 'workspace', taskId, 'status.yaml'), 'utf8'));
    expect(status.workflow).toBe('feature-dev');
    expect(status.status).toBe('pending');
    expect(status.repos).toContain('demo-todo');
    expect(status.currentStage).toBe('plan');
  });

  it('creates agent context for planner', () => {
    const { dir, taskId } = setupProject();
    projects.push({ dir, taskId });

    const ctxPath = join(dir, 'workspace', taskId, 'agent-context', 'planner.json');
    expect(existsSync(ctxPath)).toBe(true);
    const ctx = JSON.parse(readFileSync(ctxPath, 'utf8'));
    expect(ctx.agentName).toBe('planner');
    expect(ctx.skills).toBeDefined();
    expect(ctx.role).toBeDefined();
    expect(ctx.capabilities).toBeDefined();
    expect(ctx.boundaries).toBeDefined();
    expect(ctx.instructions).toBeDefined();
  });

  it('approve clears human review pending, reject marks stage as failed', () => {
    const { dir, taskId } = setupProject();
    projects.push({ dir, taskId });

    // Approve: clears human review pending flag
    const approveOut = cw(`review ${taskId} --approve --project ${dir}`, dir);
    expect(approveOut).toContain('approved');

    let status = parseYaml(readFileSync(join(dir, 'workspace', taskId, 'status.yaml'), 'utf8'));
    expect(status.humanReviewPending).toBe(false);

    // Reject: marks stage as failed
    const rejectOut = cw(`review ${taskId} --reject "Try again" --project ${dir}`, dir);
    expect(rejectOut).toContain('rejected');

    status = parseYaml(readFileSync(join(dir, 'workspace', taskId, 'status.yaml'), 'utf8'));
    expect(status.status).toBe('failed');
    expect(status.stages['plan']).toBe('failed');
    expect(status.humanReviewPending).toBe(true);
  });

  it('maintains workspace directory structure', () => {
    const { dir, taskId } = setupProject();
    projects.push({ dir, taskId });

    const wsDir = join(dir, 'workspace', taskId);
    expect(existsSync(join(wsDir, 'status.yaml'))).toBe(true);
    expect(existsSync(join(wsDir, 'agent-context'))).toBe(true);
    expect(existsSync(join(wsDir, 'logs'))).toBe(true);
  });
});
