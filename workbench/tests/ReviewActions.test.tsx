import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewActions from '../src/components/ReviewActions';
import * as api from '../src/api';

vi.mock('../src/api');

describe('ReviewActions', () => {
  beforeEach(() => {
    vi.mocked(api.submitReview).mockReset();
  });

  it('renders approve and reject buttons', () => {
    render(<ReviewActions taskId="task-001" onComplete={() => {}} />);
    expect(screen.getByText('✓ Approve')).toBeInTheDocument();
    expect(screen.getByText('✗ Reject')).toBeInTheDocument();
  });

  it('calls submitReview on approve', async () => {
    vi.mocked(api.submitReview).mockResolvedValue();
    render(<ReviewActions taskId="task-001" onComplete={() => {}} />);
    fireEvent.click(screen.getByText('✓ Approve'));
    await waitFor(() => {
      expect(api.submitReview).toHaveBeenCalledWith('task-001', 'approve', '');
    });
  });

  it('calls submitReview on reject with reason', async () => {
    vi.mocked(api.submitReview).mockResolvedValue();
    render(<ReviewActions taskId="task-002" onComplete={() => {}} />);

    const input = screen.getByPlaceholderText('Enter rejection reason...');
    fireEvent.change(input, { target: { value: 'Needs more tests' } });
    fireEvent.click(screen.getByText('✗ Reject'));

    await waitFor(() => {
      expect(api.submitReview).toHaveBeenCalledWith('task-002', 'reject', 'Needs more tests');
    });
  });

  it('reject button is disabled without reason', () => {
    render(<ReviewActions taskId="task-001" onComplete={() => {}} />);
    const rejectBtn = screen.getByText('✗ Reject');
    expect(rejectBtn).toBeDisabled();
  });

  it('shows result after submit', async () => {
    vi.mocked(api.submitReview).mockResolvedValue();
    render(<ReviewActions taskId="task-001" onComplete={() => {}} />);

    fireEvent.click(screen.getByText('✓ Approve'));

    await waitFor(() => {
      expect(screen.getByText(/Approved!/)).toBeInTheDocument();
    });
  });

  it('calls onComplete after successful submit', async () => {
    const onComplete = vi.fn();
    vi.mocked(api.submitReview).mockResolvedValue();

    render(<ReviewActions taskId="task-001" onComplete={onComplete} />);
    fireEvent.click(screen.getByText('✓ Approve'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
