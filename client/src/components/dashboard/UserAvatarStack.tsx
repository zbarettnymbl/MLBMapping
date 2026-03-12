import { forwardRef } from 'react';
import type { AssignedUserSummary } from '../../types';
import { Tooltip } from '../common/Tooltip';

interface UserAvatarStackProps {
  users: AssignedUserSummary[];
  maxVisible?: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const UserAvatarStack = forwardRef<HTMLDivElement, UserAvatarStackProps>(
  function UserAvatarStack({ users, maxVisible = 3 }, ref) {
    const visible = users.slice(0, maxVisible);
    const overflow = users.length - maxVisible;
    const allNames = users.map((u) => u.name).join(', ');

    return (
      <Tooltip content={allNames}>
        <div ref={ref} className={['flex items-center'].join(' ')}>
          {visible.map((user, index) => (
            <div
              key={user.id}
              className={[
                'w-7 h-7 rounded-full border-2 border-forge-900',
                'bg-forge-700 text-forge-200 text-xs font-medium',
                'flex items-center justify-center',
                index > 0 ? '-ml-2' : '',
              ].join(' ')}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {overflow > 0 && (
            <div
              className={[
                'w-7 h-7 rounded-full border-2 border-forge-900',
                'bg-forge-700 text-forge-300 text-xs font-medium',
                'flex items-center justify-center -ml-2',
              ].join(' ')}
            >
              +{overflow}
            </div>
          )}
        </div>
      </Tooltip>
    );
  }
);
