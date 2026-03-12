import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, error, className, ...props }, ref) => {
    const classes = [
      'w-full bg-forge-850 border rounded text-forge-50 text-sm px-3 py-2',
      'focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error ? 'border-red-500/50' : 'border-forge-700',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div>
        <select ref={ref} className={classes} {...props}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
