import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ReviewActions } from '../components/ReviewActions';
import { MarkdownViewer } from '../components/MarkdownViewer';
import { fetchTask, fetchArtifacts, fetchArtifact, Artifact } from '../api';

export function TaskReview() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    Promise.all([fetchTask(taskId), fetchArtifacts(taskId)])
      .then(([_, arts]) => {
        if (!cancelled) setArtifacts(arts);
        return Promise.all(
          arts.map(a => fetchArtifact(taskId, a.name).then(c => ({ name: a.name, content: c })))
        );
      })
      .then(results => {
        if (!cancelled) {
          const map: Record<string, string> = {};
          results.forEach(r => { map[r.name] = r.content; });
          setContents(map);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [taskId]);

  if (loading) return <div className="loading">Loading review...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link to={`/tasks/${taskId}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back</Link>
        <h1 className="page-title" style={{ margin: 0 }}>Review: {taskId}</h1>
      </div>

      {artifacts.map(a => (
        <div key={a.name} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8, color: '#94a3b8' }}>{a.name}</h3>
          <div className="card" style={{ padding: 20 }}>
            <MarkdownViewer content={contents[a.name] || ''} />
          </div>
        </div>
      ))}

      {taskId && <ReviewActions taskId={taskId} onComplete={() => navigate(`/tasks/${taskId}`)} />}
    </div>
  );
}
