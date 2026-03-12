import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminStatsBar } from '../AdminStatsBar';
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

describe('AdminStatsBar', () => {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

  const exercises: AdminExerciseListItem[] = [
    createExercise({ id: 'ex-1', status: 'active', classifiedRecords: 50, totalRecords: 100 }),
    createExercise({ id: 'ex-2', status: 'active', classifiedRecords: 100, totalRecords: 100 }),
    createExercise({ id: 'ex-3', status: 'draft', classifiedRecords: 0, totalRecords: 50 }),
    createExercise({
      id: 'ex-4',
      status: 'active',
      classifiedRecords: 10,
      totalRecords: 100,
      deadline: threeDaysFromNow,
    }),
    createExercise({ id: 'ex-5', status: 'archived', classifiedRecords: 200, totalRecords: 200 }),
    createExercise({
      id: 'ex-6',
      status: 'active',
      classifiedRecords: 80,
      totalRecords: 100,
      assignedUsers: [
        { id: 'u-1', name: 'Inactive User', email: 'u@t.com', role: 'editor', classifiedCount: 10, lastActiveAt: tenDaysAgo },
      ],
    }),
  ];

  it('renders total count matching exercises.length', () => {
    render(<AdminStatsBar exercises={exercises} />);
    expect(screen.getByText('Total Exercises')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders active count filtering correctly', () => {
    render(<AdminStatsBar exercises={exercises} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders at-risk count and highlights when > 0', () => {
    render(<AdminStatsBar exercises={exercises} />);
    expect(screen.getByText('At Risk')).toBeInTheDocument();
    // ex-4 has deadline within 7 days and < 90% complete
    // ex-6 has an inactive user
    const atRiskValue = screen.getByText('At Risk').closest('div')?.parentElement;
    const valueEl = atRiskValue?.querySelector('.text-amber-400');
    expect(valueEl).toBeInTheDocument();
  });

  it('renders at-risk with no amber styling when count is 0', () => {
    const safeExercises = [
      createExercise({ id: 'ex-1', status: 'active', classifiedRecords: 100, totalRecords: 100 }),
    ];
    render(<AdminStatsBar exercises={safeExercises} />);
    const atRiskLabel = screen.getByText('At Risk');
    const card = atRiskLabel.closest('div')?.parentElement;
    const valueEl = card?.querySelector('.text-amber-400');
    expect(valueEl).not.toBeInTheDocument();
  });

  it('renders totalClassified as sum of all classifiedRecords', () => {
    render(<AdminStatsBar exercises={exercises} />);
    expect(screen.getByText('Records Classified')).toBeInTheDocument();
    // 50 + 100 + 0 + 10 + 200 + 80 = 440
    expect(screen.getByText('440')).toBeInTheDocument();
  });
});
