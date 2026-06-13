import { describe, it, expect } from 'vitest';
import { findAll, findById, create, update, remove } from '../src/models.js';

describe('Todo models', () => {
  it('creates a todo', () => {
    const todo = create({ title: 'Test', description: 'Desc', status: 'todo', priority: 1 });
    expect(todo.id).toBeDefined();
    expect(todo.title).toBe('Test');
    expect(todo.status).toBe('todo');
    expect(todo.priority).toBe(1);
  });

  it('finds all todos sorted by priority descending', () => {
    create({ title: 'Low', description: '', status: 'todo', priority: 0 });
    create({ title: 'High', description: '', status: 'todo', priority: 10 });
    const all = findAll();
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].priority).toBeGreaterThanOrEqual(all[i].priority);
    }
    expect(all.find(t => t.title === 'High')).toBeDefined();
    expect(all.find(t => t.title === 'Low')).toBeDefined();
  });

  it('finds by id', () => {
    const created = create({ title: 'Find me', description: '', status: 'todo', priority: 0 });
    const found = findById(created.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Find me');
  });

  it('returns undefined for missing id', () => {
    expect(findById('nonexistent')).toBeUndefined();
  });

  it('updates a todo', () => {
    const created = create({ title: 'Old', description: '', status: 'todo', priority: 0 });
    const updated = update(created.id, { title: 'New', status: 'done' });
    expect(updated!.title).toBe('New');
    expect(updated!.status).toBe('done');
  });

  it('returns undefined when updating missing todo', () => {
    expect(update('missing', { title: 'X' })).toBeUndefined();
  });

  it('removes a todo', () => {
    const created = create({ title: 'Delete me', description: '', status: 'todo', priority: 0 });
    expect(remove(created.id)).toBe(true);
    expect(findById(created.id)).toBeUndefined();
  });

  it('returns false when removing missing todo', () => {
    expect(remove('missing')).toBe(false);
  });
});
