// client/src/components/grid/BulkEditPanel.tsx
import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type {
  ExerciseDetail,
  EnrichmentRecord,
  BulkClassificationPayload,
  ExerciseColumn,
} from '@mapforge/shared/types';

interface BulkEditPanelProps {
  exercise: ExerciseDetail;
  selectedRecordIds: Set<string>;
  records: EnrichmentRecord[];
  onApply: (payload: BulkClassificationPayload) => void;
  onClose: () => void;
}

interface FieldState {
  apply: boolean;
  value: string | null;
}

export function BulkEditPanel({
  exercise,
  selectedRecordIds,
  onApply,
  onClose,
}: BulkEditPanelProps) {
  const classificationCols = exercise.classificationColumns.filter(
    (c) => c.columnRole === 'classification' && c.visible
  );

  const [fields, setFields] = useState<Record<string, FieldState>>(() => {
    const init: Record<string, FieldState> = {};
    for (const col of classificationCols) {
      init[col.key] = { apply: false, value: null };
    }
    return init;
  });

  const [confirming, setConfirming] = useState(false);
  const count = selectedRecordIds.size;
  const needsConfirmation = count > 50;

  const updateField = useCallback((key: string, updates: Partial<FieldState>) => {
    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  }, []);

  const handleApply = useCallback(() => {
    if (needsConfirmation && !confirming) {
      setConfirming(true);
      return;
    }

    const values = Object.entries(fields)
      .filter(([, f]) => f.apply)
      .map(([columnKey, f]) => ({ columnKey, value: f.value }));

    if (values.length === 0) return;

    onApply({
      recordIds: Array.from(selectedRecordIds),
      values,
    });
  }, [fields, selectedRecordIds, needsConfirmation, confirming, onApply]);

  const appliedCount = Object.values(fields).filter((f) => f.apply).length;

  function renderFieldInput(col: ExerciseColumn) {
    const field = fields[col.key];
    switch (col.dataType) {
      case 'picklist': {
        const options = col.config.picklistValues ?? [];
        return (
          <select
            value={field.value ?? ''}
            onChange={(e) => updateField(col.key, { value: e.target.value || null })}
            disabled={!field.apply}
            className={[
              'w-full px-2 py-1.5 text-sm rounded',
              'bg-card border border-border text-foreground',
              !field.apply ? 'opacity-40' : '',
            ].join(' ')}
          >
            <option value="">-- Select --</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }
      case 'boolean':
        return (
          <select
            value={field.value ?? ''}
            onChange={(e) => updateField(col.key, { value: e.target.value || null })}
            disabled={!field.apply}
            className={[
              'w-full px-2 py-1.5 text-sm rounded',
              'bg-card border border-border text-foreground',
              !field.apply ? 'opacity-40' : '',
            ].join(' ')}
          >
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={field.value ?? ''}
            min={col.config.minValue}
            max={col.config.maxValue}
            onChange={(e) => updateField(col.key, { value: e.target.value || null })}
            disabled={!field.apply}
            className={[
              'w-full px-2 py-1.5 text-sm rounded',
              'bg-card border border-border text-foreground',
              !field.apply ? 'opacity-40' : '',
            ].join(' ')}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={field.value ?? ''}
            min={col.config.minDate}
            max={col.config.maxDate}
            onChange={(e) => updateField(col.key, { value: e.target.value || null })}
            disabled={!field.apply}
            className={[
              'w-full px-2 py-1.5 text-sm rounded',
              'bg-card border border-border text-foreground',
              !field.apply ? 'opacity-40' : '',
            ].join(' ')}
          />
        );
      default:
        return (
          <input
            type="text"
            value={field.value ?? ''}
            onChange={(e) => updateField(col.key, { value: e.target.value || null })}
            disabled={!field.apply}
            className={[
              'w-full px-2 py-1.5 text-sm rounded',
              'bg-card border border-border text-foreground',
              !field.apply ? 'opacity-40' : '',
            ].join(' ')}
          />
        );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={[
          'relative bg-card border border-border rounded-lg shadow-2xl',
          'w-full max-w-lg max-h-[80vh] flex flex-col',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Apply to {count} selected record{count !== 1 ? 's' : ''}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {classificationCols.map((col) => (
            <div key={col.key} className="space-y-1.5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fields[col.key].apply}
                  onChange={(e) => updateField(col.key, { apply: e.target.checked })}
                  className="accent-amber-500"
                />
                <span className="text-sm font-medium text-foreground">{col.label}</span>
                {col.required && (
                  <span className="text-amber-400 text-xs">*</span>
                )}
              </label>
              {renderFieldInput(col)}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Only checked fields will be updated
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={[
                'px-3 py-1.5 text-sm rounded',
                'text-muted-foreground hover:text-foreground hover:bg-muted',
              ].join(' ')}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={appliedCount === 0}
              className={[
                'px-3 py-1.5 text-sm font-medium rounded',
                appliedCount === 0
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : confirming
                    ? 'bg-status-error text-white'
                    : 'bg-amber-600 text-white hover:bg-amber-500',
              ].join(' ')}
            >
              {confirming
                ? `Confirm: Apply to ${count} Records`
                : `Apply to ${count} Record${count !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
