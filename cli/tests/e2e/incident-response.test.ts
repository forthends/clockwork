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

function initProject(prefix: string): string {
  const dir = join(tmpdir(), prefix + Date.now());
  mkdirSync(dir, { recursive: true });
  cw(`init ${dir}`, dir);
  execSync(`cp ${join(PROJECT_ROOT, 'workflows', '*.md')} ${join(dir, 'workflows/')}`, { stdio: 'pipe' });
  execSync(`cp ${join(PROJECT_ROOT, 'agents', '*.md')} ${join(dir, 'agents/')}`, { stdio: 'pipe' });
  return dir;
}

describe('incident-response workflow E2E', () => {
  const projects: string[] = [];

  afterAll(() => {
    projects.forEach(d => {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {}
    });
  });

  it('creates task with incident-response workflow and triage stage', () => {
    const dir = initProject('cw-e2e-ir-');
    projects.push(dir);

    const out = cw(
      `start incident-response --slug e2e-incident --repo demo-todo --project ${dir} --requirements "API returning 503"`,
      dir
    );
    const match = out.match(/task-\d{3}-e2e-incident/);
    expect(match).not.toBeNull();
    const taskId = match![0];

    const status = parseYaml(readFileSync(join(dir, 'workspace', taskId, 'status.yaml'), 'utf8'));
    expect(status.workflow).toBe('incident-response');
    expect(status.status).toBe('pending');
    expect(status.currentStage).toBe('triage');
    expect(status.repos).toContain('demo-todo');
  });

  it('creates agent context for debugger (triage stage)', () => {
    const dir = initProject('cw-e2e-ir2-');
    projects.push(dir);

    const out = cw(
      `start incident-response --slug triage-test --repo demo-todo --project ${dir} --requirements "503 error"`,
      dir
    );
    const match = out.match(/task-\d{3}-triage-test/);
    expect(match).not.toBeNull();
    const taskId = match![0];

    const ctxPath = join(dir, 'workspace', taskId, 'agent-context', 'debugger.json');
    expect(existsSync(ctxPath)).toBe(true);
    const ctx = JSON.parse(readFileSync(ctxPath, 'utf8'));
    expect(ctx.agentName).toBe('debugger');
    expect(ctx.role).toBeDefined();
    expect(ctx.skills).toBeDefined();
    expect(ctx.capabilities).toBeDefined();
    expect(ctx.inputs).toBeDefined();
  });

  it('approve clears human review pending for incident', () => {
    const dir = initProject('cw-e2e-ir3-');
    projects.push(dir);

    const out = cw(
      `start incident-response --slug approve-test --repo demo-todo --project ${dir} --requirements "Test approve"`,
      dir
    );
    const match = out.match(/task-\d{3}-approve-test/);
    expect(match).not.toBeNull();
    const taskId = match![0];

    // Initial state: triage stage has no human review requirement
    const statusBefore = parseYaml(readFileSync(join(dir, 'workspace', taskId, 'status.yaml'), 'utf8'));
    expect(statusBefore.currentStage).toBe('triage');

    // Approving should work even for stages without required review
    const approveOut = cw(`review ${taskId} --approve --project ${dir}`, dir);
    expect(approveOut).toContain('approved');

    const status = parseYaml(readFileSync(join(dir, 'workspace', taskId, 'status.yaml'), 'utf8'));
    expect(status.humanReviewPending).toBe(false);
  });

  it('maintains workspace directory structure', () => {
    const dir = initProject('cw-e2e-ir4-');
    projects.push(dir);

    const out = cw(
      `start incident-response --slug struct-test --repo demo-todo --project ${dir} --requirements "Structure test"`,
      dir
    );
    const match = out.match(/task-\d{3}-struct-test/);
    const taskId = match![0];

    const wsDir = join(dir, 'workspace', taskId);
    expect(existsSync(join(wsDir, 'status.yaml'))).toBe(true);
    expect(existsSync(join(wsDir, 'agent-context'))).toBe(true);
    expect(existsSync(join(wsDir, 'logs'))).toBe(true);
    expect(existsSync(join(wsDir, 'agent-context', 'debugger.json'))).toBe(true);
  });
});
