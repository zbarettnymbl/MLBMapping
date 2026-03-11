import { useState } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { ColumnConfigPanel } from './ColumnConfigPanel';
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
        <h2 className="text-xl font-semibold text-forge-100">
          Classification Columns
        </h2>
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 bg-amber-500 text-forge-900 rounded-md text-sm font-medium hover:bg-amber-400"
        >
          + Add Column
        </button>
      </div>
      <div className="space-y-2">
        {classificationColumns.map((col) => (
          <div
            key={col.key}
            className="flex items-center justify-between p-3 bg-forge-800 border border-forge-700 rounded-md"
          >
            <div>
              <span className="text-forge-100 font-medium">
                {col.label || col.key}
              </span>
              <span className="ml-2 text-xs text-forge-500">
                {col.dataType}
              </span>
              {col.required && (
                <span className="ml-2 text-xs text-amber-400">Required</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingColumn(col);
                }}
                className="text-sm text-forge-400 hover:text-forge-200"
              >
                Edit
              </button>
              <button
                onClick={() => removeClassificationColumn(col.key)}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      {classificationColumns.length === 0 && (
        <p className="text-forge-500 text-center py-8">
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
