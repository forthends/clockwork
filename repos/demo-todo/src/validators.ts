import { TodoStatus } from './models.js';

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_STATUSES: TodoStatus[] = ['todo', 'in_progress', 'done'];

export function validateCreate(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required and must be a non-empty string' });
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }
  if (body.priority !== undefined && typeof body.priority !== 'number') {
    errors.push({ field: 'priority', message: 'Priority must be a number' });
  }
  if (body.status && !VALID_STATUSES.includes(body.status as TodoStatus)) {
    errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  return errors;
}

export function validateUpdate(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length === 0)) {
    errors.push({ field: 'title', message: 'Title must be a non-empty string' });
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }
  if (body.priority !== undefined && typeof body.priority !== 'number') {
    errors.push({ field: 'priority', message: 'Priority must be a number' });
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status as TodoStatus)) {
    errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  return errors;
}
