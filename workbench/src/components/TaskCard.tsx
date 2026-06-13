import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import type { TaskStatusData } from '../api';

export function TaskCard({ task }: { task: TaskStatusData }) {
  return (
    <Link to={`/tasks/${task.taskId}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ marginBottom: 12, cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>{task.taskId}</h3>
          <StatusBadge status={task.status} />
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 16 }}>
          <span>Workflow: {task.workflow}</span>
          <span>Stage: {task.currentStage || 'not started'}</span>
          <span>Updated: {new Date(task.updated).toLocaleDateString()}</span>
        </div>
        {task.repos.length > 0 && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Repos: {task.repos.join(', ')}
          </div>
        )}
        {task.humanReviewPending && (
          <div style={{ marginTop: 8, color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
            ⚠ Review pending
          </div>
        )}
      </div>
    </Link>
  );
}
