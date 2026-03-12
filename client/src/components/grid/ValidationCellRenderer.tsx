// client/src/components/grid/ValidationCellRenderer.tsx
import { forwardRef, useState, useRef } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import { AlertTriangle } from 'lucide-react';
import { CellErrorPopover } from './CellErrorPopover';
import type { ExerciseColumn, EnrichmentRecord, CellError } from '@mapforge/shared/types';

interface ValidationCellRendererProps extends ICellRendererParams {
  exerciseColumn: ExerciseColumn;
  data: EnrichmentRecord;
  value: string | null;
}

export const ValidationCellRenderer = forwardRef<HTMLDivElement, ValidationCellRendererProps>(
  function ValidationCellRenderer(props, ref) {
    const { value, data } = props;
    const column = props.exerciseColumn;
    const [showPopover, setShowPopover] = useState(false);
    const cellRef = useRef<HTMLDivElement>(null);

    const cellErrors: CellError[] = data?.validationErrors?.filter(
      (e) => e.columnKey === column.key
    ) || [];

    const hasErrors = cellErrors.length > 0;
    const isEmpty = value === null || value === '';

    return (
      <div
        ref={(node) => {
          (cellRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={[
          'flex items-center w-full h-full px-2 relative',
          hasErrors ? 'ring-1 ring-status-error rounded-sm' : '',
        ].join(' ')}
        onMouseEnter={() => hasErrors && setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
      >
        {isEmpty && column.required ? (
          <span className="text-muted-foreground text-sm italic">
            {column.dataType === 'picklist' || column.dataType === 'multi_select'
              ? 'Select...'
              : 'Enter...'}
          </span>
        ) : (
          <span className="truncate text-sm">{value}</span>
        )}

        {hasErrors && (
          <AlertTriangle
            size={12}
            className="text-status-error shrink-0 ml-auto"
          />
        )}

        {showPopover && hasErrors && (
          <div className="absolute top-full left-0 mt-1">
            <CellErrorPopover errors={cellErrors} />
          </div>
        )}
      </div>
    );
  }
);
