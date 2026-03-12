import type { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  children?: ReactNode;
}

export function TopBar({ title, children }: TopBarProps) {
  return (
    <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between shrink-0">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
