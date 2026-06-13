import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import MarkdownViewer from '../components/MarkdownViewer';
import { fetchTask, fetchArtifacts, fetchArtifact, TaskStatusData, Artifact } from '../api';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<TaskStatusData | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<string>('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!taskId) return;
    Promise.all([fetchTask(taskId), fetchArtifacts(taskId)])
      .then(([t, a]) => {
        setTask(t);
        setArtifacts(a);
        if (a.length > 0) setSelectedArtifact(a[0].name);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    if (!taskId || !selectedArtifact) return;
    fetchArtifact(taskId, selectedArtifact)
      .then(setContent)
      .catch(() => setContent('*Unable to load artifact*'));
  }, [taskId, selectedArtifact]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!task) return <div className="error">Task not found</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link to="/tasks" style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back</Link>
        <h1 className="page-title" style={{ margin: 0 }}>{task.taskId}</h1>
        <StatusBadge status={task.status} />
        {task.humanReviewPending && (
          <Link to={`/tasks/${taskId}/review`} className="badge badge-active" style={{ textDecoration: 'none' }}>
            Review Needed
          </Link>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
          <div><span style={{ color: '#64748b' }}>Workflow:</span> {task.workflow}</div>
          <div><span style={{ color: '#64748b' }}>Stage:</span> {task.currentStage || 'not started'}</div>
          <div><span style={{ color: '#64748b' }}>Repos:</span> {task.repos.join(', ') || 'none'}</div>
          <div><span style={{ color: '#64748b' }}>Updated:</span> {new Date(task.updated).toLocaleString()}</div>
        </div>
        <div style={{ marginTop: 12 }}>
          {Object.entries(task.stages).map(([stage, status]) => (
            <span key={stage} style={{ marginRight: 16, fontSize: 12, color: '#94a3b8' }}>
              {status === 'completed' ? '✓' : status === 'in_progress' ? '▶' : '·'} {stage}: {status}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <h3 style={{ fontSize: 13, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Artifacts
          </h3>
          {artifacts.map(a => (
            <div
              key={a.name}
              onClick={() => setSelectedArtifact(a.name)}
              style={{
                padding: '6px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
                color: selectedArtifact === a.name ? '#38bdf8' : '#94a3b8',
                background: selectedArtifact === a.name ? '#1e293b' : 'transparent',
                marginBottom: 2,
              }}
            >
              {a.name}
            </div>
          ))}
          {artifacts.length === 0 && <p style={{ color: '#64748b', fontSize: 12 }}>No artifacts yet</p>}
        </div>
        <div className="card" style={{ flex: 1, minHeight: 300 }}>
          <MarkdownViewer content={content} />
        </div>
      </div>
    </div>
  );
}
