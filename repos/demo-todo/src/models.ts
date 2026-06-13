export type TodoStatus = 'todo' | 'in_progress' | 'done';

export interface Todo {
  id: string;
  title: string;
  description: string;
  status: TodoStatus;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

const store: Map<string, Todo> = new Map();

export function resetStore(): void {
  store.clear();
}

export function findAll(): Todo[] {
  return Array.from(store.values()).sort((a, b) => b.priority - a.priority);
}

export function findById(id: string): Todo | undefined {
  return store.get(id);
}

export function create(data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Todo {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const todo: Todo = { ...data, id, createdAt: now, updatedAt: now };
  store.set(id, todo);
  return todo;
}

export function update(id: string, data: Partial<Omit<Todo, 'id' | 'createdAt'>>): Todo | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;
  const updated: Todo = {
    ...existing,
    ...data,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  return updated;
}

export function remove(id: string): boolean {
  return store.delete(id);
}
