import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';
import type { AdminExerciseListItem } from '../../../types';

function createExercise(overrides: Partial<AdminExerciseListItem> = {}): AdminExerciseListItem {
  return {
    id: 'ex-1',
    name: 'Test',
    description: 'desc',
    status: 'active',
    totalRecords: 100,
    classifiedRecords: 50,
    errorCount: 0,
    lastUpdatedAt: '2026-03-01T00:00:00Z',
    deadline: '2026-06-01T00:00:00Z',
    hasNewRecords: false,
    newRecordCount: 0,
    columnStats: [],
    assignedUsers: [],
    createdBy: 'admin-1',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('StatusBadge', () => {
  it('shows "Complete" when fully classified with 0 errors', () => {
    const exercise = createExercise({ classifiedRecords: 100, totalRecords: 100, errorCount: 0 });
    render(<StatusBadge exercise={exercise} />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('shows "On Track" for active exercise with progress and deadline > 7 days away', () => {
    const futureDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const exercise = createExercise({ classifiedRecords: 50, totalRecords: 100, deadline: futureDeadline });
    render(<StatusBadge exercise={exercise} />);
    expect(screen.getByText('On Track')).toBeInTheDocument();
  });

  it('shows "At Risk" when deadline within 7 days and < 90% complete', () => {
    const soonDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const exercise = createExercise({ classifiedRecords: 50, totalRecords: 100, deadline: soonDeadline });
    render(<StatusBadge exercise={exercise} />);
    expect(screen.getByText('At Risk')).toBeInTheDocument();
  });

  it('shows "Overdue" when deadline is past and < 100% complete', () => {
    const pastDeadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const exercise = createExercise({ classifiedRecords: 50, totalRecords: 100, deadline: pastDeadline });
    render(<StatusBadge exercise={exercise} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('shows "Not Started" when 0% progress', () => {
    const exercise = createExercise({ classifiedRecords: 0, totalRecords: 100 });
    render(<StatusBadge exercise={exercise} />);
    expect(screen.getByText('Not Started')).toBeInTheDocument();
  });

  it('shows "Paused" when status is paused', () => {
    const exercise = createExercise({ status: 'paused', classifiedRecords: 50 });
    render(<StatusBadge exercise={exercise} />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('maps Complete to clean variant', () => {
    const exercise = createExercise({ classifiedRecords: 100, totalRecords: 100, errorCount: 0 });
    const { container } = render(<StatusBadge exercise={exercise} />);
    expect(container.querySelector('.bg-emerald-600\\/10')).toBeInTheDocument();
  });

  it('maps Overdue to error variant', () => {
    const pastDeadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const exercise = createExercise({ classifiedRecords: 50, totalRecords: 100, deadline: pastDeadline });
    const { container } = render(<StatusBadge exercise={exercise} />);
    expect(container.querySelector('.bg-red-600\\/10')).toBeInTheDocument();
  });
});
