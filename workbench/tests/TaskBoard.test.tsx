import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TaskBoard } from '../src/pages/TaskBoard';
import * as api from '../src/api';

vi.mock('../src/api');

const mockTasks = [
  {
    taskId: 'task-001-add-login',
    workflow: 'feature-dev',
    status: 'in_progress' as const,
    currentStage: 'implement',
    stages: { plan: 'completed', implement: 'in_progress' },
    created: '2026-06-13T10:00:00Z',
    updated: '2026-06-13T11:00:00Z',
    repos: ['demo-todo'],
    humanReviewPending: false,
  },
  {
    taskId: 'task-002-fix-auth',
    workflow: 'bug-fix',
    status: 'pending' as const,
    currentStage: '',
    stages: {},
    created: '2026-06-13T09:00:00Z',
    updated: '2026-06-13T09:00:00Z',
    repos: ['demo-todo'],
    humanReviewPending: false,
  },
  {
    taskId: 'task-003-search',
    workflow: 'feature-dev',
    status: 'completed' as const,
    currentStage: 'deliver',
    stages: { plan: 'completed', implement: 'completed', review: 'completed', deliver: 'completed' },
    created: '2026-06-12T10:00:00Z',
    updated: '2026-06-13T08:00:00Z',
    repos: ['demo-todo'],
    humanReviewPending: true,
  },
];

describe('TaskBoard', () => {
  beforeEach(() => {
    vi.mocked(api.fetchTasks).mockReset();
  });

  it('renders loading state initially', () => {
    vi.mocked(api.fetchTasks).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <TaskBoard />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
  });

  it('renders task cards after loading', async () => {
    vi.mocked(api.fetchTasks).mockResolvedValue(mockTasks);
    render(
      <MemoryRouter>
        <TaskBoard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('task-001-add-login')).toBeInTheDocument();
    });
    expect(screen.getByText('task-002-fix-auth')).toBeInTheDocument();
    expect(screen.getByText('task-003-search')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    vi.mocked(api.fetchTasks).mockRejectedValue(new Error('Network error'));
    render(
      <MemoryRouter>
        <TaskBoard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Failed to load tasks/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('renders empty state when no tasks', async () => {
    vi.mocked(api.fetchTasks).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <TaskBoard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Task Board')).toBeInTheDocument();
    });
    expect(screen.getByText('No tasks in progress')).toBeInTheDocument();
    expect(screen.getByText('No pending tasks')).toBeInTheDocument();
    expect(screen.getByText('No completed tasks')).toBeInTheDocument();
  });
});
