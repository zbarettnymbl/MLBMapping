import { useState } from 'react';
import type { WizardClassificationColumn } from '@mapforge/shared';

interface ColumnConfigPanelProps {
  column: WizardClassificationColumn;
  isNew: boolean;
  onSave: (column: WizardClassificationColumn) => void;
  onClose: () => void;
}

const DATA_TYPES = [
  'picklist',
  'multi_select',
  'text',
  'number',
  'date',
  'boolean',
] as const;

export function ColumnConfigPanel({
  column,
  isNew,
  onSave,
  onClose,
}: ColumnConfigPanelProps) {
  const [form, setForm] = useState({ ...column });
  const [picklistValues, setPicklistValues] = useState<string>(
    (column.config as Record<string, unknown>)?.picklistValues
      ? (
          (column.config as Record<string, unknown>).picklistValues as string[]
        ).join('\n')
      : ''
  );

  const handleSubmit = () => {
    const config: Record<string, unknown> = { ...form.config };
    if (form.dataType === 'picklist' || form.dataType === 'multi_select') {
      config.picklistValues = picklistValues
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    onSave({
      ...form,
      key: form.key || form.label.toLowerCase().replace(/\s+/g, '_'),
      config,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-forge-900 border-l border-forge-700 p-6 overflow-y-auto">
        <h3 className="text-lg font-semibold text-forge-100 mb-4">
          {isNew ? 'Add' : 'Edit'} Classification Column
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-forge-300 mb-1">
              Label *
            </label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100"
            />
          </div>
          {isNew && (
            <div>
              <label className="block text-sm font-medium text-forge-300 mb-1">
                Key
              </label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="Auto-generated from label"
                className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-forge-300 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100 h-20 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-forge-300 mb-1">
              Data Type
            </label>
            <select
              value={form.dataType}
              onChange={(e) => setForm({ ...form, dataType: e.target.value })}
              className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100"
            >
              {DATA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm({ ...form, required: e.target.checked })}
              className="text-amber-500"
            />
            <span className="text-sm text-forge-200">Required</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-forge-300 mb-1">
              Default Value
            </label>
            <input
              type="text"
              value={form.defaultValue || ''}
              onChange={(e) =>
                setForm({ ...form, defaultValue: e.target.value || null })
              }
              className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100"
            />
          </div>
          {(form.dataType === 'picklist' ||
            form.dataType === 'multi_select') && (
            <div>
              <label className="block text-sm font-medium text-forge-300 mb-1">
                Picklist Values (one per line)
              </label>
              <textarea
                value={picklistValues}
                onChange={(e) => setPicklistValues(e.target.value)}
                className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100 h-32 resize-none font-mono text-sm"
                placeholder="Value 1\nValue 2\nValue 3"
              />
              <p className="text-xs text-forge-500 mt-1">
                Or link to a reference table in Step 6.
              </p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-amber-500 text-forge-900 rounded-md font-medium hover:bg-amber-400"
            >
              {isNew ? 'Add Column' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-forge-700 text-forge-300 rounded-md hover:bg-forge-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
