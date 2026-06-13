import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchKnowledge, KnowledgeIndexData } from '../api';

export function KnowledgeBrowser() {
  const [data, setData] = useState<KnowledgeIndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    fetchKnowledge()
      .then((data) => {
        if (!cancelled) setData(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="loading">Loading knowledge base...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  const filtered = filter === 'all' ? data.entries : data.entries.filter((e) => e.category === filter);

  const categories = ['all', ...new Set(data.entries.map((e) => e.category))];

  return (
    <div>
      <h1 className="page-title">Knowledge Base</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: filter === c ? '#3b82f6' : '#1e293b',
              color: filter === c ? '#fff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map((entry) => (
          <Link key={entry.path} to={`/knowledge/${entry.path}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{entry.title}</h3>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {entry.path} · {entry.category} · Updated {entry.updated}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: '#0f172a',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        color: '#94a3b8',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {entry.status !== 'active' && (
                    <span className={`badge ${entry.status === 'archived' ? 'badge-failed' : 'badge-pending'}`}>
                      {entry.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
            No entries found
          </div>
        )}
      </div>
    </div>
  );
}
