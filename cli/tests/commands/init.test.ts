import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = 'npx tsx src/index.ts';

describe('clockwork init', () => {
  const testDir = join(tmpdir(), 'clockwork-init-test-' + Date.now());

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates project skeleton', () => {
    const output = execSync(`cd ${__dirname}/../.. && ${CLI} init ${testDir}`, { encoding: 'utf8' });
    expect(existsSync(join(testDir, '.clockwork', 'config.yaml'))).toBe(true);
    expect(existsSync(join(testDir, 'agents'))).toBe(true);
    expect(existsSync(join(testDir, 'skills'))).toBe(true);
    expect(existsSync(join(testDir, 'knowledge'))).toBe(true);
    expect(existsSync(join(testDir, 'workflows'))).toBe(true);
    expect(existsSync(join(testDir, 'repos'))).toBe(true);
    expect(existsSync(join(testDir, 'workspace'))).toBe(true);
    expect(output).toContain('Clockwork project initialized');
  });
});
