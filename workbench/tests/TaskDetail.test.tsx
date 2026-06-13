import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TaskDetail from '../src/pages/TaskDetail';
import * as api from '../src/api';

vi.mock('../src/api');

const mockTask = {
  taskId: 'task-001-add-login',
  workflow: 'feature-dev',
  status: 'in_progress' as const,
  currentStage: 'implement',
  stages: { plan: 'completed', implement: 'in_progress' },
  created: '2026-06-13T10:00:00Z',
  updated: '2026-06-13T11:00:00Z',
  repos: ['demo-todo'],
  humanReviewPending: false,
};

describe('TaskDetail', () => {
  beforeEach(() => {
    vi.mocked(api.fetchTask).mockReset();
    vi.mocked(api.fetchArtifacts).mockReset();
    vi.mocked(api.fetchArtifact).mockReset();
  });

  it('renders loading state initially', () => {
    vi.mocked(api.fetchTask).mockResolvedValue(mockTask);
    vi.mocked(api.fetchArtifacts).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/tasks/task-001-add-login']}>
        <Routes>
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders task metadata after loading', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(mockTask);
    vi.mocked(api.fetchArtifacts).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/tasks/task-001-add-login']}>
        <Routes>
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('task-001-add-login')).toBeInTheDocument();
    });
    expect(screen.getByText('feature-dev')).toBeInTheDocument();
    expect(screen.getByText('implement')).toBeInTheDocument();
  });

  it('shows error for unknown task', async () => {
    vi.mocked(api.fetchTask).mockRejectedValue(new Error('Task not found'));
    vi.mocked(api.fetchArtifacts).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/tasks/unknown']}>
        <Routes>
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Task not found')).toBeInTheDocument();
    });
  });

  it('renders artifacts list when available', async () => {
    const mockArtifacts = [
      { name: 'SPEC.md', size: 1024 },
      { name: 'PLAN.md', size: 2048 },
    ];
    vi.mocked(api.fetchTask).mockResolvedValue(mockTask);
    vi.mocked(api.fetchArtifacts).mockResolvedValue(mockArtifacts);
    vi.mocked(api.fetchArtifact).mockResolvedValue('# Test content');

    render(
      <MemoryRouter initialEntries={['/tasks/task-001-add-login']}>
        <Routes>
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('SPEC.md')).toBeInTheDocument();
    });
    expect(screen.getByText('PLAN.md')).toBeInTheDocument();
  });
});
