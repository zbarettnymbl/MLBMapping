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
          'bg-forge-850 border border-forge-700 rounded-md shadow-xl p-2',
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
            'bg-forge-900 border border-forge-700 text-forge-100',
            'focus:outline-none focus:ring-1 focus:ring-amber-500/40',
          ].join(' ')}
        />
        {!column.required && value && (
          <button
            onClick={() => {
              setValue('');
              setTimeout(() => stopEditing(), 0);
            }}
            className="mt-1 text-xs text-forge-400 hover:text-forge-200"
          >
            Clear
          </button>
        )}
      </div>
    );
  }
);
