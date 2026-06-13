import express from 'express';
import { findAll, findById, create, update, remove } from './models.js';
import { validateCreate, validateUpdate } from './validators.js';

const app = express();
app.use(express.json());

app.get('/api/v1/todos', (_req, res) => {
  const todos = findAll();
  res.json({ data: todos, meta: { total: todos.length } });
});

app.get('/api/v1/todos/:id', (req, res) => {
  const todo = findById(req.params.id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  res.json({ data: todo });
});

app.post('/api/v1/todos', (req, res) => {
  const errors = validateCreate(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', fields: errors });
  const todo = create({
    title: req.body.title,
    description: req.body.description ?? '',
    status: req.body.status ?? 'todo',
    priority: req.body.priority ?? 0,
  });
  res.status(201).json({ data: todo });
});

app.patch('/api/v1/todos/:id', (req, res) => {
  const errors = validateUpdate(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', fields: errors });
  const todo = update(req.params.id, req.body);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  res.json({ data: todo });
});

app.delete('/api/v1/todos/:id', (req, res) => {
  const deleted = remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Todo not found' });
  res.status(204).send();
});

const port = parseInt(process.env.PORT || '3100', 10);
app.listen(port, () => console.log(`Demo Todo API running on http://localhost:${port}`));
