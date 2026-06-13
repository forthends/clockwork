import { describe, it, expect } from 'vitest';
import { validateCreate, validateUpdate } from '../src/validators.js';

describe('validateCreate', () => {
  it('passes valid body', () => {
    expect(validateCreate({ title: 'Test', priority: 1, status: 'todo' })).toEqual([]);
  });

  it('rejects missing title', () => {
    const errors = validateCreate({});
    expect(errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('rejects empty title', () => {
    const errors = validateCreate({ title: '  ' });
    expect(errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('rejects non-string title', () => {
    const errors = validateCreate({ title: 123 });
    expect(errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('rejects non-string description', () => {
    const errors = validateCreate({ title: 'Test', description: 123 });
    expect(errors.some((e) => e.field === 'description')).toBe(true);
  });

  it('rejects non-number priority', () => {
    const errors = validateCreate({ title: 'Test', priority: 'high' });
    expect(errors.some((e) => e.field === 'priority')).toBe(true);
  });

  it('rejects invalid status', () => {
    const errors = validateCreate({ title: 'Test', status: 'garbage' });
    expect(errors.some((e) => e.field === 'status')).toBe(true);
  });

  it('rejects empty string status', () => {
    const errors = validateCreate({ title: 'Test', status: '' });
    expect(errors.some((e) => e.field === 'status')).toBe(true);
  });

  it('accepts valid status values', () => {
    expect(validateCreate({ title: 'T', status: 'todo' })).toEqual([]);
    expect(validateCreate({ title: 'T', status: 'in_progress' })).toEqual([]);
    expect(validateCreate({ title: 'T', status: 'done' })).toEqual([]);
  });
});

describe('validateUpdate', () => {
  it('passes valid partial body', () => {
    expect(validateUpdate({ title: 'Updated' })).toEqual([]);
  });

  it('rejects empty string title', () => {
    const errors = validateUpdate({ title: '' });
    expect(errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('rejects invalid status', () => {
    const errors = validateUpdate({ status: 'invalid' });
    expect(errors.some((e) => e.field === 'status')).toBe(true);
  });

  it('rejects empty string status', () => {
    const errors = validateUpdate({ status: '' });
    expect(errors.some((e) => e.field === 'status')).toBe(true);
  });

  it('returns empty errors for empty body (allowed for PATCH)', () => {
    expect(validateUpdate({})).toEqual([]);
  });
});
