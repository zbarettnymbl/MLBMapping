// client/src/components/grid/SourceColumnHeader.tsx
import { forwardRef } from 'react';
import type { IHeaderParams } from 'ag-grid-community';
import { Lock } from 'lucide-react';
import type { ExerciseColumn } from '@mapforge/shared/types';

interface SourceColumnHeaderProps extends IHeaderParams {
  exerciseColumn: ExerciseColumn;
}

export const SourceColumnHeader = forwardRef<HTMLDivElement, SourceColumnHeaderProps>(
  function SourceColumnHeader(props, ref) {
    const col = props.exerciseColumn;

    return (
      <div
        ref={ref}
        className={[
          'flex items-center gap-1.5 px-2 w-full h-full',
          'text-forge-400 text-xs font-medium uppercase tracking-wide',
        ].join(' ')}
        title={col.description || col.label}
      >
        <Lock size={12} className="text-forge-500 shrink-0" />
        <span className="truncate">{props.displayName}</span>
      </div>
    );
  }
);
