import React, { useEffect, useState } from 'react';

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.*$)/gm, '<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;color:#f8fafc">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="font-size:18px;font-weight:700;margin:20px 0 10px;color:#f8fafc">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 style="font-size:22px;font-weight:700;margin:24px 0 12px;color:#f8fafc">$1</h1>')
    .replace(/^- (.*$)/gm, '<li style="margin-left:16px;color:#cbd5e1">$1</li>')
    .replace(/`([^`]+)`/g, '<code style="background:#0f172a;padding:1px 6px;border-radius:3px;font-family:JetBrains Mono,monospace;font-size:12px;color:#38bdf8">$1</code>')
    .replace(/\n\n/g, '<br/><br/>');
}

export default function MarkdownViewer({ content }: { content: string }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    setHtml(renderMarkdown(content));
  }, [content]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
