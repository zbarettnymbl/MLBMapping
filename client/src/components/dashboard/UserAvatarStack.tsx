import { forwardRef } from 'react';
import type { AssignedUserSummary } from '../../types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div ref={ref} className="flex items-center">
              {visible.map((user, index) => (
                <Avatar
                  key={user.id}
                  className={cn(
                    'h-7 w-7 border-2 border-background',
                    index > 0 && '-ml-2'
                  )}
                >
                  <AvatarFallback className="text-xs font-medium">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {overflow > 0 && (
                <Avatar className="h-7 w-7 border-2 border-background -ml-2">
                  <AvatarFallback className="text-xs font-medium text-muted-foreground">
                    +{overflow}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{allNames}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);
