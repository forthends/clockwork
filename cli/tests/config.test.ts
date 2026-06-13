import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('loadConfig', () => {
  it('loads a valid config.yaml', async () => {
    const dir = join(tmpdir(), 'clockwork-test-' + Date.now());
    await mkdir(join(dir, '.clockwork'), { recursive: true });
    await writeFile(join(dir, '.clockwork', 'config.yaml'), [
      'project:',
      '  name: test-project',
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

    const config = loadConfig(dir);
    expect(config.project.name).toBe('test-project');
    expect(config.ide.primary).toBe('claude-code');
    expect(config.agents.defaultModel).toBe('sonnet');
    expect(config.knowledge.maxEntriesPerQuery).toBe(5);
    expect(config.web.port).toBe(4200);

    await rm(dir, { recursive: true, force: true });
  });

  it('throws when config.yaml is missing', () => {
    expect(() => loadConfig('/nonexistent/path')).toThrow();
  });
});
