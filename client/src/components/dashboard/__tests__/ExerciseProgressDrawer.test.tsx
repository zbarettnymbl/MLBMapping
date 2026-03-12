import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { ExerciseProgressDrawer } from '../ExerciseProgressDrawer';
import type { ExerciseProgressDetail } from '../../../types';

const mockProgressDetail: ExerciseProgressDetail = {
  exercise: {
    id: 'ex-1',
    name: 'Dev Programming 2026',
    description: 'Test exercise',
    status: 'active',
    totalRecords: 342,
    classifiedRecords: 267,
    errorCount: 3,
    lastUpdatedAt: '2026-03-10T12:00:00Z',
    deadline: '2026-04-15T00:00:00Z',
    hasNewRecords: false,
    newRecordCount: 0,
    columnStats: [],
    assignedUsers: [
      { id: 'u-1', name: 'Sarah', email: 'sarah@test.com', role: 'editor', classifiedCount: 180, lastActiveAt: '2026-03-09T00:00:00Z' },
      { id: 'u-2', name: 'Mike', email: 'mike@test.com', role: 'editor', classifiedCount: 87, lastActiveAt: '2026-03-06T00:00:00Z' },
    ],
    createdBy: 'admin-1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  userProgress: [
    {
      user: { id: 'u-1', name: 'Sarah', email: 'sarah@test.com', role: 'editor', classifiedCount: 180, lastActiveAt: '2026-03-09T00:00:00Z' },
      assignedRecords: 200,
      classifiedRecords: 180,
      errorCount: 1,
      lastActiveAt: '2026-03-09T00:00:00Z',
      completionPercentage: 90,
    },
    {
      user: { id: 'u-2', name: 'Mike', email: 'mike@test.com', role: 'editor', classifiedCount: 87, lastActiveAt: '2026-03-06T00:00:00Z' },
      assignedRecords: 142,
      classifiedRecords: 87,
      errorCount: 2,
      lastActiveAt: '2026-03-06T00:00:00Z',
      completionPercentage: 61,
    },
  ],
};

const mockUseExerciseProgress = vi.fn();
const mockUseSendReminder = vi.fn();

vi.mock('../../../hooks/useAdmin', () => ({
  useExerciseProgress: (...args: unknown[]) => mockUseExerciseProgress(...args),
  useSendReminder: () => mockUseSendReminder(),
}));

vi.mock('../../../api/admin', () => ({
  exportProgressCsv: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'text/csv' })),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('ExerciseProgressDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSendReminder.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      variables: null,
    });
  });

  it('renders loading state with spinner', () => {
    mockUseExerciseProgress.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ExerciseProgressDrawer exerciseId="ex-1" onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders stats on success', () => {
    mockUseExerciseProgress.mockReturnValue({
      data: mockProgressDetail,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ExerciseProgressDrawer exerciseId="ex-1" onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Dev Programming 2026')).toBeInTheDocument();
    expect(screen.getByText('267')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument(); // remaining
    expect(screen.getByText('3')).toBeInTheDocument(); // errors
  });

  it('renders user progress cards', () => {
    mockUseExerciseProgress.mockReturnValue({
      data: mockProgressDetail,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ExerciseProgressDrawer exerciseId="ex-1" onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Sarah')).toBeInTheDocument();
    expect(screen.getByText('Mike')).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const refetch = vi.fn();
    mockUseExerciseProgress.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<ExerciseProgressDrawer exerciseId="ex-1" onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Failed to load progress details.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders empty state when no users assigned', () => {
    mockUseExerciseProgress.mockReturnValue({
      data: {
        exercise: mockProgressDetail.exercise,
        userProgress: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ExerciseProgressDrawer exerciseId="ex-1" onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('No users assigned to this exercise.')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    mockUseExerciseProgress.mockReturnValue({
      data: mockProgressDetail,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const onClose = vi.fn();
    render(<ExerciseProgressDrawer exerciseId="ex-1" onClose={onClose} />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId('drawer-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('has export CSV button', () => {
    mockUseExerciseProgress.mockReturnValue({
      data: mockProgressDetail,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ExerciseProgressDrawer exerciseId="ex-1" onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByTestId('export-csv-btn')).toBeInTheDocument();
  });
});
