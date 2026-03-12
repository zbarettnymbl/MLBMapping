import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  heading: string;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ icon, heading, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-muted-foreground mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{heading}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{body}</p>
      {action}
    </div>
  );
}
