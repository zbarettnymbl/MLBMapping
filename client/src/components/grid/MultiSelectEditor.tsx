// client/src/components/grid/MultiSelectEditor.tsx
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ICellEditorParams } from 'ag-grid-community';
import type { ExerciseColumn } from '@mapforge/shared/types';

interface MultiSelectEditorProps extends ICellEditorParams {
  exerciseColumn: ExerciseColumn;
  value: string | null;
}

export const MultiSelectEditor = forwardRef<unknown, MultiSelectEditorProps>(
  function MultiSelectEditor(props, ref) {
    const { exerciseColumn: column, value: initialValue, stopEditing } = props;
    const options = column.config.picklistValues ?? [];
    const [selected, setSelected] = useState<Set<string>>(() => {
      if (!initialValue) return new Set();
      return new Set(initialValue.split(',').map((s) => s.trim()).filter(Boolean));
    });
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => {
        const arr = Array.from(selected);
        return arr.length > 0 ? arr.join(', ') : null;
      },
    }));

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    const filtered = useMemo(() => {
      if (!search) return options;
      const lower = search.toLowerCase();
      return options.filter((opt) => opt.toLowerCase().includes(lower));
    }, [options, search]);

    const toggle = (opt: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(opt)) next.delete(opt);
        else next.add(opt);
        return next;
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopEditing();
      }
    };

    return (
      <div
        className={[
          'bg-popover border border-border rounded-md shadow-xl',
          'min-w-[200px] max-w-[320px] flex flex-col',
        ].join(' ')}
        onKeyDown={handleKeyDown}
      >
        {/* Search */}
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

        {/* Select All / Clear All */}
        <div className="flex gap-2 px-3 py-1.5 border-b border-border">
          <button
            onClick={() => setSelected(new Set(options))}
            className="text-xs text-accent hover:text-accent/80 cursor-pointer"
          >
            Select All
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear All
          </button>
        </div>

        {/* Options */}
        <div className="max-h-60 overflow-y-auto">
          {filtered.map((opt) => (
            <label
              key={opt}
              className={[
                'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer',
                'hover:bg-muted',
                selected.has(opt) ? 'text-accent' : 'text-popover-foreground',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
                className="accent-accent"
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Done button */}
        <div className="border-t border-border p-1.5">
          <button
            onClick={() => stopEditing()}
            className={[
              'w-full px-2 py-1 text-xs font-medium rounded cursor-pointer',
              'bg-accent/10 text-accent hover:bg-accent/20',
            ].join(' ')}
          >
            Done ({selected.size} selected)
          </button>
        </div>
      </div>
    );
  }
);
