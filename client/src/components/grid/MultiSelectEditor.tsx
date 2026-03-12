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
          'bg-forge-850 border border-forge-700 rounded-md shadow-xl',
          'min-w-[200px] max-w-[320px] flex flex-col',
        ].join(' ')}
        onKeyDown={handleKeyDown}
      >
        {/* Search */}
        <div className="sticky top-0 border-b border-forge-700 p-1.5">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className={[
              'w-full px-2 py-1 text-sm rounded',
              'bg-forge-900 border border-forge-700 text-forge-100',
              'placeholder:text-forge-500',
              'focus:outline-none focus:ring-1 focus:ring-amber-500/40',
            ].join(' ')}
          />
        </div>

        {/* Select All / Clear All */}
        <div className="flex gap-2 px-3 py-1.5 border-b border-forge-700">
          <button
            onClick={() => setSelected(new Set(options))}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            Select All
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-forge-400 hover:text-forge-300"
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
                'hover:bg-forge-800',
                selected.has(opt) ? 'text-amber-400' : 'text-forge-200',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
                className="accent-amber-500"
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Done button */}
        <div className="border-t border-forge-700 p-1.5">
          <button
            onClick={() => stopEditing()}
            className={[
              'w-full px-2 py-1 text-xs font-medium rounded',
              'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30',
            ].join(' ')}
          >
            Done ({selected.size} selected)
          </button>
        </div>
      </div>
    );
  }
);
