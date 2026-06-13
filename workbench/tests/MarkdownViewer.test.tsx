import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownViewer from '../src/components/MarkdownViewer';

describe('MarkdownViewer', () => {
  it('renders headings', () => {
    const md = '# H1\n## H2\n### H3';
    render(<MarkdownViewer content={md} />);
    expect(screen.getByText('H1').tagName).toBe('H1');
    expect(screen.getByText('H2').tagName).toBe('H2');
  });

  it('renders code blocks', () => {
    const md = '```typescript\nconst x = 1;\n```';
    render(<MarkdownViewer content={md} />);
    const code = document.querySelector('pre code');
    expect(code).toBeInTheDocument();
  });

  it('renders inline code', () => {
    const md = 'Use `code` inline';
    render(<MarkdownViewer content={md} />);
    const code = screen.getByText('code');
    expect(code.tagName).toBe('CODE');
  });

  it('renders tables', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    render(<MarkdownViewer content={md} />);
    expect(document.querySelector('table')).toBeInTheDocument();
  });

  it('renders links', () => {
    const md = '[Click here](https://example.com)';
    render(<MarkdownViewer content={md} />);
    const link = screen.getByText('Click here');
    expect(link.tagName).toBe('A');
  });

  it('renders blockquotes', () => {
    const md = '> quoted text';
    render(<MarkdownViewer content={md} />);
    expect(document.querySelector('blockquote')).toBeInTheDocument();
  });

  it('renders bold and italic', () => {
    const md = '**bold** *italic*';
    render(<MarkdownViewer content={md} />);
    expect(document.querySelector('strong')).toBeInTheDocument();
    expect(document.querySelector('em')).toBeInTheDocument();
  });

  it('renders horizontal rules', () => {
    const md = 'Above\n\n---\n\nBelow';
    render(<MarkdownViewer content={md} />);
    expect(document.querySelector('hr')).toBeInTheDocument();
  });
});
