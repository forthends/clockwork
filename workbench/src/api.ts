export interface TaskStatusData {
  taskId: string;
  workflow: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStage: string;
  stages: Record<string, string>;
  created: string;
  updated: string;
  repos: string[];
  humanReviewPending: boolean;
}

export interface KnowledgeEntryData {
  path: string;
  title: string;
  category: string;
  tags: string[];
  status: string;
  updated: string;
}

export interface KnowledgeIndexData {
  entries: KnowledgeEntryData[];
}

export interface Artifact {
  name: string;
  size: number;
}

const BASE = '/api';

export async function fetchTasks(): Promise<TaskStatusData[]> {
  const res = await fetch(`${BASE}/tasks`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function fetchTask(taskId: string): Promise<TaskStatusData> {
  const res = await fetch(`${BASE}/tasks/${taskId}`);
  if (!res.ok) throw new Error('Task not found');
  return res.json();
}

export async function fetchArtifact(taskId: string, filename: string): Promise<string> {
  const res = await fetch(`${BASE}/tasks/${taskId}/artifact/${filename}`);
  if (!res.ok) throw new Error('Artifact not found');
  return res.text();
}

export async function fetchArtifacts(taskId: string): Promise<Artifact[]> {
  const res = await fetch(`${BASE}/tasks/${taskId}/artifacts`);
  if (!res.ok) throw new Error('Artifacts not found');
  return res.json();
}

export async function fetchKnowledge(): Promise<KnowledgeIndexData> {
  const res = await fetch(`${BASE}/knowledge`);
  if (!res.ok) throw new Error('Failed to fetch knowledge');
  return res.json();
}

export async function fetchKnowledgeEntry(path: string): Promise<string> {
  const res = await fetch(`${BASE}/knowledge/${path}`);
  if (!res.ok) throw new Error('Entry not found');
  return res.text();
}

export async function submitReview(taskId: string, action: 'approve' | 'reject', reason?: string): Promise<void> {
  await fetch(`${BASE}/tasks/${taskId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reason }),
  });
}
