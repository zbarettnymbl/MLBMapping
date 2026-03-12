import { useState, useEffect } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { fetchReferenceTables } from '@/api/reference-tables';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
      <h2 className="text-xl font-semibold text-foreground">Reference Tables</h2>
      <p className="text-sm text-muted-foreground">Link picklist columns to reference tables for consistent value lists.</p>
      {picklistColumns.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No picklist or multi-select columns. Add them in Step 4.</p>
      ) : (
        <div className="space-y-4">
          {picklistColumns.map(col => {
            const linked = col.referenceLink as Record<string, unknown> | null;
            return (
              <Card key={col.key}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">{col.label}</span>
                      <Badge variant="outline" className="text-xs">{col.dataType}</Badge>
                    </div>
                    {linked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleUnlink(col.key)}
                      >
                        Unlink
                      </Button>
                    )}
                  </div>
                  {linked ? (
                    <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded">
                      <span className="text-emerald-400 text-sm">Linked to: {String(linked.referenceTableName)}</span>
                    </div>
                  ) : (
                    <Select onValueChange={(val) => val && handleLink(col.key, val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Link to reference table..." />
                      </SelectTrigger>
                      <SelectContent>
                        {refTables.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.rowCount} rows)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
