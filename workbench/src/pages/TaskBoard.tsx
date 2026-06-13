import React, { useEffect, useState } from 'react';
import TaskCard from '../components/TaskCard';
import { fetchTasks, TaskStatusData } from '../api';

export default function TaskBoard() {
  const [tasks, setTasks] = useState<TaskStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchTasks()
      .then(data => { if (!cancelled) setTasks(data); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="loading">Loading tasks...</div>;
  if (error) return <div className="error">Failed to load tasks: {error}</div>;

  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');

  return (
    <div>
      <h1 className="page-title">Task Board</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 13, color: '#f59e0b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            In Progress ({inProgress.length})
          </h3>
          {inProgress.map(t => <TaskCard key={t.taskId} task={t} />)}
          {inProgress.length === 0 && <p className="card" style={{ color: '#64748b', fontSize: 13 }}>No tasks in progress</p>}
        </div>

        <div>
          <h3 style={{ fontSize: 13, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Pending ({pending.length})
          </h3>
          {pending.map(t => <TaskCard key={t.taskId} task={t} />)}
          {pending.length === 0 && <p className="card" style={{ color: '#64748b', fontSize: 13 }}>No pending tasks</p>}
        </div>

        <div>
          <h3 style={{ fontSize: 13, color: '#10b981', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Completed ({completed.length})
          </h3>
          {completed.map(t => <TaskCard key={t.taskId} task={t} />)}
          {completed.length === 0 && <p className="card" style={{ color: '#64748b', fontSize: 13 }}>No completed tasks</p>}
        </div>
      </div>
    </div>
  );
}
