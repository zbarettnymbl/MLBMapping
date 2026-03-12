import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  Table2,
  GitBranch,
  Database,
  Search,
  Key,
  LogOut,
  Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavSection {
  label?: string;
  roles: Array<'admin' | 'user'>;
  items: NavItem[];
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  matchPaths?: string[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    roles: ['user'],
    items: [
      { to: '/dashboard', label: 'My Assignments', icon: ClipboardList },
    ],
  },
  {
    roles: ['admin'],
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Data',
    roles: ['admin'],
    items: [
      {
        to: '/exercises',
        label: 'Exercises',
        icon: Table2,
        matchPaths: ['/exercises', '/exercises/new'],
      },
      {
        to: '/pipelines',
        label: 'Pipelines',
        icon: GitBranch,
        matchPaths: ['/pipelines', '/pipelines/new'],
      },
      {
        to: '/reference-tables',
        label: 'Reference Tables',
        icon: Database,
      },
      {
        to: '/bigquery-explorer',
        label: 'BigQuery Explorer',
        icon: Search,
      },
    ],
  },
  {
    label: 'Settings',
    roles: ['admin'],
    items: [
      { to: '/credentials', label: 'Connections', icon: Key },
    ],
  },
];

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.matchPaths) {
    return item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }
  return pathname === item.to || pathname.startsWith(item.to + '/');
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const role = user?.role ?? 'user';

  const sections = NAV_SECTIONS.filter((s) => s.roles.includes(role as 'admin' | 'user'));

  return (
    <aside className="w-52 bg-card border-r border-border flex flex-col shrink-0">
      {/* Brand */}
      <div className="h-14 flex items-center px-5 border-b border-border gap-2.5">
        <div className="w-7 h-7 rounded bg-primary/15 flex items-center justify-center">
          <Flame className="w-4 h-4 text-primary" />
        </div>
        <span className="text-base font-semibold text-foreground tracking-tight">MapForge</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2.5 space-y-5 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isItemActive(item, location.pathname);
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all duration-150 ${
                      active
                        ? 'bg-primary/10 text-primary shadow-[inset_2px_0_0_0] shadow-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className={active ? 'text-primary' : 'text-muted-foreground'}>
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground uppercase">
              {user.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
