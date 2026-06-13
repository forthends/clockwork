import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';

export function parseFrontmatter<T>(filePath: string): { frontmatter: T; body: string } {
  const content = readFileSync(filePath, 'utf8');
  return parseFrontmatterString<T>(content);
}

export function parseFrontmatterString<T>(content: string): { frontmatter: T; body: string } {
  const trimmed = content.trim();
  if (!trimmed.startsWith('---')) {
    throw new Error('Missing YAML frontmatter: file must start with ---');
  }

  // Find closing --- that appears at the start of a line (after the opening ---)
  const closingMatch = trimmed.slice(4).match(/^---\s*$/m);
  if (!closingMatch || closingMatch.index === undefined) {
    throw new Error('Malformed YAML frontmatter: missing closing --- on its own line');
  }

  const yamlBlock = trimmed.slice(4, 4 + closingMatch.index).trim();
  const frontmatter = parseYaml(yamlBlock);
  if (frontmatter === null || typeof frontmatter !== 'object') {
    throw new Error('YAML frontmatter is empty or invalid');
  }

  const bodyStart = 4 + closingMatch.index + closingMatch[0].length;
  const body = trimmed.slice(bodyStart).trim();
  return { frontmatter: frontmatter as T, body };
}
