import { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiClient } from '@/api/client';
import { useAddColumn, useUpdateColumn, useDeleteColumn } from '@/hooks/useExerciseEdit';
import type { ExerciseColumn, ExerciseDetail } from '@mapforge/shared';

interface ColumnConfigPanelProps {
  exerciseId: string;
  exercise: ExerciseDetail;
  column: ExerciseColumn | null; // null = add mode
  onClose: () => void;
}

type DataType = ExerciseColumn['dataType'];

const DATA_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'picklist', label: 'Picklist' },
  { value: 'multi_select', label: 'Multi Select' },
];

function toKey(label: string): string {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toLowerCase());
}

export function ColumnConfigPanel({ exerciseId, exercise, column, onClose }: ColumnConfigPanelProps) {
  const isEdit = !!column;
  const isSource = column?.columnRole === 'source';

  const addColumn = useAddColumn(exerciseId);
  const updateColumn = useUpdateColumn(exerciseId);
  const deleteColumn = useDeleteColumn(exerciseId);

  // Form state
  const [label, setLabel] = useState(column?.label || '');
  const [key, setKey] = useState(column?.key || '');
  const [description, setDescription] = useState(column?.description || '');
  const [dataType, setDataType] = useState<DataType>(column?.dataType || 'text');
  const [required, setRequired] = useState(column?.required ?? false);
  const [defaultValue, setDefaultValue] = useState(column?.defaultValue || '');
  const [picklistValues, setPicklistValues] = useState(
    (column?.config as any)?.picklistValues?.join('\n') || ''
  );
  const [useRefTable, setUseRefTable] = useState(!!column?.referenceLink);
  const [refTableId, setRefTableId] = useState(
    (column?.referenceLink as any)?.referenceTableId || ''
  );
  const [refColumnKey, setRefColumnKey] = useState(
    (column?.referenceLink as any)?.referenceColumnKey || ''
  );
  const [refDisplayKey, setRefDisplayKey] = useState(
    (column?.referenceLink as any)?.displayColumnKey || ''
  );
  const [parentColumnKey, setParentColumnKey] = useState(
    (column?.dependentConfig as any)?.parentColumnKey || ''
  );
  const [showDelete, setShowDelete] = useState(false);
  const [showTypeWarning, setShowTypeWarning] = useState(false);
  const [pendingDataType, setPendingDataType] = useState<DataType>('text');

  // Auto-generate key from label in add mode
  useEffect(() => {
    if (!isEdit && label) {
      setKey(toKey(label));
    }
  }, [label, isEdit]);

  // Fetch reference tables
  const { data: refTables } = useQuery({
    queryKey: ['reference-tables'],
    queryFn: async () => {
      const res = await apiClient.get('/reference-tables');
      return res.data.tables || res.data || [];
    },
    staleTime: 60_000,
    enabled: useRefTable,
  });

  // Fetch selected reference table columns
  const { data: refTableDetail } = useQuery({
    queryKey: ['reference-table-detail', refTableId],
    queryFn: async () => {
      const res = await apiClient.get(`/reference-tables/${refTableId}`);
      return res.data;
    },
    staleTime: 60_000,
    enabled: !!refTableId,
  });

  const isPicklistType = dataType === 'picklist' || dataType === 'multi_select';
  const otherPicklistColumns = [...exercise.classificationColumns]
    .filter(c => c.id !== column?.id && (c.dataType === 'picklist' || c.dataType === 'multi_select'));

  const handleDataTypeChange = (newType: string) => {
    const typed = newType as DataType;
    if (isEdit && column && dataType !== typed) {
      const isBreaking =
        (isPicklistType && typed !== 'picklist' && typed !== 'multi_select') ||
        (!isPicklistType && (typed === 'picklist' || typed === 'multi_select'));
      if (isBreaking) {
        setPendingDataType(typed);
        setShowTypeWarning(true);
        return;
      }
    }
    setDataType(typed);
  };

  const confirmTypeChange = () => {
    setDataType(pendingDataType);
    if (pendingDataType !== 'picklist' && pendingDataType !== 'multi_select') {
      setPicklistValues('');
      setUseRefTable(false);
      setRefTableId('');
      setRefColumnKey('');
      setRefDisplayKey('');
      setParentColumnKey('');
    }
    setShowTypeWarning(false);
  };

  const handleSave = () => {
    if (!label.trim() || !key.trim()) return;

    const config: Record<string, unknown> = {};
    if (isPicklistType && !useRefTable && picklistValues.trim()) {
      config.picklistValues = picklistValues.split('\n').map((v: string) => v.trim()).filter(Boolean);
    }

    const referenceLink = useRefTable && refTableId && refColumnKey
      ? { referenceTableId: refTableId, referenceColumnKey: refColumnKey, displayColumnKey: refDisplayKey || refColumnKey }
      : null;

    const dependentConfig = parentColumnKey && refTableId
      ? { parentColumnKey, referenceTableId: refTableId, parentReferenceColumn: refColumnKey, childReferenceColumn: refColumnKey }
      : null;

    if (isEdit && column) {
      const updates: Record<string, unknown> = {
        label, description: description || null, required,
      };
      if (!isSource) {
        updates.dataType = dataType;
        updates.defaultValue = defaultValue || null;
        updates.config = config;
        updates.referenceLink = referenceLink;
        updates.dependentConfig = dependentConfig;
      }
      updateColumn.mutate({ colId: column.id, updates }, { onSuccess: onClose });
    } else {
      addColumn.mutate({
        key, label, description: description || undefined, dataType,
        columnRole: 'classification', required, defaultValue: defaultValue || null,
        config, referenceLink, dependentConfig,
      }, { onSuccess: onClose });
    }
  };

  const handleDelete = () => {
    if (!column) return;
    deleteColumn.mutate(column.id, { onSuccess: () => { setShowDelete(false); onClose(); } });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold">{isEdit ? `Edit: ${column?.label}` : 'Add Column'}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Column label" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Key</Label>
          <Input value={key} disabled={isEdit} className={isEdit ? 'bg-muted' : ''} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </div>

        {!isSource && (
          <div className="space-y-1.5">
            <Label className="text-xs">Data Type</Label>
            <Select value={dataType} onValueChange={handleDataTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map(dt => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input type="checkbox" id="required" checked={required} onChange={(e) => setRequired(e.target.checked)} className="rounded" />
          <Label htmlFor="required" className="text-xs">Required</Label>
        </div>

        {!isSource && (
          <div className="space-y-1.5">
            <Label className="text-xs">Default Value</Label>
            <Input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} placeholder="Optional" />
          </div>
        )}

        {/* Picklist / Reference Table section */}
        {!isSource && isPicklistType && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="useRefTable" checked={useRefTable} onChange={(e) => setUseRefTable(e.target.checked)} className="rounded" />
              <Label htmlFor="useRefTable" className="text-xs">Link to Reference Table</Label>
            </div>

            {!useRefTable && (
              <div className="space-y-1.5">
                <Label className="text-xs">Picklist Values (one per line)</Label>
                <Textarea value={picklistValues} onChange={(e) => setPicklistValues(e.target.value)} rows={6} placeholder="Option 1&#10;Option 2&#10;Option 3" />
              </div>
            )}

            {useRefTable && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reference Table</Label>
                  <Select value={refTableId} onValueChange={setRefTableId}>
                    <SelectTrigger><SelectValue placeholder="Select table..." /></SelectTrigger>
                    <SelectContent>
                      {(refTables || []).map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {refTableDetail && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Value Column</Label>
                      <Select value={refColumnKey} onValueChange={setRefColumnKey}>
                        <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                        <SelectContent>
                          {(refTableDetail.columns || []).map((c: any) => (
                            <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Display Column (optional)</Label>
                      <Select value={refDisplayKey} onValueChange={setRefDisplayKey}>
                        <SelectTrigger><SelectValue placeholder="Same as value" /></SelectTrigger>
                        <SelectContent>
                          {(refTableDetail.columns || []).map((c: any) => (
                            <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Dependent picklist */}
                {otherPicklistColumns.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Parent Column (for dependent picklist, optional)</Label>
                    <Select value={parentColumnKey || '__none__'} onValueChange={(v) => setParentColumnKey(v === '__none__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="None (independent)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {otherPicklistColumns.map(c => (
                          <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <div>
          {isEdit && !isSource && (
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!label.trim() || !key.trim() || addColumn.isPending || updateColumn.isPending}>
            {isEdit ? 'Save' : 'Add Column'}
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={() => setShowDelete(false)}
        title={`Delete "${column?.label}"?`}
        description="This will permanently remove this column and clear its classification data from all records."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteColumn.isPending}
        onConfirm={handleDelete}
      />

      {/* Type change warning */}
      <ConfirmDialog
        open={showTypeWarning}
        onOpenChange={() => setShowTypeWarning(false)}
        title="Change data type?"
        description="Changing data type may invalidate existing classification values. Picklist configuration will be cleared."
        confirmLabel="Change Type"
        variant="destructive"
        onConfirm={confirmTypeChange}
      />
    </div>
  );
}
