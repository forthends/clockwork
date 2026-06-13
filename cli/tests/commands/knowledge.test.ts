import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = 'npx tsx src/index.ts';
const CLI_DIR = join(__dirname, '..', '..');

describe('clockwork knowledge generate', () => {
  const testDir = join(tmpdir(), 'clockwork-knowledge-test-' + Date.now());

  beforeAll(() => {
    // Initialize project and set up minimal repo
    execSync(`${CLI} init ${testDir}`, { cwd: CLI_DIR, encoding: 'utf8', stdio: 'pipe' });
    // Copy workflows, agents, knowledge templates
    execSync(`cp -r ${join(__dirname, '..', '..', '..', 'workflows')} ${testDir}/`, {
      stdio: 'pipe',
    });
    execSync(`cp -r ${join(__dirname, '..', '..', '..', 'agents')} ${testDir}/`, {
      stdio: 'pipe',
    });
    execSync(`cp -r ${join(__dirname, '..', '..', '..', 'knowledge')} ${testDir}/`, {
      stdio: 'pipe',
    });
    // Create a minimal test repo in repos/
    const repoDir = join(testDir, 'repos', 'test-repo');
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, 'package.json'),
      JSON.stringify({ name: 'test-repo', dependencies: { express: '^4.18.0' } }, null, 2),
    );
    mkdirSync(join(repoDir, 'src'));
    writeFileSync(
      join(repoDir, 'src', 'index.ts'),
      `import express from 'express';\nconst app = express();\napp.get('/api/v1/items', (req, res) => res.json({ data: [] }));\nexport { app };`,
    );
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('rejects when repo does not exist', () => {
    expect(() =>
      execSync(`${CLI} knowledge generate --repo nonexistent --project ${testDir}`, {
        cwd: CLI_DIR,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    ).toThrow();
  });

  it('prepares context for a valid repo', () => {
    const output = execSync(`${CLI} knowledge generate --repo test-repo --project ${testDir}`, {
      cwd: CLI_DIR,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    expect(output).toContain('Knowledge generation context prepared');
    expect(output).toContain('knowledge-keeper');
    expect(output).toContain('test-repo');
  });

  it('generates context for a specific category', () => {
    const output = execSync(`${CLI} knowledge generate --repo test-repo --category architecture --project ${testDir}`, {
      cwd: CLI_DIR,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    expect(output).toContain('architecture');
    expect(output).not.toContain('business');
  });

  it('rejects invalid category', () => {
    expect(() =>
      execSync(`${CLI} knowledge generate --repo test-repo --category invalid --project ${testDir}`, {
        cwd: CLI_DIR,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    ).toThrow();
  });
});
