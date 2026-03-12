import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ReferenceTableColumn } from '@mapforge/shared';

interface ManualColumnEditorProps {
  columns: ReferenceTableColumn[];
  onChange: (columns: ReferenceTableColumn[]) => void;
}

export function ManualColumnEditor({ columns, onChange }: ManualColumnEditorProps) {
  const addColumn = () => {
    const key = `col_${columns.length + 1}`;
    onChange([...columns, { key, label: '', type: 'text' }]);
  };

  const removeColumn = (index: number) => {
    onChange(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof ReferenceTableColumn, value: string) => {
    const updated = columns.map((col, i) =>
      i === index ? { ...col, [field]: value } : col
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_120px_40px] gap-2 text-xs text-muted-foreground font-medium px-1">
        <span>Key</span>
        <span>Label</span>
        <span>Type</span>
        <span />
      </div>
      {columns.map((col, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_120px_40px] gap-2">
          <Input
            value={col.key}
            onChange={(e) => updateColumn(i, 'key', e.target.value)}
            placeholder="column_key"
            className="h-8 text-sm"
          />
          <Input
            value={col.label}
            onChange={(e) => updateColumn(i, 'label', e.target.value)}
            placeholder="Column Label"
            className="h-8 text-sm"
          />
          <select
            value={col.type}
            onChange={(e) => updateColumn(i, 'type', e.target.value)}
            className="px-2 py-1.5 text-sm bg-background border border-input rounded-md text-foreground focus:ring-1 focus:ring-ring"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
          </select>
          <button
            onClick={() => removeColumn(i)}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addColumn}>
        Add Column
      </Button>
    </div>
  );
}
