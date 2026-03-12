// client/src/hooks/__tests__/useAutoSave.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAutoSave } from '../useAutoSave';
import { useSpreadsheetStore } from '../../stores/spreadsheetStore';

const mockClassify = vi.fn().mockResolvedValue({
  validationErrors: [],
  isFullyClassified: true,
  updatedStats: {
    totalRecords: 10, classifiedRecords: 5, unclassifiedRecords: 5,
    errorCount: 0, warningCount: 0, newRecordCount: 0,
    completionPercentage: 50, columnStats: [],
  },
});

vi.mock('../../api/exercises', () => ({
  classifyRecord: (...args: unknown[]) => mockClassify(...args),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSpreadsheetStore.getState().reset();
    vi.useFakeTimers();
  });

  it('debounces save calls by 300ms', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useAutoSave('ex1'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.save('r1', { values: [{ columnKey: 'sport', value: 'Baseball' }] });
    });

    // Should not fire immediately
    expect(mockClassify).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(() => expect(mockClassify).toHaveBeenCalledTimes(1), { timeout: 1000 });
  });

  it('returns isPending status', () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useAutoSave('ex1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isPending).toBe(false);
  });
});
