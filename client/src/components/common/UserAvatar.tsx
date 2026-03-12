import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

interface UserAvatarProps {
  user: { name: string; avatarUrl: string | null };
  size?: 'sm' | 'md';
  showDropdown?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserAvatar({ user, size = 'sm', showDropdown = false }: UserAvatarProps) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const avatar = user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.name}
      className={['rounded-full object-cover', sizeClasses[size]].join(' ')}
    />
  ) : (
    <div
      className={[
        'rounded-full bg-forge-700 text-forge-300 font-medium flex items-center justify-center',
        sizeClasses[size],
      ].join(' ')}
    >
      {getInitials(user.name)}
    </div>
  );

  if (!showDropdown) return avatar;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="focus:outline-none">
        {avatar}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-forge-850 border border-forge-700 rounded-md shadow-xl z-50">
          <div className="px-3 py-2 border-b border-forge-700">
            <p className="text-sm font-medium text-forge-100">{user.name}</p>
          </div>
          <div className="py-1">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-forge-300 hover:bg-forge-800 hover:text-forge-100"
              onClick={() => {
                setOpen(false);
              }}
            >
              <User size={14} />
              Profile
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-forge-300 hover:bg-forge-800 hover:text-forge-100"
              onClick={() => {
                logout();
                setOpen(false);
              }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
