import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Database, FileSpreadsheet, Cloud } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ManualColumnEditor } from './ManualColumnEditor';
import { CsvUploadStep } from './CsvUploadStep';
import { BigQuerySourceStep } from './BigQuerySourceStep';
import { createReferenceTable, importCsv, refreshFromBigQuery } from '@/api/reference-tables';
import type { ReferenceTableColumn } from '@mapforge/shared';
import { toast } from 'sonner';

type SourceType = 'manual' | 'csv' | 'bigquery';

interface CreateReferenceTableModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateReferenceTableModal({ open, onClose }: CreateReferenceTableModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<SourceType | null>(null);

  // Manual state
  const [columns, setColumns] = useState<ReferenceTableColumn[]>([
    { key: 'value', label: 'Value', type: 'text' },
  ]);

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<ReferenceTableColumn[]>([]);

  // BigQuery state
  const [bqConfig, setBqConfig] = useState<{
    credentialId: string;
    gcpProject: string;
    dataset: string;
    tableOrQuery: string;
    queryType: 'table' | 'query';
    previewColumns: ReferenceTableColumn[];
  } | null>(null);

  const [creating, setCreating] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setName('');
    setDescription('');
    setSource(null);
    setColumns([{ key: 'value', label: 'Value', type: 'text' }]);
    setCsvFile(null);
    setCsvColumns([]);
    setBqConfig(null);
    setCreating(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const canProceedStep1 = name.trim() && source;

  const canCreate = () => {
    if (source === 'manual') return columns.length > 0 && columns.every(c => c.key && c.label);
    if (source === 'csv') return !!csvFile && csvColumns.length > 0;
    if (source === 'bigquery') return !!bqConfig;
    return false;
  };

  const handleCreate = async () => {
    if (!source) return;
    setCreating(true);
    try {
      if (source === 'manual') {
        await createReferenceTable({ name: name.trim(), description: description.trim() || undefined, columns });
      } else if (source === 'csv' && csvFile) {
        const table = await createReferenceTable({
          name: name.trim(),
          description: description.trim() || undefined,
          columns: csvColumns,
        });
        await importCsv(table.id, csvFile);
      } else if (source === 'bigquery' && bqConfig) {
        const table = await createReferenceTable({
          name: name.trim(),
          description: description.trim() || undefined,
          columns: bqConfig.previewColumns,
          refreshSource: 'bigquery',
          refreshConfig: {
            credentialId: bqConfig.credentialId,
            gcpProject: bqConfig.gcpProject,
            dataset: bqConfig.dataset,
            tableOrQuery: bqConfig.tableOrQuery,
            queryType: bqConfig.queryType,
          },
        });
        await refreshFromBigQuery(table.id);
      }
      queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
      toast.success(`Reference table "${name.trim()}" created`);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create reference table');
    } finally {
      setCreating(false);
    }
  };

  const sourceOptions: { key: SourceType; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'manual', label: 'Manual', desc: 'Define columns and add rows by hand', icon: <Database size={20} /> },
    { key: 'csv', label: 'CSV Upload', desc: 'Import from a CSV file', icon: <FileSpreadsheet size={20} /> },
    { key: 'bigquery', label: 'BigQuery', desc: 'Pull from a BigQuery table or query', icon: <Cloud size={20} /> },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create Reference Table (Step {step}/2)</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="mb-1">Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Country Codes"
              />
            </div>
            <div>
              <Label className="mb-1">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label className="mb-2">Data Source</Label>
              <div className="grid grid-cols-3 gap-3">
                {sourceOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSource(opt.key)}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                      source === opt.key
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                        : 'border-border bg-muted/50 hover:border-border/80'
                    }`}
                  >
                    <div className={`mb-2 ${source === opt.key ? 'text-primary' : 'text-muted-foreground'}`}>{opt.icon}</div>
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {source === 'manual' && (
                <ManualColumnEditor columns={columns} onChange={setColumns} />
              )}
              {source === 'csv' && (
                <CsvUploadStep
                  onParsed={({ columns: cols, file }) => {
                    setCsvColumns(cols);
                    setCsvFile(file);
                  }}
                />
              )}
              {source === 'bigquery' && (
                <BigQuerySourceStep onConfigured={setBqConfig} />
              )}
            </div>
            <div className="flex justify-between pt-4 border-t border-border/50 shrink-0">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleCreate} disabled={!canCreate() || creating} isLoading={creating}>
                Create
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
