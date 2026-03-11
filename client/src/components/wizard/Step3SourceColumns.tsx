import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import type { WizardSourceColumn } from '@mapforge/shared';

export function Step3SourceColumns() {
  const { sourceColumns, setSourceColumns } = useExerciseWizardStore();

  const updateColumn = (
    index: number,
    updates: Partial<WizardSourceColumn>
  ) => {
    const updated = [...sourceColumns];
    updated[index] = { ...updated[index], ...updates };
    setSourceColumns(updated);
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const updated = [...sourceColumns];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= updated.length) return;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    updated.forEach((col, i) => (col.ordinal = i));
    setSourceColumns(updated);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-forge-100">Source Columns</h2>
      <p className="text-sm text-forge-400">
        Configure how source columns appear to business users. These columns are
        read-only.
      </p>
      <div className="space-y-2">
        {sourceColumns.map((col, index) => (
          <div
            key={col.key}
            className="flex items-center gap-3 p-3 bg-forge-800 border border-forge-700 rounded-md"
          >
            <div className="flex flex-col gap-1">
              <button
                onClick={() => moveColumn(index, 'up')}
                disabled={index === 0}
                className="text-forge-400 hover:text-forge-200 disabled:opacity-30 text-xs"
              >
                &#9650;
              </button>
              <button
                onClick={() => moveColumn(index, 'down')}
                disabled={index === sourceColumns.length - 1}
                className="text-forge-400 hover:text-forge-200 disabled:opacity-30 text-xs"
              >
                &#9660;
              </button>
            </div>
            <span className="text-sm text-forge-500 font-mono w-32 truncate">
              {col.key}
            </span>
            <input
              type="text"
              value={col.label}
              onChange={(e) => updateColumn(index, { label: e.target.value })}
              className="flex-1 px-2 py-1 bg-forge-700 border border-forge-600 rounded text-sm text-forge-100"
            />
            <span className="text-xs text-forge-500">{col.originalType}</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={col.visible}
                onChange={(e) =>
                  updateColumn(index, { visible: e.target.checked })
                }
                className="text-amber-500"
              />
              <span className="text-sm text-forge-300">Visible</span>
            </label>
          </div>
        ))}
      </div>
      {sourceColumns.length === 0 && (
        <p className="text-forge-500 text-center py-8">
          No source columns detected. Go back to Step 2 to connect a data
          source.
        </p>
      )}
    </div>
  );
}
