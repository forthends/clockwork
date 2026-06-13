import { useMemo } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

marked.setOptions({
  gfm: true,
  breaks: false,
});

const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const validLang = lang && hljs.getLanguage(lang) ? lang : undefined;
  const highlighted = validLang
    ? hljs.highlight(text, { language: validLang }).value
    : hljs.highlightAuto(text).value;
  const langAttr = validLang ? ` class="hljs language-${validLang}"` : ' class="hljs"';
  return `<pre><code${langAttr}>${highlighted}</code></pre>`;
};

marked.setOptions({ renderer });

export default function MarkdownViewer({ content }: { content: string }) {
  const html = useMemo(() => {
    const parsed = marked.parse(content);
    return typeof parsed === 'string' ? parsed : '';
  }, [content]);

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
