// client/src/components/grid/BooleanCellRenderer.tsx
import { forwardRef } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';

export const BooleanCellRenderer = forwardRef<HTMLDivElement, ICellRendererParams>(
  function BooleanCellRenderer(props, ref) {
    const value = props.value;
    const isTrue = value === 'true' || value === true;

    return (
      <div
        ref={ref}
        className="flex items-center justify-center w-full h-full"
      >
        <div
          className={[
            'w-8 h-4 rounded-full relative transition-colors',
            isTrue ? 'bg-amber-500' : 'bg-forge-700',
          ].join(' ')}
        >
          <div
            className={[
              'w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform',
              isTrue ? 'translate-x-4' : 'translate-x-0.5',
            ].join(' ')}
          />
        </div>
      </div>
    );
  }
);
