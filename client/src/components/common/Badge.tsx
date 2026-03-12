import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

type BadgeVariant =
  | 'default'
  | 'amber'
  | 'cyan'
  | 'error'
  | 'warning'
  | 'clean'
  | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-forge-800 text-forge-300 border border-forge-700',
  amber: 'bg-amber-600/10 text-amber-400 border border-amber-500/30',
  cyan: 'bg-cyan-600/10 text-cyan-400 border border-cyan-500/30',
  error: 'bg-red-600/10 text-red-400 border border-red-600/30',
  warning: 'bg-amber-600/10 text-amber-400 border border-amber-500/30',
  clean: 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30',
  outline: 'bg-transparent text-forge-400 border border-forge-600',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    const classes = [
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
