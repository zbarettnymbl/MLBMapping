import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from '@/components/common/NotificationBell';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

interface AppLayoutProps {
  title?: string;
  children: ReactNode;
  topBarExtra?: ReactNode;
}

export function AppLayout({ title, children, topBarExtra }: AppLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <div className="flex items-center gap-3">
            {topBarExtra}
            <ThemeToggle />
            <NotificationBell />
            {user && <UserAvatar user={user} size="sm" showDropdown />}
          </div>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
