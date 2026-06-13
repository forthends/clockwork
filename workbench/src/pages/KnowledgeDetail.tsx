import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchKnowledgeEntry } from '../api';
import MarkdownViewer from '../components/MarkdownViewer';

export default function KnowledgeDetail() {
  const { entryPath } = useParams<{ entryPath: string }>();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entryPath) return;
    fetchKnowledgeEntry(entryPath)
      .then(setContent)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [entryPath]);

  if (loading) return <div className="loading">Loading entry...</div>;
  if (error) return <div className="error">{error}</div>;

  const fileName = entryPath?.split('/').pop()?.replace('.md', '') || '';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link to="/knowledge" style={{ color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>
          &larr; Back to Knowledge Base
        </Link>
      </div>

      <h1 className="page-title" style={{ textTransform: 'capitalize' }}>
        {fileName.replace(/-/g, ' ')}
      </h1>

      <div className="card" style={{ padding: 24, marginTop: 16 }}>
        <MarkdownViewer content={content} />
      </div>
    </div>
  );
}
