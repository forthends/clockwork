import { describe, it, expect } from 'vitest';
import { parseFrontmatterString } from '../src/frontmatter.js';

describe('parseFrontmatterString', () => {
  it('parses valid frontmatter and returns body', () => {
    const input = ['---', 'name: test', 'description: A test skill', '---', '# Body', 'Some instructions here.'].join(
      '\n',
    );

    const result = parseFrontmatterString<{ name: string; description: string }>(input);
    expect(result.frontmatter.name).toBe('test');
    expect(result.frontmatter.description).toBe('A test skill');
    expect(result.body).toBe('# Body\nSome instructions here.');
  });

  it('throws when frontmatter is missing', () => {
    expect(() => parseFrontmatterString('# No frontmatter')).toThrow('Missing YAML frontmatter');
  });

  it('throws when closing --- is missing', () => {
    expect(() => parseFrontmatterString('---\nname: test\n# No closing')).toThrow('Malformed');
  });
});
