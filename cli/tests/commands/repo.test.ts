import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, realpathSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = 'npx tsx src/index.ts';
const CLI_DIR = join(__dirname, '..', '..');

describe('clockwork repo', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-repo-test-' + Date.now());
    mkdirSync(dir, { recursive: true });
    dir = realpathSync(dir); // resolve /var -> /private/var symlink on macOS
    execSync(`${CLI} init ${dir}`, { cwd: CLI_DIR, stdio: 'pipe' });
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  it('repo status shows empty repos', () => {
    // repo status runs "git submodule status". Since the project is not
    // yet a git repo, the command fails and prints "No submodules".
    const output = execSync(`cd ${CLI_DIR} && ${CLI} repo status --project ${dir}`, { encoding: 'utf8' });
    expect(output).toContain('No submodules');
  });

  it('repo add fails with invalid URL', () => {
    // The CLI calls process.exit(1) on failure, which causes execSync to throw.
    expect(() => {
      execSync(`cd ${CLI_DIR} && ${CLI} repo add not-a-valid-url --project ${dir}`, { stdio: 'pipe' });
    }).toThrow();
  });

  it('repo add creates entry for valid repo path', () => {
    // The project must be a git repository for git submodule add to work.
    execSync('git init && git config user.email "test@test.com" && git config user.name "Test"', {
      cwd: dir, stdio: 'pipe',
    });

    // Create a fake remote repository with at least one commit.
    const fakeRepo = join(tmpdir(), 'cw-fake-repo-' + Date.now());
    mkdirSync(fakeRepo, { recursive: true });
    const resolvedFakeRepo = realpathSync(fakeRepo);
    execSync(
      'git init && git config user.email "test@test.com" && git config user.name "Test" && git commit --allow-empty -m "init"',
      { cwd: resolvedFakeRepo, stdio: 'pipe' },
    );

    const output = execSync(
      `cd ${CLI_DIR} && ${CLI} repo add ${resolvedFakeRepo} --name test-repo --project ${dir}`,
      { encoding: 'utf8' },
    );
    expect(output).toContain('test-repo');

    rmSync(fakeRepo, { recursive: true, force: true });
  });
});
