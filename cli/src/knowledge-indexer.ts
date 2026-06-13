import { writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { parseFrontmatter } from './frontmatter.js';
import { KnowledgeIndex, KnowledgeEntry } from './types.js';

export function buildIndex(knowledgeDir: string): KnowledgeIndex {
  const entries: KnowledgeEntry[] = [];
  const now = new Date().toISOString().slice(0, 10);

  function walk(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['.git', 'node_modules'].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        const relPath = relative(knowledgeDir, fullPath);
        const parentDir = relative(knowledgeDir, dirname(fullPath)) || 'root';
        const category = mapCategory(parentDir);
        let tags: string[] = [];
        try {
          const { frontmatter: fm } = parseFrontmatter<{ tags?: string[] }>(fullPath);
          tags = fm.tags || [];
        } catch {
          // file has no frontmatter or invalid — use empty tags
        }
        entries.push({
          path: relPath,
          title: entry.name.replace('.md', '').replace(/-/g, ' '),
          category,
          tags,
          status: 'active',
          updated: now,
          scope: 'global',
        });
      }
    }
  }

  walk(knowledgeDir);
  return { entries };
}

function mapCategory(dir: string): KnowledgeEntry['category'] {
  if (dir.includes('business')) return 'business';
  if (dir.includes('architecture')) return 'architecture';
  if (dir.includes('design-system')) return 'design-system';
  if (dir.includes('decisions')) return 'decisions';
  return 'architecture';
}

export function queryIndex(
  index: KnowledgeIndex,
  filters: { tags?: string[]; category?: string; scope?: string; maxResults?: number },
): KnowledgeEntry[] {
  const maxResults = filters.maxResults ?? 5;
  let results = index.entries.filter((e) => e.status === 'active');

  if (filters.category) {
    results = results.filter((e) => e.category === filters.category);
  }
  if (filters.tags && filters.tags.length > 0) {
    results = results.filter((e) => filters.tags!.some((t) => e.tags.includes(t)));
  }
  if (filters.scope) {
    results = results.filter((e) => e.scope === 'global' || e.scope === filters.scope);
  }
  return results.slice(0, maxResults);
}

export function updateEntry(
  index: KnowledgeIndex,
  entryPath: string,
  updates: Partial<KnowledgeEntry>,
): KnowledgeIndex {
  const entry = index.entries.find((e) => e.path === entryPath);
  if (!entry) throw new Error(`Entry not found: ${entryPath}`);
  Object.assign(entry, updates, { updated: new Date().toISOString().slice(0, 10) });
  return index;
}

export function saveIndex(knowledgeDir: string, index: KnowledgeIndex): void {
  writeFileSync(join(knowledgeDir, 'index.yaml'), stringifyYaml(index));
}

export function loadIndex(knowledgeDir: string): KnowledgeIndex {
  const indexPath = join(knowledgeDir, 'index.yaml');
  if (!existsSync(indexPath)) {
    return buildIndex(knowledgeDir);
  }
  const raw = readFileSync(indexPath, 'utf8');
  return parseYaml(raw) as KnowledgeIndex;
}
