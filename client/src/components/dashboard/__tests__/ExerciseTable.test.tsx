import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseTable } from '../ExerciseTable';
import type { AdminExerciseListItem } from '../../../types';

function createExercise(overrides: Partial<AdminExerciseListItem> = {}): AdminExerciseListItem {
  return {
    id: 'ex-1',
    name: 'Test Exercise',
    description: 'A test exercise description',
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

describe('ExerciseTable', () => {
  const exercises: AdminExerciseListItem[] = [
    createExercise({ id: 'active-1', name: 'Active One', status: 'active', classifiedRecords: 50, totalRecords: 100, errorCount: 2 }),
    createExercise({ id: 'active-2', name: 'Active Two', status: 'active', classifiedRecords: 70, totalRecords: 100 }),
    createExercise({ id: 'completed-1', name: 'Completed One', status: 'active', classifiedRecords: 100, totalRecords: 100, errorCount: 0 }),
    createExercise({ id: 'draft-1', name: 'Draft One', status: 'draft', classifiedRecords: 0, totalRecords: 50 }),
    createExercise({ id: 'archived-1', name: 'Archived One', status: 'archived', classifiedRecords: 200, totalRecords: 200 }),
  ];

  const defaultProps = {
    exercises,
    activeTab: 'active' as const,
    onTabChange: vi.fn(),
    selectedExerciseId: null,
    onSelectExercise: vi.fn(),
  };

  it('shows active exercises (excluding completed) in active tab', () => {
    render(<ExerciseTable {...defaultProps} />);
    expect(screen.getByText('Active One')).toBeInTheDocument();
    expect(screen.getByText('Active Two')).toBeInTheDocument();
    expect(screen.queryByText('Completed One')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft One')).not.toBeInTheDocument();
  });

  it('shows completed exercises in completed tab', () => {
    render(<ExerciseTable {...defaultProps} activeTab="completed" />);
    expect(screen.getByText('Completed One')).toBeInTheDocument();
    expect(screen.queryByText('Active One')).not.toBeInTheDocument();
  });

  it('shows draft exercises in draft tab', () => {
    render(<ExerciseTable {...defaultProps} activeTab="draft" />);
    expect(screen.getByText('Draft One')).toBeInTheDocument();
    expect(screen.queryByText('Active One')).not.toBeInTheDocument();
  });

  it('shows archived exercises in archived tab', () => {
    render(<ExerciseTable {...defaultProps} activeTab="archived" />);
    expect(screen.getByText('Archived One')).toBeInTheDocument();
    expect(screen.queryByText('Active One')).not.toBeInTheDocument();
  });

  it('displays correct tab badge counts', () => {
    render(<ExerciseTable {...defaultProps} />);
    // Active tab should show count 2 (active-1, active-2; completed-1 is filtered out)
    const activeTab = screen.getByText('Active');
    expect(activeTab.parentElement?.textContent).toContain('2');
  });

  it('calls onSelectExercise with exercise id on row click', () => {
    const onSelect = vi.fn();
    render(<ExerciseTable {...defaultProps} onSelectExercise={onSelect} />);
    fireEvent.click(screen.getByTestId('exercise-row-active-1'));
    expect(onSelect).toHaveBeenCalledWith('active-1');
  });

  it('calls onSelectExercise(null) when clicking the same row again', () => {
    const onSelect = vi.fn();
    render(<ExerciseTable {...defaultProps} selectedExerciseId="active-1" onSelectExercise={onSelect} />);
    fireEvent.click(screen.getByTestId('exercise-row-active-1'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('shows border-amber-500 on selected row', () => {
    render(<ExerciseTable {...defaultProps} selectedExerciseId="active-1" />);
    const row = screen.getByTestId('exercise-row-active-1');
    expect(row.className).toContain('border-amber-500');
  });
});
