const statusClass: Record<string, string> = {
  in_progress: 'badge-active',
  completed: 'badge-completed',
  failed: 'badge-failed',
  pending: 'badge-pending',
};

const statusLabel: Record<string, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  pending: 'Pending',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusClass[status] || 'badge-pending'}`}>{statusLabel[status] || status}</span>;
}
