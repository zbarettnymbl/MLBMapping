import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, error, className, ...props }, ref) => {
    const classes = [
      'w-full bg-forge-850 border rounded text-forge-50 text-sm',
      'placeholder:text-forge-600',
      'focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error ? 'border-red-500/50' : 'border-forge-700',
      icon ? 'pl-9 pr-3 py-2' : 'px-3 py-2',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-500">
            {icon}
          </div>
        )}
        <input ref={ref} className={classes} {...props} />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
