import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildAgentContext } from '../src/context-builder.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('context builder', () => {
  const testDir = join(tmpdir(), 'clockwork-ctx-test-' + Date.now());

  beforeAll(async () => {
    await mkdir(join(testDir, 'agents'), { recursive: true });
    await writeFile(join(testDir, 'agents', 'planner.md'), [
      '---',
      'name: planner',
      'description: Plans feature implementation',
      'role: Technical Designer',
      'capabilities:',
      '  - Requirement analysis',
      '  - Technical design',
      'boundaries:',
      '  - No production code',
      'input:',
      '  required: [requirements]',
      'output:',
      '  - file: SPEC.md',
      '    description: Technical spec',
      'skills:',
      '  - brainstorming',
      'model: opus',
      '---',
      '# Planner',
      '## Workflow',
      '1. Read requirements',
      '2. Ask clarifying questions',
    ].join('\n'));
    // Create a minimal config for loadConfig to find
    await mkdir(join(testDir, '.clockwork'), { recursive: true });
    await writeFile(join(testDir, '.clockwork', 'config.yaml'), [
      'project:',
      '  name: test',
      'ide:',
      '  primary: claude-code',
      'agents:',
      '  dir: agents/',
      '  defaultModel: sonnet',
      'knowledge:',
      '  dir: knowledge/',
      '  index: knowledge/index.yaml',
      '  maxEntriesPerQuery: 5',
      'workflows:',
      '  dir: workflows/',
      'repos:',
      '  dir: repos/',
      'workspace:',
      '  dir: workspace/',
      'web:',
      '  port: 4200',
      '  host: localhost',
    ].join('\n'));
    await mkdir(join(testDir, 'knowledge'), { recursive: true });
    await writeFile(join(testDir, 'knowledge', 'index.yaml'), [
      'entries:',
      '  - path: architecture/api.md',
      '    title: API Conventions',
      '    category: architecture',
      '    tags: [REST, auth]',
      '    status: active',
      '    updated: "2026-06-01"',
      '    scope: global',
    ].join('\n'));
  });

  afterAll(async () => { await rm(testDir, { recursive: true, force: true }); });

  it('builds context package from agent definition and inputs', async () => {
    const ctx = await buildAgentContext(testDir, 'planner', { requirements: 'Build login feature' });
    expect(ctx.agentName).toBe('planner');
    expect(ctx.role).toBe('Technical Designer');
    expect(ctx.capabilities).toContain('Requirement analysis');
    expect(ctx.boundaries).toContain('No production code');
    expect(ctx.skills).toContain('brainstorming');
    expect(ctx.inputs.requirements).toBe('Build login feature');
    expect(ctx.instructions).toContain('# Planner');
  });
});
