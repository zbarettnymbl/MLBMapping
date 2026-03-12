import { useState } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { ColumnConfigPanel } from './ColumnConfigPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WizardClassificationColumn } from '@mapforge/shared';

export function Step4ClassificationColumns() {
  const {
    classificationColumns,
    addClassificationColumn,
    updateClassificationColumn,
    removeClassificationColumn,
  } = useExerciseWizardStore();
  const [editingColumn, setEditingColumn] =
    useState<WizardClassificationColumn | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = (col: WizardClassificationColumn) => {
    if (isAdding) {
      addClassificationColumn(col);
    } else {
      updateClassificationColumn(col.key, col);
    }
    setEditingColumn(null);
    setIsAdding(false);
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingColumn({
      key: '',
      label: '',
      description: '',
      dataType: 'picklist',
      required: false,
      defaultValue: null,
      config: {},
      referenceLink: null,
      dependentConfig: null,
      ordinal: classificationColumns.length,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Classification Columns
        </h2>
        <Button size="sm" onClick={handleAdd}>
          + Add Column
        </Button>
      </div>
      <div className="space-y-2">
        {classificationColumns.map((col) => (
          <div
            key={col.key}
            className="flex items-center justify-between p-3 bg-muted border border-border rounded-md"
          >
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium">
                {col.label || col.key}
              </span>
              <Badge variant="outline" className="text-xs">
                {col.dataType}
              </Badge>
              {col.required && (
                <Badge variant="default" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setEditingColumn(col);
                }}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => removeClassificationColumn(col.key)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
      {classificationColumns.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          No classification columns yet. Click "Add Column" to create one.
        </p>
      )}
      {editingColumn && (
        <ColumnConfigPanel
          column={editingColumn}
          isNew={isAdding}
          onSave={handleSave}
          onClose={() => {
            setEditingColumn(null);
            setIsAdding(false);
          }}
        />
      )}
    </div>
  );
}
