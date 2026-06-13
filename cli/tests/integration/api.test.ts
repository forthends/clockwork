import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { mkdirSync, rmSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import express from 'express';
import { createTask, listTasks, loadTask, setHumanReviewPending } from '../../src/workspace.js';
import { loadIndex } from '../../src/knowledge-indexer.js';

function createConfigYaml(port: number, host: string): string {
  return [
    'project:',
    '  name: test',
    'ide:',
    '  primary: claude-code',
    'agents:',
    '  dir: agents/',
    '  defaultModel: sonnet',
    'knowledge:',
    '  dir: knowledge/',
    '  index: knowledge/index.yaml',
    '  maxEntriesPerQuery: 5',
    'workflows:',
    '  dir: workflows/',
    'repos:',
    '  dir: repos/',
    'workspace:',
    '  dir: workspace/',
    'web:',
    `  port: ${port}`,
    `  host: ${host}`,
  ].join('\n');
}

function createTestApp(dataDir: string, workspaceDir: string, knowledgeDir: string): express.Express {
  const app = express();
  app.use(express.json());

  // GET /api/tasks — list all tasks
  app.get('/api/tasks', (_req, res) => {
    res.json(listTasks(workspaceDir));
  });

  // GET /api/tasks/:taskId — get task detail
  app.get('/api/tasks/:taskId', (req, res) => {
    try {
      const task = loadTask(workspaceDir, req.params.taskId);
      res.json(task);
    } catch {
      res.status(404).json({ error: 'Task not found' });
    }
  });

  // GET /api/tasks/:taskId/artifacts — list artifact files
  app.get('/api/tasks/:taskId/artifacts', (req, res) => {
    const taskDir = join(workspaceDir, req.params.taskId);
    if (!existsSync(taskDir)) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    const files = readdirSync(taskDir)
      .filter((f: string) => f.endsWith('.md') && !f.startsWith('.'))
      .map((f: string) => ({ name: f, size: statSync(join(taskDir, f)).size }));
    res.json(files);
  });

  // GET /api/tasks/:taskId/artifact/:filename — get artifact content
  app.get('/api/tasks/:taskId/artifact/:filename', (req, res) => {
    const filePath = join(workspaceDir, req.params.taskId, req.params.filename);
    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'Artifact not found' });
      return;
    }
    res.sendFile(filePath);
  });

  // GET /api/knowledge — list knowledge entries
  app.get('/api/knowledge', (_req, res) => {
    try {
      const index = loadIndex(knowledgeDir);
      res.json(index);
    } catch {
      res.json({ entries: [] });
    }
  });

  // GET /api/knowledge/:entryPath(*) — get knowledge entry content
  app.get('/api/knowledge/:entryPath(*)', (req, res) => {
    const filePath = join(knowledgeDir, req.params.entryPath);
    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.sendFile(filePath);
  });

  // POST /api/tasks/:taskId/review — approve or reject
  app.post('/api/tasks/:taskId/review', (req, res) => {
    const { action, reason } = req.body;
    try {
      setHumanReviewPending(workspaceDir, req.params.taskId, action !== 'approve');
      res.json({ ok: true, action, reason });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  return app;
}

describe('API endpoints', () => {
  let dir: string;
  let app: express.Express;
  let workspaceDir: string;
  let knowledgeDir: string;

  beforeEach(() => {
    dir = join(tmpdir(), 'cw-api-test-' + Date.now());
    mkdirSync(dir, { recursive: true });

    // Create minimal project structure
    mkdirSync(join(dir, '.clockwork'), { recursive: true });
    writeFileSync(join(dir, '.clockwork', 'config.yaml'), createConfigYaml(4200, 'localhost'));

    workspaceDir = join(dir, 'workspace');
    knowledgeDir = join(dir, 'knowledge');
    mkdirSync(workspaceDir, { recursive: true });
    mkdirSync(knowledgeDir, { recursive: true });

    app = createTestApp(dir, workspaceDir, knowledgeDir);
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  });

  // Endpoint 1: GET /api/tasks
  it('GET /api/tasks returns empty array', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // Endpoint 1 (continued): GET /api/tasks returns created tasks
  it('GET /api/tasks returns created tasks', async () => {
    createTask(workspaceDir, 'feature-dev', 'test-api', []);
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].workflow).toBe('feature-dev');
  });

  // Endpoint 2: GET /api/tasks/:taskId
  it('GET /api/tasks/:taskId returns task detail', async () => {
    const task = createTask(workspaceDir, 'feature-dev', 'detail-test', ['test-repo']);
    const res = await request(app).get(`/api/tasks/${task.taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.taskId).toBe(task.taskId);
    expect(res.body.workflow).toBe('feature-dev');
    expect(res.body.repos).toEqual(['test-repo']);
  });

  // Endpoint 2 (error case): 404 for unknown task
  it('GET /api/tasks/:taskId returns 404 for unknown task', async () => {
    const res = await request(app).get('/api/tasks/nonexistent');
    expect(res.status).toBe(404);
  });

  // Endpoint 3: GET /api/tasks/:taskId/artifacts
  it('GET /api/tasks/:taskId/artifacts lists artifact files', async () => {
    const task = createTask(workspaceDir, 'feature-dev', 'artifact-test', []);
    // Create a mock artifact file
    writeFileSync(join(workspaceDir, task.taskId, 'REVIEW.md'), '# Review');
    const res = await request(app).get(`/api/tasks/${task.taskId}/artifacts`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('REVIEW.md');
  });

  // Endpoint 3 (error case): 404 for unknown task
  it('GET /api/tasks/:taskId/artifacts returns 404 for unknown task', async () => {
    const res = await request(app).get('/api/tasks/nonexistent/artifacts');
    expect(res.status).toBe(404);
  });

  // Endpoint 4: GET /api/tasks/:taskId/artifact/:filename
  it('GET /api/tasks/:taskId/artifact/:filename returns file content', async () => {
    const task = createTask(workspaceDir, 'feature-dev', 'artifact-file-test', []);
    writeFileSync(join(workspaceDir, task.taskId, 'SPEC.md'), '# Specification');
    const res = await request(app).get(`/api/tasks/${task.taskId}/artifact/SPEC.md`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Specification');
  });

  // Endpoint 4 (error case): 404 for missing file
  it('GET /api/tasks/:taskId/artifact/:filename returns 404 for missing file', async () => {
    const task = createTask(workspaceDir, 'feature-dev', 'missing-file-test', []);
    const res = await request(app).get(`/api/tasks/${task.taskId}/artifact/missing.md`);
    expect(res.status).toBe(404);
  });

  // Endpoint 5: GET /api/knowledge
  it('GET /api/knowledge returns knowledge index', async () => {
    const res = await request(app).get('/api/knowledge');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entries');
    expect(Array.isArray(res.body.entries)).toBe(true);
  });

  // Endpoint 6: GET /api/knowledge/:entryPath(*)
  it('GET /api/knowledge/:entryPath returns knowledge entry content', async () => {
    writeFileSync(join(knowledgeDir, 'test-entry.md'), '# Test Knowledge');
    const res = await request(app).get('/api/knowledge/test-entry.md');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Test Knowledge');
  });

  // Endpoint 6 (error case): 404 for missing entry
  it('GET /api/knowledge/:entryPath returns 404 for missing entry', async () => {
    const res = await request(app).get('/api/knowledge/missing.md');
    expect(res.status).toBe(404);
  });

  // Endpoint 7: POST /api/tasks/:taskId/review — approve
  it('POST /api/tasks/:taskId/review approve', async () => {
    const task = createTask(workspaceDir, 'feature-dev', 'review-test', []);
    const res = await request(app).post(`/api/tasks/${task.taskId}/review`).send({ action: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.action).toBe('approve');
  });

  // Endpoint 7: POST /api/tasks/:taskId/review — reject with reason
  it('POST /api/tasks/:taskId/review reject with reason', async () => {
    const task = createTask(workspaceDir, 'feature-dev', 'reject-test', []);
    const res = await request(app)
      .post(`/api/tasks/${task.taskId}/review`)
      .send({ action: 'reject', reason: 'Not good enough' });
    expect(res.status).toBe(200);
    expect(res.body.action).toBe('reject');
    expect(res.body.reason).toBe('Not good enough');
  });

  // Endpoint 7 (error case): 400 for unknown task
  it('POST /api/tasks/:taskId/review returns 400 for unknown task', async () => {
    const res = await request(app).post('/api/tasks/nonexistent/review').send({ action: 'approve' });
    expect(res.status).toBe(400);
  });
});
