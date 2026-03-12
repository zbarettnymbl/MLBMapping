// client/src/hooks/__tests__/useExerciseRecords.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useExerciseRecords } from '../useExerciseRecords';
import { useSpreadsheetStore } from '../../stores/spreadsheetStore';

vi.mock('../../api/exercises', () => ({
  fetchExerciseRecords: vi.fn().mockResolvedValue({
    records: [{ id: 'r1', sourceData: {}, classifications: {}, recordState: 'new', validationErrors: [], isFullyClassified: false }],
    total: 1,
    page: 1,
    pageSize: 50,
    stats: { totalRecords: 1, classifiedRecords: 0, unclassifiedRecords: 1, errorCount: 0, warningCount: 0, newRecordCount: 1, completionPercentage: 0, columnStats: [] },
  }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('useExerciseRecords', () => {
  beforeEach(() => {
    useSpreadsheetStore.getState().reset();
  });

  it('returns paginated records', async () => {
    const { result } = renderHook(() => useExerciseRecords('ex1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.records).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });

  it('includes store params in query key', async () => {
    useSpreadsheetStore.getState().setFilter('errors');
    useSpreadsheetStore.getState().setPage(2);
    const { result } = renderHook(() => useExerciseRecords('ex1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
