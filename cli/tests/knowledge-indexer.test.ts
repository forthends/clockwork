import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildIndex, queryIndex, updateEntry } from '../src/knowledge-indexer.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('knowledge indexer', () => {
  const testDir = join(tmpdir(), 'clockwork-kb-test-' + Date.now());
  const knowledgeDir = join(testDir, 'knowledge');

  beforeAll(async () => {
    await mkdir(join(knowledgeDir, 'architecture'), { recursive: true });
    await mkdir(join(knowledgeDir, 'business'), { recursive: true });
    await writeFile(join(knowledgeDir, 'architecture', 'api.md'), '# API Conventions\nRESTful design.');
    await writeFile(join(knowledgeDir, 'business', 'domain.md'), '# Domain Model\nUser and Order entities.');
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('builds index from knowledge directory', () => {
    const index = buildIndex(knowledgeDir);
    expect(index.entries.length).toBe(2);
    expect(index.entries[0].path).toBe('architecture/api.md');
    expect(index.entries[0].status).toBe('active');
  });

  it('queries index by tags and category', () => {
    const index = buildIndex(knowledgeDir);
    const updated = updateEntry(index, 'architecture/api.md', {
      tags: ['REST', 'endpoints'],
      category: 'architecture',
    });
    const results = queryIndex(updated, { tags: ['REST'] });
    expect(results.length).toBe(1);
    expect(results[0].path).toBe('architecture/api.md');
  });

  it('filters out archived and draft entries', () => {
    const index = buildIndex(knowledgeDir);
    const updated = updateEntry(index, 'business/domain.md', { status: 'archived' });
    const results = queryIndex(updated, {});
    expect(results.length).toBe(1);
    expect(results[0].path).toBe('architecture/api.md');
  });
});
