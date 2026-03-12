// client/src/components/grid/CellErrorPopover.tsx
import { forwardRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CellError } from '@mapforge/shared/types';

interface CellErrorPopoverProps {
  errors: CellError[];
  style?: React.CSSProperties;
}

export const CellErrorPopover = forwardRef<HTMLDivElement, CellErrorPopoverProps>(
  function CellErrorPopover({ errors, style }, ref) {
    if (errors.length === 0) return null;

    return (
      <div
        ref={ref}
        style={style}
        className={[
          'bg-forge-800 border rounded-md p-2 shadow-lg z-50',
          'border-status-error/30',
        ].join(' ')}
      >
        {errors.map((err, i) => (
          <div key={i} className="flex gap-2 items-start py-0.5">
            <AlertTriangle
              size={12}
              className={[
                'shrink-0 mt-0.5',
                err.severity === 'error' ? 'text-status-error' : 'text-amber-400',
              ].join(' ')}
            />
            <span className="text-sm text-forge-200">{err.message}</span>
          </div>
        ))}
      </div>
    );
  }
);
