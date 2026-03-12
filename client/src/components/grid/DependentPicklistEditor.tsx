// client/src/components/grid/DependentPicklistEditor.tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ICellEditorParams } from 'ag-grid-community';
import { useDependentOptions } from '../../hooks/useDependentOptions';
import type { ExerciseColumn, EnrichmentRecord } from '@mapforge/shared/types';

interface DependentPicklistEditorProps extends ICellEditorParams {
  exerciseColumn: ExerciseColumn;
  data: EnrichmentRecord;
  value: string | null;
}

export const DependentPicklistEditor = forwardRef<unknown, DependentPicklistEditorProps>(
  function DependentPicklistEditor(props, ref) {
    const { exerciseColumn: column, data, value: initialValue, api } = props;
    const [value, setValue] = useState<string | null>(initialValue);
    const valueRef = useRef<string | null>(initialValue);
    const [search, setSearch] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Determine parent value for dependent picklists
    const parentColumnKey = column.dependentConfig?.parentColumnKey;
    const parentValue = parentColumnKey
      ? (data.classifications[parentColumnKey] as string | null) ?? null
      : null;

    const hasDependency = !!column.dependentConfig;
    const parentMissing = hasDependency && !parentValue;

    // Fetch dependent options (only if dependency exists and parent has a value)
    const { data: dependentData, isLoading } = useDependentOptions(column, parentValue);

    // Resolve available options
    const options = useMemo(() => {
      if (hasDependency) {
        return dependentData?.values ?? [];
      }
      return column.config.picklistValues ?? [];
    }, [hasDependency, dependentData, column.config.picklistValues]);

    const filtered = useMemo(() => {
      if (!search) return options;
      const lower = search.toLowerCase();
      return options.filter((opt) => opt.toLowerCase().includes(lower));
    }, [options, search]);

    // Expose getValue for AG Grid - use ref to avoid stale closure
    useImperativeHandle(ref, () => ({
      getValue: () => valueRef.current,
    }));

    // Focus search input on mount
    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    // Reset highlight when filtered list changes
    useEffect(() => {
      setHighlightIndex(0);
    }, [filtered.length]);

    const selectOption = useCallback(
      (opt: string | null) => {
        setValue(opt);
        valueRef.current = opt;
        // Directly set the value via grid API to bypass getValue issues
        const colId = props.column?.getColId();
        const rowNode = api.getRowNode(data.id);
        if (rowNode && colId) {
          // Cancel the editor first, then set the value to trigger onCellValueChanged
          api.stopEditing(true);
          rowNode.setDataValue(colId, opt);
        } else {
          api.stopEditing(true);
        }
      },
      [api, data.id, props.column]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setHighlightIndex((prev) => Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (filtered[highlightIndex]) {
              selectOption(filtered[highlightIndex]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            api.stopEditing(true);
            break;
          default:
            break;
        }
      },
      [filtered, highlightIndex, selectOption, api]
    );

    // Scroll highlighted item into view
    useEffect(() => {
      const container = listRef.current;
      if (!container) return;
      const items = container.querySelectorAll('[data-option]');
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }, [highlightIndex]);

    // Parent missing state
    if (parentMissing) {
      const parentLabel = parentColumnKey || 'parent';
      return (
        <div
          className={[
            'bg-popover border border-border rounded-md shadow-xl',
            'min-w-[200px] max-w-[320px] p-4',
          ].join(' ')}
        >
          <p className="text-sm text-muted-foreground">
            Select <span className="text-foreground font-medium">{parentLabel}</span> first
          </p>
        </div>
      );
    }

    return (
      <div
        className={[
          'bg-popover border border-border rounded-md shadow-xl',
          'min-w-[200px] max-w-[320px] flex flex-col',
        ].join(' ')}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="sticky top-0 border-b border-border p-1.5">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className={[
              'w-full px-2 py-1 text-sm rounded',
              'bg-background border border-input text-foreground',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ring/40',
            ].join(' ')}
          />
        </div>

        {/* Options list */}
        <div ref={listRef} className="max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt}
                data-option
                onClick={() => selectOption(opt)}
                className={[
                  'px-3 py-1.5 text-sm cursor-pointer',
                  i === highlightIndex ? 'bg-muted' : '',
                  opt === value
                    ? 'bg-accent/10 text-accent'
                    : 'text-popover-foreground hover:bg-muted',
                ].join(' ')}
              >
                {opt}
              </div>
            ))
          )}
        </div>

        {/* Clear button */}
        {value && !column.required && (
          <div className="border-t border-border p-1.5">
            <button
              onClick={() => selectOption(null)}
              className={[
                'w-full px-2 py-1 text-xs text-muted-foreground rounded',
                'hover:bg-muted hover:text-foreground',
              ].join(' ')}
            >
              Clear selection
            </button>
          </div>
        )}
      </div>
    );
  }
);
