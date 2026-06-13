import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
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

  it('detects existing project and collects personal info (Scenario B)', () => {
    const joinDir = join(tmpdir(), 'clockwork-onboard-join-' + Date.now());
    try {
      // First, create a project with init
      execSync(`cd ${__dirname}/../.. && ${CLI} init ${joinDir}`, { encoding: 'utf8', timeout: 10000 });
      // Also init git so stage4 validation doesn't fail on submodule check
      execSync(`cd ${joinDir} && git init && git add -A && git commit -m "init"`, { encoding: 'utf8', timeout: 10000 });

      // Now run onboard — should detect project and ask for personal info only
      const input = '李四\n1\nlisi@example.com\ny\n';
      const output = execSync(`cd ${__dirname}/../.. && printf '${input}' | ${CLI} onboard ${joinDir}`, {
        encoding: 'utf8',
        timeout: 15000,
      });
      expect(output).toContain('已检测到 Clockwork 项目');
      expect(output).toContain('个人信息已保存');

      // Verify user.yaml exists
      expect(existsSync(join(joinDir, '.clockwork', 'user.yaml'))).toBe(true);

      // Verify it does NOT contain project creation output
      expect(output).not.toContain('项目已创建');
    } finally {
      rmSync(joinDir, { recursive: true, force: true });
    }
  }, 30000);

  it('shows current user info and allows modification (Scenario C)', () => {
    const modDir = join(tmpdir(), 'clockwork-onboard-mod-' + Date.now());
    try {
      // Create project with init and write a user.yaml manually
      execSync(`cd ${__dirname}/../.. && ${CLI} init ${modDir}`, { encoding: 'utf8', timeout: 10000 });
      execSync(`cd ${modDir} && git init && git add -A && git commit -m "init"`, { encoding: 'utf8', timeout: 10000 });
      const userYaml = join(modDir, '.clockwork', 'user.yaml');
      writeFileSync(userYaml, 'user:\n  name: 王五\n  role: developer\n  email: wangwu@test.com\n');

      // Run onboard — should show current info and allow modification
      const input = 'y\n赵六\n3\nzhaoliu@test.com\ny\n';
      const output = execSync(`cd ${__dirname}/../.. && printf '${input}' | ${CLI} onboard ${modDir}`, {
        encoding: 'utf8',
        timeout: 15000,
      });
      expect(output).toContain('王五');
      expect(output).toContain('个人信息已更新');

      const config = readFileSync(join(modDir, '.clockwork', 'user.yaml'), 'utf8');
      expect(config).toContain('赵六');
      expect(config).toContain('tester');
    } finally {
      rmSync(modDir, { recursive: true, force: true });
    }
  }, 30000);
});
