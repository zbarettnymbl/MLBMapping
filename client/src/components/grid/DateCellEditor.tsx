// client/src/components/grid/DateCellEditor.tsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ICellEditorParams } from 'ag-grid-community';
import type { ExerciseColumn } from '@mapforge/shared/types';

interface DateCellEditorProps extends ICellEditorParams {
  exerciseColumn: ExerciseColumn;
  value: string | null;
}

export const DateCellEditor = forwardRef<unknown, DateCellEditorProps>(
  function DateCellEditor(props, ref) {
    const { exerciseColumn: column, value: initialValue, stopEditing } = props;
    const [value, setValue] = useState(initialValue ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => value || null,
    }));

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    return (
      <div
        className={[
          'bg-popover border border-border rounded-md shadow-xl p-2',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="date"
          value={value}
          min={column.config.minDate}
          max={column.config.maxDate}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              stopEditing();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              stopEditing();
            }
          }}
          className={[
            'px-2 py-1 text-sm rounded',
            'bg-background border border-input text-foreground',
            'focus:outline-none focus:ring-1 focus:ring-ring/40',
          ].join(' ')}
        />
        {!column.required && value && (
          <button
            onClick={() => {
              setValue('');
              setTimeout(() => stopEditing(), 0);
            }}
            className="mt-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
    );
  }
);
