import type { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  children?: ReactNode;
}

export function TopBar({ title, children }: TopBarProps) {
  return (
    <div className="h-14 bg-forge-900 border-b border-forge-700 px-6 flex items-center justify-between shrink-0">
      <h1 className="text-lg font-semibold text-forge-100">{title}</h1>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
