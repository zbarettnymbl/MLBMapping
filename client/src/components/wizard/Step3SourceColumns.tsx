import { useState, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { WizardSourceColumn } from '@mapforge/shared';

export function Step3SourceColumns() {
  const { sourceColumns, setSourceColumns } = useExerciseWizardStore();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const updateColumn = (
    index: number,
    updates: Partial<WizardSourceColumn>
  ) => {
    const updated = [...sourceColumns];
    updated[index] = { ...updated[index], ...updates };
    setSourceColumns(updated);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    if (dragNodeRef.current) {
      e.dataTransfer.setDragImage(dragNodeRef.current, 0, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;
    const updated = [...sourceColumns];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, moved);
    updated.forEach((col, i) => (col.ordinal = i));
    setSourceColumns(updated);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Source Columns</h2>
      <p className="text-sm text-muted-foreground">
        Configure how source columns appear to business users. Drag to reorder.
      </p>
      <div className="space-y-2">
        {sourceColumns.map((col, index) => (
          <div
            key={col.key}
            ref={dragIndex === index ? dragNodeRef : undefined}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'flex items-center gap-3 p-3 bg-muted border rounded-md transition-colors',
              dragIndex === index
                ? 'opacity-50 border-border'
                : overIndex === index && dragIndex !== null
                  ? 'border-primary'
                  : 'border-border'
            )}
          >
            <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
              <GripVertical size={16} />
            </div>
            <span className="text-sm text-muted-foreground font-mono w-32 truncate">
              {col.key}
            </span>
            <Input
              type="text"
              value={col.label}
              onChange={(e) => updateColumn(index, { label: e.target.value })}
              className="flex-1 h-8"
            />
            <Badge variant="outline" className="text-xs">
              {col.originalType}
            </Badge>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={col.visible}
                onChange={(e) =>
                  updateColumn(index, { visible: e.target.checked })
                }
                className="accent-primary"
              />
              <span className="text-sm text-muted-foreground">Visible</span>
            </label>
          </div>
        ))}
      </div>
      {sourceColumns.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          No source columns detected. Go back to Step 2 to connect a data
          source.
        </p>
      )}
    </div>
  );
}
