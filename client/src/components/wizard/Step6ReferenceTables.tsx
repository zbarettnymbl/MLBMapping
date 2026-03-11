import { useState, useEffect } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { fetchReferenceTables } from '@/api/reference-tables';
import type { ReferenceTableListItem } from '@mapforge/shared';

export function Step6ReferenceTables() {
  const { classificationColumns, updateClassificationColumn } = useExerciseWizardStore();
  const [refTables, setRefTables] = useState<ReferenceTableListItem[]>([]);

  useEffect(() => { fetchReferenceTables().then(setRefTables).catch(() => {}); }, []);

  const picklistColumns = classificationColumns.filter(c => c.dataType === 'picklist' || c.dataType === 'multi_select');

  const handleLink = (columnKey: string, tableId: string) => {
    const table = refTables.find(t => t.id === tableId);
    if (!table) return;
    updateClassificationColumn(columnKey, {
      referenceLink: { referenceTableId: tableId, referenceTableName: table.name, valueColumn: 'value', displayColumn: 'value' },
    });
  };

  const handleUnlink = (columnKey: string) => {
    updateClassificationColumn(columnKey, { referenceLink: null });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-forge-100">Reference Tables</h2>
      <p className="text-sm text-forge-400">Link picklist columns to reference tables for consistent value lists.</p>
      {picklistColumns.length === 0 ? (
        <p className="text-forge-500 text-center py-8">No picklist or multi-select columns. Add them in Step 4.</p>
      ) : (
        <div className="space-y-4">
          {picklistColumns.map(col => {
            const linked = col.referenceLink as Record<string, unknown> | null;
            return (
              <div key={col.key} className="p-4 bg-forge-800 border border-forge-700 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-forge-100 font-medium">{col.label}</span>
                    <span className="ml-2 text-xs text-forge-500">{col.dataType}</span>
                  </div>
                  {linked && (
                    <button onClick={() => handleUnlink(col.key)} className="text-xs text-red-400 hover:text-red-300">Unlink</button>
                  )}
                </div>
                {linked ? (
                  <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded">
                    <span className="text-emerald-400 text-sm">Linked to: {String(linked.referenceTableName)}</span>
                  </div>
                ) : (
                  <select onChange={(e) => e.target.value && handleLink(col.key, e.target.value)}
                    className="w-full px-3 py-2 bg-forge-700 border border-forge-600 rounded text-forge-100 text-sm">
                    <option value="">Link to reference table...</option>
                    {refTables.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rowCount} rows)</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
