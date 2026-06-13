import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = 'npx tsx src/index.ts';

describe('clockwork onboard', () => {
  const testDir = join(tmpdir(), 'clockwork-onboard-test-' + Date.now());

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates a project with default answers', () => {
    // Pipe Enter for all prompts (accept defaults, confirm creation), then personal info
    const input = '\n\n\n\ny\n\nTest\n\n\ny\n';
    const output = execSync(`cd ${__dirname}/../.. && printf '${input}' | ${CLI} onboard ${testDir}`, {
      encoding: 'utf8',
      timeout: 15000,
    });

    expect(output).toContain('项目已创建');
    expect(output).toContain('Clockwork 工作空间初始化完成');
    expect(existsSync(join(testDir, '.clockwork', 'config.yaml'))).toBe(true);
    expect(existsSync(join(testDir, 'agents'))).toBe(true);
    expect(existsSync(join(testDir, 'skills'))).toBe(true);
    expect(existsSync(join(testDir, 'knowledge'))).toBe(true);
    expect(existsSync(join(testDir, 'workflows'))).toBe(true);
    expect(existsSync(join(testDir, 'repos'))).toBe(true);

    // Verify config has default values
    const config = readFileSync(join(testDir, '.clockwork', 'config.yaml'), 'utf8');
    expect(config).toContain('claude-code');
    expect(config).toContain('sonnet');
    expect(config).toContain('4200');
  }, 20000);

  it('creates a project with custom config', () => {
    const customDir = join(tmpdir(), 'clockwork-onboard-custom-' + Date.now());
    try {
      // Project name: custom-proj, IDE: 2 (cursor), model: 2 (opus), port: 4300, then personal info
      const input = 'custom-proj\n2\n2\n4300\ny\n\nTest\n\n\ny\n';
      execSync(`cd ${__dirname}/../.. && printf '${input}' | ${CLI} onboard ${customDir}`, {
        encoding: 'utf8',
        timeout: 15000,
      });

      const config = readFileSync(join(customDir, '.clockwork', 'config.yaml'), 'utf8');
      expect(config).toContain('custom-proj');
      expect(config).toContain('cursor');
      expect(config).toContain('opus');
      expect(config).toContain('4300');
    } finally {
      rmSync(customDir, { recursive: true, force: true });
    }
  }, 20000);

  it('skips repo import when Enter is pressed', () => {
    const skipDir = join(tmpdir(), 'clockwork-onboard-skip-' + Date.now());
    try {
      // Accept defaults, skip repo, skip knowledge, then personal info
      const input = '\n\n\n\ny\n\nTest\n\n\ny\n';
      const output = execSync(`cd ${__dirname}/../.. && printf '${input}' | ${CLI} onboard ${skipDir}`, {
        encoding: 'utf8',
        timeout: 15000,
      });
      expect(output).toContain('跳过仓库导入');
      expect(output).toContain('无仓库，跳过知识库生成');
    } finally {
      rmSync(skipDir, { recursive: true, force: true });
    }
  }, 20000);
});
