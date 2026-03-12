import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserAvatarStack } from '../UserAvatarStack';
import type { AssignedUserSummary } from '../../../types';

function createUser(id: string, name: string): AssignedUserSummary {
  return {
    id,
    name,
    email: `${id}@test.com`,
    role: 'editor',
    classifiedCount: 10,
    lastActiveAt: '2026-03-10T00:00:00Z',
  };
}

describe('UserAvatarStack', () => {
  const twoUsers = [
    createUser('u-1', 'Alice Smith'),
    createUser('u-2', 'Bob Jones'),
  ];

  const fiveUsers = [
    createUser('u-1', 'Alice Smith'),
    createUser('u-2', 'Bob Jones'),
    createUser('u-3', 'Charlie Brown'),
    createUser('u-4', 'Diana Prince'),
    createUser('u-5', 'Eve Wilson'),
  ];

  it('renders 2 avatars and no overflow for 2 users', () => {
    render(<UserAvatarStack users={twoUsers} />);
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('BJ')).toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });

  it('renders 3 avatars + "+2" for 5 users with default maxVisible', () => {
    render(<UserAvatarStack users={fiveUsers} />);
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('BJ')).toBeInTheDocument();
    expect(screen.getByText('CB')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('DP')).not.toBeInTheDocument();
  });

  it('renders 1 avatar + "+4" with maxVisible=1 for 5 users', () => {
    render(<UserAvatarStack users={fiveUsers} maxVisible={1} />);
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('+4')).toBeInTheDocument();
    expect(screen.queryByText('BJ')).not.toBeInTheDocument();
  });

  it('derives initials correctly from names', () => {
    const users = [createUser('u-1', 'John Doe')];
    render(<UserAvatarStack users={users} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
