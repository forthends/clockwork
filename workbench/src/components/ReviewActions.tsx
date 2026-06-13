import { useState } from 'react';
import { submitReview } from '../api';

interface Props {
  taskId: string;
  onComplete: () => void;
}

export function ReviewActions({ taskId, onComplete }: Props) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState('');

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !reason.trim()) return;
    setSubmitting(true);
    try {
      await submitReview(taskId, action, reason);
      setResult(
        action === 'approve'
          ? 'Approved! The task can now continue.'
          : `Rejected: ${reason}. The task requires changes.`,
      );
      onComplete();
    } catch (e) {
      setResult('Error: ' + String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: 32,
          color: result.includes('Approved') ? '#10b981' : '#ef4444',
          fontWeight: 600,
        }}
      >
        {result}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, marginBottom: 16 }}>Review Decision</h3>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
          Reason (required for rejection)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter rejection reason..."
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#e2e8f0',
            fontSize: 13,
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => handleAction('approve')}
          disabled={submitting}
          style={{
            padding: '10px 24px',
            borderRadius: 6,
            border: 'none',
            background: '#10b981',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ✓ Approve
        </button>
        <button
          onClick={() => handleAction('reject')}
          disabled={submitting || !reason.trim()}
          style={{
            padding: '10px 24px',
            borderRadius: 6,
            border: 'none',
            background: '#ef4444',
            color: '#fff',
            fontWeight: 600,
            cursor: reason.trim() ? 'pointer' : 'not-allowed',
            opacity: reason.trim() ? 1 : 0.5,
            fontSize: 13,
          }}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}
