import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Database, FileSpreadsheet, Cloud } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { ManualColumnEditor } from './ManualColumnEditor';
import { CsvUploadStep } from './CsvUploadStep';
import { BigQuerySourceStep } from './BigQuerySourceStep';
import { createReferenceTable, importCsv, refreshFromBigQuery } from '@/api/reference-tables';
import type { ReferenceTableColumn } from '@mapforge/shared';
import toast from 'react-hot-toast';

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
    <Modal open={open} onClose={handleClose} title={`Create Reference Table (Step ${step}/2)`} size="xl">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-forge-300 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Country Codes"
              className="w-full px-3 py-2 text-sm bg-forge-850 border border-forge-700 rounded-md text-forge-50 focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40"
            />
          </div>
          <div>
            <label className="block text-sm text-forge-300 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 text-sm bg-forge-850 border border-forge-700 rounded-md text-forge-50 focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40"
            />
          </div>
          <div>
            <label className="block text-sm text-forge-300 mb-2">Data Source</label>
            <div className="grid grid-cols-3 gap-3">
              {sourceOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSource(opt.key)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    source === opt.key
                      ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40'
                      : 'border-forge-700 bg-forge-800/50 hover:border-forge-600'
                  }`}
                >
                  <div className={`mb-2 ${source === opt.key ? 'text-amber-400' : 'text-forge-400'}`}>{opt.icon}</div>
                  <p className="text-sm font-medium text-forge-100">{opt.label}</p>
                  <p className="text-xs text-forge-500 mt-0.5">{opt.desc}</p>
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
        <div className="space-y-4">
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
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={handleCreate} disabled={!canCreate() || creating} isLoading={creating}>
              Create
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
