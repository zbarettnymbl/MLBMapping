import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { AdminDashboardPage } from '../AdminDashboardPage';
import type { AdminExerciseListItem } from '../../types';

const mockUseAllExercises = vi.fn();
const mockUseExerciseProgress = vi.fn();
const mockUseSendReminder = vi.fn();

vi.mock('../../hooks/useAdmin', () => ({
  useAllExercises: () => mockUseAllExercises(),
  useExerciseProgress: (...args: unknown[]) => mockUseExerciseProgress(...args),
  useSendReminder: () => mockUseSendReminder(),
}));

vi.mock('../../api/admin', () => ({
  exportProgressCsv: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'text/csv' })),
}));

function createExercise(overrides: Partial<AdminExerciseListItem> = {}): AdminExerciseListItem {
  return {
    id: 'ex-1',
    name: 'Test Exercise',
    description: 'desc',
    status: 'active',
    totalRecords: 100,
    classifiedRecords: 50,
    errorCount: 2,
    lastUpdatedAt: '2026-03-01T00:00:00Z',
    deadline: '2026-06-01T00:00:00Z',
    hasNewRecords: false,
    newRecordCount: 0,
    columnStats: [],
    assignedUsers: [
      { id: 'u-1', name: 'Alice', email: 'alice@test.com', role: 'editor', classifiedCount: 30, lastActiveAt: '2026-03-10T00:00:00Z' },
    ],
    createdBy: 'admin-1',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSendReminder.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      variables: null,
    });
  });

  it('renders loading spinner', () => {
    mockUseAllExercises.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const refetch = vi.fn();
    mockUseAllExercises.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<AdminDashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Failed to load exercises.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders exercises in stats bar and table', () => {
    const exercises = [
      createExercise({ id: 'ex-1', name: 'Exercise One' }),
      createExercise({ id: 'ex-2', name: 'Exercise Two' }),
    ];
    mockUseAllExercises.mockReturnValue({
      data: exercises,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Total Exercises')).toBeInTheDocument();
    expect(screen.getByText('Exercise One')).toBeInTheDocument();
    expect(screen.getByText('Exercise Two')).toBeInTheDocument();
  });

  it('opens drawer when clicking a table row', () => {
    const exercises = [createExercise({ id: 'ex-1', name: 'Exercise One' })];
    mockUseAllExercises.mockReturnValue({
      data: exercises,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUseExerciseProgress.mockReturnValue({
      data: {
        exercise: exercises[0],
        userProgress: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId('exercise-row-ex-1'));
    expect(screen.getByTestId('exercise-progress-drawer')).toBeInTheDocument();
  });

  it('closes drawer when clicking close button', () => {
    const exercises = [createExercise({ id: 'ex-1', name: 'Exercise One' })];
    mockUseAllExercises.mockReturnValue({
      data: exercises,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUseExerciseProgress.mockReturnValue({
      data: {
        exercise: exercises[0],
        userProgress: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId('exercise-row-ex-1'));
    expect(screen.getByTestId('exercise-progress-drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('drawer-close'));
    expect(screen.queryByTestId('exercise-progress-drawer')).not.toBeInTheDocument();
  });

  it('closes drawer when clicking same row again', () => {
    const exercises = [createExercise({ id: 'ex-1', name: 'Exercise One' })];
    mockUseAllExercises.mockReturnValue({
      data: exercises,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUseExerciseProgress.mockReturnValue({
      data: {
        exercise: exercises[0],
        userProgress: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId('exercise-row-ex-1'));
    expect(screen.getByTestId('exercise-progress-drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('exercise-row-ex-1'));
    expect(screen.queryByTestId('exercise-progress-drawer')).not.toBeInTheDocument();
  });
});
