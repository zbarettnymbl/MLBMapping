import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProgressCard } from '../UserProgressCard';
import type { UserProgress } from '../../../types';

function createProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    user: {
      id: 'u-1',
      name: 'Alice Smith',
      email: 'alice@test.com',
      role: 'editor',
      classifiedCount: 30,
      lastActiveAt: new Date().toISOString(),
    },
    assignedRecords: 50,
    classifiedRecords: 45,
    errorCount: 0,
    lastActiveAt: new Date().toISOString(),
    completionPercentage: 90,
    ...overrides,
  };
}

describe('UserProgressCard', () => {
  it('does not show reminder button for on-track user', () => {
    const progress = createProgress({
      classifiedRecords: 45,
      assignedRecords: 50,
      lastActiveAt: new Date().toISOString(),
    });
    render(
      <UserProgressCard
        progress={progress}
        exerciseAvgCompletion={80}
        onSendReminder={vi.fn()}
      />
    );
    expect(screen.queryByText('Send Reminder')).not.toBeInTheDocument();
  });

  it('shows reminder button for user below average completion', () => {
    const progress = createProgress({
      classifiedRecords: 10,
      assignedRecords: 50,
      lastActiveAt: new Date().toISOString(),
    });
    render(
      <UserProgressCard
        progress={progress}
        exerciseAvgCompletion={80}
        onSendReminder={vi.fn()}
      />
    );
    expect(screen.getByText('Send Reminder')).toBeInTheDocument();
  });

  it('shows "Never logged in" in amber for user who never logged in', () => {
    const progress = createProgress({
      lastActiveAt: null,
      user: {
        id: 'u-2',
        name: 'Bob Jones',
        email: 'bob@test.com',
        role: 'viewer',
        classifiedCount: 0,
        lastActiveAt: null,
      },
    });
    render(
      <UserProgressCard
        progress={progress}
        exerciseAvgCompletion={50}
        onSendReminder={vi.fn()}
      />
    );
    const neverText = screen.getByText('Never logged in');
    expect(neverText).toBeInTheDocument();
    expect(neverText.className).toContain('text-amber-400');
  });

  it('shows days inactive in amber for user inactive > 7 days', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const progress = createProgress({
      lastActiveAt: tenDaysAgo,
    });
    render(
      <UserProgressCard
        progress={progress}
        exerciseAvgCompletion={50}
        onSendReminder={vi.fn()}
      />
    );
    const inactiveText = screen.getByText(/days inactive/);
    expect(inactiveText).toBeInTheDocument();
    expect(inactiveText.className).toContain('text-amber-400');
  });

  it('calls onSendReminder with correct userId', () => {
    const onSend = vi.fn();
    const progress = createProgress({
      classifiedRecords: 5,
      assignedRecords: 50,
      lastActiveAt: new Date().toISOString(),
    });
    render(
      <UserProgressCard
        progress={progress}
        exerciseAvgCompletion={80}
        onSendReminder={onSend}
      />
    );
    fireEvent.click(screen.getByText('Send Reminder'));
    expect(onSend).toHaveBeenCalledWith('u-1');
  });

  it('displays role badge correctly', () => {
    const progress = createProgress({
      user: {
        id: 'u-1',
        name: 'Alice',
        email: 'a@t.com',
        role: 'viewer',
        classifiedCount: 10,
        lastActiveAt: new Date().toISOString(),
      },
    });
    render(
      <UserProgressCard
        progress={progress}
        exerciseAvgCompletion={50}
        onSendReminder={vi.fn()}
      />
    );
    expect(screen.getByText('viewer')).toBeInTheDocument();
  });
});
