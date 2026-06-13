import express from 'express';
import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import { loadConfig } from './config.js';
import { listTasks, loadTask, setHumanReviewPending } from './workspace.js';
import { loadIndex } from './knowledge-indexer.js';
import chalk from 'chalk';

export function startServer(projectRoot: string): void {
  const config = loadConfig(projectRoot);
  const app = express();

  app.use(express.json());

  // API: list tasks
  app.get('/api/tasks', (_req, res) => {
    const wsDir = join(projectRoot, config.workspace.dir);
    const tasks = listTasks(wsDir);
    res.json(tasks);
  });

  // API: get task detail
  app.get('/api/tasks/:taskId', (req, res) => {
    const wsDir = join(projectRoot, config.workspace.dir);
    try {
      const task = loadTask(wsDir, req.params.taskId);
      res.json(task);
    } catch {
      res.status(404).json({ error: 'Task not found' });
    }
  });

  // API: get artifact content
  app.get('/api/tasks/:taskId/artifact/:filename', (req, res) => {
    const wsDir = join(projectRoot, config.workspace.dir);
    const filePath = join(wsDir, req.params.taskId, req.params.filename);
    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'Artifact not found' });
      return;
    }
    res.sendFile(filePath);
  });

  // API: list artifacts for a task
  app.get('/api/tasks/:taskId/artifacts', (req, res) => {
    const wsDir = join(projectRoot, config.workspace.dir);
    const taskDir = join(wsDir, req.params.taskId);
    if (!existsSync(taskDir)) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    const files = readdirSync(taskDir)
      .filter((f: string) => f.endsWith('.md') && !f.startsWith('.'))
      .map((f: string) => ({ name: f, size: statSync(join(taskDir, f)).size }));
    res.json(files);
  });

  // API: knowledge entries
  app.get('/api/knowledge', (_req, res) => {
    const knowledgeDir = join(projectRoot, config.knowledge.dir);
    const index = loadIndex(knowledgeDir);
    res.json(index);
  });

  // API: knowledge entry content
  app.get('/api/knowledge/:entryPath(*)', (req, res) => {
    const knowledgeDir = join(projectRoot, config.knowledge.dir);
    const filePath = join(knowledgeDir, req.params.entryPath);
    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.sendFile(filePath);
  });

  // API: approve/reject
  app.post('/api/tasks/:taskId/review', (req, res) => {
    const wsDir = join(projectRoot, config.workspace.dir);
    const { action, reason } = req.body;
    try {
      setHumanReviewPending(wsDir, req.params.taskId, action !== 'approve');
      res.json({ ok: true, action, reason });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  // Serve static workbench files (production build)
  const workbenchDist = join(projectRoot, 'workbench', 'dist');
  if (existsSync(workbenchDist)) {
    app.use(express.static(workbenchDist));
    app.get('*', (_req, res) => {
      res.sendFile(join(workbenchDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({
        message: 'Clockwork API server running',
        note: 'Build the workbench first: cd workbench && pnpm build',
        endpoints: ['/api/tasks', '/api/tasks/:taskId', '/api/knowledge'],
      });
    });
  }

  const port = config.web.port;
  const host = config.web.host;
  app.listen(port, host, () => {
    console.log(chalk.bold(`Clockwork workbench: http://${host}:${port}`));
    console.log('');
    console.log(chalk.dim('  Pages:'));
    console.log(chalk.dim('    /tasks               Task Board'));
    console.log(chalk.dim('    /tasks/:id           Task Detail'));
    console.log(chalk.dim('    /tasks/:id/review    Task Review'));
    console.log(chalk.dim('    /knowledge           Knowledge Base'));
  });
}
