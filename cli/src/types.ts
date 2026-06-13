export interface ClockworkConfig {
  project: { name: string };
  ide: {
    primary: 'claude-code' | 'cursor' | 'codex';
    fallback?: 'claude-code' | 'cursor' | 'codex';
  };
  agents: { dir: string; defaultModel: 'sonnet' | 'opus' | 'haiku' };
  knowledge: { dir: string; index: string; maxEntriesPerQuery: number };
  workflows: { dir: string };
  repos: { dir: string };
  workspace: { dir: string };
  web: { port: number; host: string };
  cli: { lockTTLMinutes: number };
}

export interface AgentFrontmatter {
  name: string;
  description: string;
  role: string;
  capabilities: string[];
  boundaries: string[];
  input: { required: string[]; optional?: string[] };
  output: { file: string; description: string }[];
  skills?: string[];
  model?: 'sonnet' | 'opus' | 'haiku';
}

export interface WorkflowStage {
  id: string;
  agent: string;
  role?: 'pm' | 'developer' | 'tester';
  description: string;
  skills?: string[];
  input: { required: string[] };
  output?: string[];
  strategy?: 'sequential' | 'parallel';
  maxRetries?: number;
  humanReview: 'required' | 'optional' | 'none';
}

export interface WorkflowFrontmatter {
  name: string;
  description: string;
  trigger: string;
  stages: WorkflowStage[];
}

export interface KnowledgeEntry {
  path: string;
  title: string;
  category: 'business' | 'architecture' | 'design-system' | 'decisions';
  tags: string[];
  status: 'active' | 'draft' | 'archived';
  updated: string;
  scope?: string;
}

export interface KnowledgeIndex {
  entries: KnowledgeEntry[];
}

export interface StageMeta {
  retryCount: number;
  maxRetries: number;
  startedAt: string;
  timeoutMs: number;
}

export interface TaskStatus {
  taskId: string;
  workflow: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'interrupted';
  currentStage: string;
  stages: Record<string, 'pending' | 'in_progress' | 'completed' | 'failed' | 'interrupted'>;
  stageMeta: Record<string, StageMeta>;
  created: string;
  updated: string;
  repos: string[];
  humanReviewPending: boolean;
}

export interface AgentContext {
  agentName: string;
  role: string;
  capabilities: string[];
  boundaries: string[];
  instructions: string;
  skills: string[];
  inputs: Record<string, string>;
  knowledgeEntries: KnowledgeEntry[];
}

export interface UserConfig {
  name: string;
  role: 'pm' | 'developer' | 'tester';
  email: string;
}
