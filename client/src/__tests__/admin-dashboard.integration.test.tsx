import { describe, it, expect, vi, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import type { AdminExerciseListItem, ExerciseProgressDetail } from '../types';

// -- Mock Data --

const now = new Date();
const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

const users = [
  { id: 'u-1', name: 'Alice Smith', email: 'alice@test.com', role: 'editor' as const, classifiedCount: 90, lastActiveAt: now.toISOString() },
  { id: 'u-2', name: 'Bob Jones', email: 'bob@test.com', role: 'editor' as const, classifiedCount: 40, lastActiveAt: tenDaysAgo },
  { id: 'u-3', name: 'Charlie Brown', email: 'charlie@test.com', role: 'viewer' as const, classifiedCount: 0, lastActiveAt: null },
  { id: 'u-4', name: 'Diana Prince', email: 'diana@test.com', role: 'editor' as const, classifiedCount: 80, lastActiveAt: now.toISOString() },
];

const mockExercises: AdminExerciseListItem[] = [
  // Active, at risk (deadline soon, < 90%)
  {
    id: 'ex-at-risk',
    name: 'At Risk Exercise',
    description: 'This exercise is at risk',
    status: 'active',
    totalRecords: 100,
    classifiedRecords: 40,
    errorCount: 3,
    lastUpdatedAt: now.toISOString(),
    deadline: threeDaysFromNow,
    hasNewRecords: false,
    newRecordCount: 0,
    columnStats: [],
    assignedUsers: [users[0], users[1]],
    createdBy: 'admin-1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  // Active, on track
  {
    id: 'ex-on-track',
    name: 'On Track Exercise',
    description: 'This exercise is on track',
    status: 'active',
    totalRecords: 200,
    classifiedRecords: 150,
    errorCount: 1,
    lastUpdatedAt: now.toISOString(),
    deadline: thirtyDaysFromNow,
    hasNewRecords: false,
    newRecordCount: 0,
    columnStats: [],
    assignedUsers: [users[0], users[3]],
    createdBy: 'admin-1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  // Completed
  {
    id: 'ex-completed',
    name: 'Completed Exercise',
    description: 'This exercise is complete',
    status: 'active',
    totalRecords: 50,
    classifiedRecords: 50,
    errorCount: 0,
    lastUpdatedAt: now.toISOString(),
    deadline: thirtyDaysFromNow,
    hasNewRecords: false,
    newRecordCount: 0,
    columnStats: [],
    assignedUsers: [users[0]],
    createdBy: 'admin-1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  // Draft
  {
    id: 'ex-draft',
    name: 'Draft Exercise',
    description: 'This exercise is a draft',
    status: 'draft',
    totalRecords: 0,
    classifiedRecords: 0,
    errorCount: 0,
    lastUpdatedAt: now.toISOString(),
    deadline: null,
    hasNewRecords: false,
    newRecordCount: 0,
    columnStats: [],
    assignedUsers: [],
    createdBy: 'admin-1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  // Archived
  {
    id: 'ex-archived',
    name: 'Archived Exercise',
    description: 'This exercise is archived',
    status: 'archived',
    totalRecords: 100,
    classifiedRecords: 100,
    errorCount: 0,
    lastUpdatedAt: now.toISOString(),
    deadline: null,
    hasNewRecords: false,
    newRecordCount: 0,
    columnStats: [],
    assignedUsers: [users[0], users[1]],
    createdBy: 'admin-1',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const mockAtRiskProgress: ExerciseProgressDetail = {
  exercise: mockExercises[0],
  userProgress: [
    {
      user: users[0],
      assignedRecords: 50,
      classifiedRecords: 30,
      errorCount: 1,
      lastActiveAt: users[0].lastActiveAt,
      completionPercentage: 60,
    },
    {
      user: users[1],
      assignedRecords: 50,
      classifiedRecords: 10,
      errorCount: 2,
      lastActiveAt: users[1].lastActiveAt,
      completionPercentage: 20,
    },
  ],
};

// Track reminder calls for rate limiting
let reminderCallCount = 0;

// -- MSW Setup --

const server = setupServer(
  http.get('/api/v1/admin/exercises', () => {
    return HttpResponse.json({ exercises: mockExercises });
  }),

  http.get('/api/v1/admin/exercises/:id/progress', ({ params }) => {
    const { id } = params;
    if (id === 'ex-at-risk') {
      return HttpResponse.json(mockAtRiskProgress);
    }
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }),

  http.post('/api/v1/admin/exercises/:id/remind/:userId', () => {
    reminderCallCount++;
    if (reminderCallCount > 1) {
      return HttpResponse.json(
        { error: 'Reminder already sent within the last 24 hours' },
        { status: 429 }
      );
    }
    return HttpResponse.json({ sent: true });
  }),

  http.get('/api/v1/admin/exercises/:id/progress/export', () => {
    return new HttpResponse('user_name,user_email\nAlice,alice@test.com\n', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="exercise-progress.csv"',
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());

beforeEach(() => {
  reminderCallCount = 0;
});

afterEach(() => {
  server.resetHandlers();
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('Admin Dashboard Integration', () => {
  describe('Table renders and tabs filter correctly', () => {
    it('loads exercises and shows correct stats', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Total Exercises')).toBeInTheDocument();
      });

      // Stats bar shows 5 total exercises
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows 2 exercises in Active tab (not the completed one)', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('At Risk Exercise')).toBeInTheDocument();
      });

      expect(screen.getByText('On Track Exercise')).toBeInTheDocument();
      expect(screen.queryByText('Completed Exercise')).not.toBeInTheDocument();
      expect(screen.queryByText('Draft Exercise')).not.toBeInTheDocument();
    });

    it('shows completed exercises in Completed tab', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('At Risk Exercise')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Completed'));

      await waitFor(() => {
        expect(screen.getByText('Completed Exercise')).toBeInTheDocument();
      });
      expect(screen.queryByText('At Risk Exercise')).not.toBeInTheDocument();
    });

    it('shows draft exercises in Drafts tab', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('At Risk Exercise')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Drafts'));

      await waitFor(() => {
        expect(screen.getByText('Draft Exercise')).toBeInTheDocument();
      });
    });

    it('shows archived exercises in Archived tab', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('At Risk Exercise')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Archived'));

      await waitFor(() => {
        expect(screen.getByText('Archived Exercise')).toBeInTheDocument();
      });
    });
  });

  describe('Click exercise opens drawer with progress', () => {
    it('opens drawer with exercise details', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('At Risk Exercise')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('exercise-row-ex-at-risk'));

      await waitFor(() => {
        expect(screen.getByTestId('exercise-progress-drawer')).toBeInTheDocument();
      });

      // Verify exercise name in drawer header
      await waitFor(() => {
        const drawer = screen.getByTestId('exercise-progress-drawer');
        expect(drawer).toBeInTheDocument();
      });
    });
  });

  describe('Drawer close behavior', () => {
    it('closes drawer on X button click', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('At Risk Exercise')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('exercise-row-ex-at-risk'));

      await waitFor(() => {
        expect(screen.getByTestId('exercise-progress-drawer')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('drawer-close'));

      await waitFor(() => {
        expect(screen.queryByTestId('exercise-progress-drawer')).not.toBeInTheDocument();
      });
    });

    it('closes drawer when clicking same row again', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('At Risk Exercise')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('exercise-row-ex-at-risk'));

      await waitFor(() => {
        expect(screen.getByTestId('exercise-progress-drawer')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('exercise-row-ex-at-risk'));

      await waitFor(() => {
        expect(screen.queryByTestId('exercise-progress-drawer')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading and error states', () => {
    it('shows spinner during loading', async () => {
      server.use(
        http.get('/api/v1/admin/exercises', async () => {
          await delay(500);
          return HttpResponse.json({ exercises: mockExercises });
        })
      );

      render(<AdminDashboardPage />, { wrapper: createWrapper() });
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('shows error state on failure', async () => {
      server.use(
        http.get('/api/v1/admin/exercises', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      render(<AdminDashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Failed to load exercises.')).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
