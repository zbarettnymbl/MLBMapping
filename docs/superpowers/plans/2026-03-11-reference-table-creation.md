# Reference Table Creation & Inline Editing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a creation wizard modal (Manual, CSV, BigQuery sources) and inline AG Grid row editing to the Reference Tables page.

**Architecture:** Extend the existing Modal component to support `xl` size. Build 5 new components in `client/src/components/reference-tables/`. Refactor the page from manual state to React Query. One minor backend change to accept `refreshSource`/`refreshConfig` on POST.

**Tech Stack:** React 19, TypeScript, AG Grid, React Query, papaparse, Zustand (existing), Tailwind CSS, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-11-reference-table-creation-design.md`

---

## Chunk 1: Foundation (Types, Backend, Dependencies)

### Task 1: Extend shared types and update server POST handler

**Files:**
- Modify: `shared/src/types/reference-table.ts:38-44`
- Modify: `server/src/routes/reference-tables.ts:22-29`

- [ ] **Step 1: Update `CreateReferenceTablePayload` type**

In `shared/src/types/reference-table.ts`, add optional `refreshSource` and `refreshConfig` fields:

```typescript
export interface CreateReferenceTablePayload {
  name: string;
  description?: string;
  columns: ReferenceTableColumn[];
  primaryKeyColumn?: string;
  displayColumn?: string;
  refreshSource?: 'manual' | 'url' | 'sftp' | 'bigquery';
  refreshConfig?: Record<string, unknown>;
}
```

- [ ] **Step 2: Update server POST handler to use new fields**

In `server/src/routes/reference-tables.ts`, change the POST handler (line 22-29) to destructure and use the new fields:

```typescript
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const { name, description, columns, primaryKeyColumn, displayColumn, refreshSource, refreshConfig } = req.body;
  const [table] = await db.insert(referenceTables).values({
    orgId: req.user!.orgId, name, description, columns, primaryKeyColumn, displayColumn,
    rowCount: 0, refreshSource: refreshSource ?? 'manual', refreshConfig: refreshConfig ?? null,
  }).returning();
  res.status(201).json(table);
});
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add shared/src/types/reference-table.ts server/src/routes/reference-tables.ts
git commit -m "feat: accept refreshSource/refreshConfig on reference table creation"
```

### Task 2: Install papaparse dependency

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Install papaparse and types**

```bash
cd client && npm install papaparse && npm install -D @types/papaparse
```

- [ ] **Step 2: Verify build succeeds**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/package.json package-lock.json
git commit -m "chore: add papaparse dependency for CSV preview"
```

### Task 3: Add `xl` size to Modal component

**Files:**
- Modify: `client/src/components/common/Modal.tsx:10,15-19`

- [ ] **Step 1: Add `xl` to the size type and size classes**

In `client/src/components/common/Modal.tsx`:

Change the `ModalProps` interface `size` type (line 10):
```typescript
  size?: 'sm' | 'md' | 'lg' | 'xl';
```

Change `sizeClasses` (lines 15-19):
```typescript
const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/Modal.tsx
git commit -m "feat: add xl size option to Modal component"
```

---

## Chunk 2: Manual Column Editor + Creation Modal (Steps 1 & 2)

### Task 4: Create ManualColumnEditor component

**Files:**
- Create: `client/src/components/reference-tables/ManualColumnEditor.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { ReferenceTableColumn } from '@mapforge/shared';

interface ManualColumnEditorProps {
  columns: ReferenceTableColumn[];
  onChange: (columns: ReferenceTableColumn[]) => void;
}

export function ManualColumnEditor({ columns, onChange }: ManualColumnEditorProps) {
  const addColumn = () => {
    const key = `col_${columns.length + 1}`;
    onChange([...columns, { key, label: '', type: 'text' }]);
  };

  const removeColumn = (index: number) => {
    onChange(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof ReferenceTableColumn, value: string) => {
    const updated = columns.map((col, i) =>
      i === index ? { ...col, [field]: value } : col
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_120px_40px] gap-2 text-xs text-forge-400 font-medium px-1">
        <span>Key</span>
        <span>Label</span>
        <span>Type</span>
        <span />
      </div>
      {columns.map((col, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_120px_40px] gap-2">
          <input
            type="text"
            value={col.key}
            onChange={(e) => updateColumn(i, 'key', e.target.value)}
            placeholder="column_key"
            className="px-3 py-1.5 text-sm bg-forge-850 border border-forge-700 rounded text-forge-50 focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40"
          />
          <input
            type="text"
            value={col.label}
            onChange={(e) => updateColumn(i, 'label', e.target.value)}
            placeholder="Column Label"
            className="px-3 py-1.5 text-sm bg-forge-850 border border-forge-700 rounded text-forge-50 focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40"
          />
          <select
            value={col.type}
            onChange={(e) => updateColumn(i, 'type', e.target.value)}
            className="px-2 py-1.5 text-sm bg-forge-850 border border-forge-700 rounded text-forge-50 focus:ring-1 focus:ring-amber-500/40"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
          </select>
          <button
            onClick={() => removeColumn(i)}
            className="p-1.5 text-forge-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addColumn}>
        Add Column
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/reference-tables/ManualColumnEditor.tsx
git commit -m "feat: add ManualColumnEditor component for reference table creation"
```

### Task 5: Create CsvUploadStep component

**Files:**
- Create: `client/src/components/reference-tables/CsvUploadStep.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import type { ReferenceTableColumn } from '@mapforge/shared';

interface CsvUploadStepProps {
  onParsed: (result: { columns: ReferenceTableColumn[]; file: File; rowCount: number }) => void;
}

interface ParsedCsv {
  rawRows: string[][];
  file: File;
}

export function CsvUploadStep({ onParsed }: CsvUploadStepProps) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [noHeaders, setNoHeaders] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data;
        setParsed({ rawRows, file });
        setHeaderRowIndex(0);
        setNoHeaders(false);
        // Emit initial parse with row 0 as header
        const headers = rawRows[0] || [];
        const columns: ReferenceTableColumn[] = headers.map((h, i) => ({
          key: h || `col_${i + 1}`,
          label: h || `Column ${i + 1}`,
          type: 'text' as const,
        }));
        onParsed({ columns, file, rowCount: rawRows.length - 1 });
      },
    });
  }, [onParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const selectHeaderRow = useCallback((index: number) => {
    if (!parsed) return;
    setHeaderRowIndex(index);
    setNoHeaders(false);
    const headers = parsed.rawRows[index] || [];
    const columns: ReferenceTableColumn[] = headers.map((h, i) => ({
      key: h || `col_${i + 1}`,
      label: h || `Column ${i + 1}`,
      type: 'text' as const,
    }));
    onParsed({ columns, file: parsed.file, rowCount: parsed.rawRows.length - 1 - index });
  }, [parsed, onParsed]);

  const toggleNoHeaders = useCallback(() => {
    if (!parsed) return;
    const newNoHeaders = !noHeaders;
    setNoHeaders(newNoHeaders);
    if (newNoHeaders) {
      const colCount = parsed.rawRows[0]?.length || 0;
      const columns: ReferenceTableColumn[] = Array.from({ length: colCount }, (_, i) => ({
        key: `col_${i + 1}`,
        label: `Column ${i + 1}`,
        type: 'text' as const,
      }));
      onParsed({ columns, file: parsed.file, rowCount: parsed.rawRows.length });
    } else {
      selectHeaderRow(headerRowIndex);
    }
  }, [parsed, noHeaders, headerRowIndex, onParsed, selectHeaderRow]);

  if (!parsed) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragOver ? 'border-amber-500 bg-amber-500/5' : 'border-forge-700 hover:border-forge-600'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto text-forge-500 mb-3" />
        <p className="text-sm text-forge-300 mb-2">Drag and drop a CSV file, or click to browse</p>
        <label className="inline-block">
          <span className="px-4 py-2 text-sm bg-forge-800 hover:bg-forge-750 text-forge-100 border border-forge-700 rounded-md cursor-pointer transition-colors">
            Choose File
          </span>
          <input type="file" accept=".csv" onChange={handleInputChange} className="hidden" />
        </label>
      </div>
    );
  }

  const previewRows = parsed.rawRows.slice(0, 10);
  const effectiveHeaderIndex = noHeaders ? -1 : headerRowIndex;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-forge-300">
          {parsed.rawRows.length} rows parsed. Click a row to set it as the header.
        </p>
        <label className="flex items-center gap-2 text-xs text-forge-400">
          <input
            type="checkbox"
            checked={noHeaders}
            onChange={toggleNoHeaders}
            className="rounded border-forge-600"
          />
          No header row
        </label>
      </div>
      <div className="overflow-x-auto border border-forge-700 rounded-lg">
        <table className="w-full text-xs">
          <tbody>
            {previewRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => !noHeaders && selectHeaderRow(rowIdx)}
                className={`cursor-pointer transition-colors ${
                  !noHeaders && rowIdx === effectiveHeaderIndex
                    ? 'bg-amber-500/15 text-amber-300 font-semibold'
                    : rowIdx < effectiveHeaderIndex
                    ? 'bg-forge-900/50 text-forge-600'
                    : 'hover:bg-forge-800/50 text-forge-300'
                }`}
              >
                <td className="px-2 py-1.5 text-forge-600 w-8 text-right">{rowIdx}</td>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-1.5 border-l border-forge-800 whitespace-nowrap max-w-[200px] truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={() => { setParsed(null); }}
        className="text-xs text-forge-500 hover:text-forge-300 transition-colors"
      >
        Choose a different file
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/reference-tables/CsvUploadStep.tsx
git commit -m "feat: add CsvUploadStep component with header row selection"
```

### Task 6: Create BigQuerySourceStep component

**Files:**
- Create: `client/src/components/reference-tables/BigQuerySourceStep.tsx`

- [ ] **Step 1: Create the component**

This component uses `fetchCredentials` from `@/api/credentials` and the BigQuery preview API. It fetches datasets and tables based on selected credential, then lets the user write a query or pick a table and preview results.

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCredentials } from '@/api/credentials';
import { fetchBigQueryDatasets, fetchBigQueryTables, previewBigQueryData } from '@/api/bigquery';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import type { ReferenceTableColumn, BigQueryColumnInfo } from '@mapforge/shared';

interface BigQuerySourceStepProps {
  onConfigured: (config: {
    credentialId: string;
    gcpProject: string;
    dataset: string;
    tableOrQuery: string;
    queryType: 'table' | 'query';
    previewColumns: ReferenceTableColumn[];
  }) => void;
}

export function BigQuerySourceStep({ onConfigured }: BigQuerySourceStepProps) {
  const [credentialId, setCredentialId] = useState('');
  const [dataset, setDataset] = useState('');
  const [tableOrQuery, setTableOrQuery] = useState('');
  const [queryType, setQueryType] = useState<'table' | 'query'>('table');
  const [previewData, setPreviewData] = useState<{ columns: BigQueryColumnInfo[]; rows: Record<string, unknown>[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { data: credentials, isLoading: credentialsLoading } = useQuery({
    queryKey: ['credentials'],
    queryFn: fetchCredentials,
  });

  const { data: datasetsData } = useQuery({
    queryKey: ['bigquery-datasets', credentialId],
    queryFn: () => fetchBigQueryDatasets(credentialId),
    enabled: !!credentialId,
  });

  // fetchBigQueryTables returns string[] directly (unwraps .data.tables internally)
  const { data: tablesList } = useQuery({
    queryKey: ['bigquery-tables', credentialId, dataset],
    queryFn: () => fetchBigQueryTables(credentialId, dataset),
    enabled: !!credentialId && !!dataset && queryType === 'table',
  });

  const handlePreview = async () => {
    if (!credentialId || !tableOrQuery) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const gcpProject = datasetsData?.gcpProject || '';
      const result = await previewBigQueryData({
        credentialId,
        gcpProject,
        dataset,
        tableOrQuery,
        queryType,
        limit: 10,
      });
      // result.columns is BigQueryColumnInfo[] with { name, type, mode }
      setPreviewData({ columns: result.columns || [], rows: result.rows || [] });
      const columns: ReferenceTableColumn[] = (result.columns || []).map((c) => ({
        key: c.name,
        label: c.name,
        type: 'text' as const,
      }));
      onConfigured({
        credentialId,
        gcpProject,
        dataset,
        tableOrQuery,
        queryType,
        previewColumns: columns,
      });
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  if (credentialsLoading) {
    return <div className="flex justify-center py-8"><Spinner size="md" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Credential selector */}
      <div>
        <label className="block text-sm text-forge-300 mb-1">Credential</label>
        <select
          value={credentialId}
          onChange={(e) => { setCredentialId(e.target.value); setDataset(''); setTableOrQuery(''); setPreviewData(null); }}
          className="w-full px-3 py-2 text-sm bg-forge-850 border border-forge-700 rounded-md text-forge-50 focus:ring-1 focus:ring-amber-500/40"
        >
          <option value="">Select a credential...</option>
          {credentials?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Dataset selector */}
      {credentialId && datasetsData && (
        <div>
          <label className="block text-sm text-forge-300 mb-1">Dataset</label>
          <select
            value={dataset}
            onChange={(e) => { setDataset(e.target.value); setTableOrQuery(''); setPreviewData(null); }}
            className="w-full px-3 py-2 text-sm bg-forge-850 border border-forge-700 rounded-md text-forge-50 focus:ring-1 focus:ring-amber-500/40"
          >
            <option value="">Select a dataset...</option>
            {datasetsData.datasets.map((d: string) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {/* Query type toggle */}
      {credentialId && dataset && (
        <div className="flex gap-2">
          <button
            onClick={() => { setQueryType('table'); setTableOrQuery(''); setPreviewData(null); }}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              queryType === 'table' ? 'bg-amber-600 text-forge-950 font-semibold' : 'bg-forge-800 text-forge-300 hover:bg-forge-750'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => { setQueryType('query'); setTableOrQuery(''); setPreviewData(null); }}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              queryType === 'query' ? 'bg-amber-600 text-forge-950 font-semibold' : 'bg-forge-800 text-forge-300 hover:bg-forge-750'
            }`}
          >
            Custom Query
          </button>
        </div>
      )}

      {/* Table selector or query input */}
      {credentialId && dataset && queryType === 'table' && tablesList && (
        <div>
          <label className="block text-sm text-forge-300 mb-1">Table</label>
          <select
            value={tableOrQuery}
            onChange={(e) => { setTableOrQuery(e.target.value); setPreviewData(null); }}
            className="w-full px-3 py-2 text-sm bg-forge-850 border border-forge-700 rounded-md text-forge-50 focus:ring-1 focus:ring-amber-500/40"
          >
            <option value="">Select a table...</option>
            {tablesList.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {credentialId && dataset && queryType === 'query' && (
        <div>
          <label className="block text-sm text-forge-300 mb-1">SQL Query</label>
          <textarea
            value={tableOrQuery}
            onChange={(e) => { setTableOrQuery(e.target.value); setPreviewData(null); }}
            placeholder="SELECT * FROM `project.dataset.table` LIMIT 100"
            rows={3}
            className="w-full px-3 py-2 text-sm bg-forge-850 border border-forge-700 rounded-md text-forge-50 focus:ring-1 focus:ring-amber-500/40 font-mono"
          />
        </div>
      )}

      {/* Preview button */}
      {credentialId && tableOrQuery && (
        <Button variant="secondary" size="sm" onClick={handlePreview} isLoading={previewLoading}>
          Preview
        </Button>
      )}

      {previewError && (
        <p className="text-sm text-red-400">{previewError}</p>
      )}

      {/* Preview table */}
      {previewData && previewData.rows.length > 0 && (
        <div className="overflow-x-auto border border-forge-700 rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-forge-800/50">
                {previewData.columns.map((col) => (
                  <th key={col.name} className="px-3 py-2 text-left text-forge-400 font-medium">{col.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.rows.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-t border-forge-800/50 hover:bg-forge-800/30">
                  {previewData.columns.map((col) => (
                    <td key={col.name} className="px-3 py-1.5 text-forge-300 whitespace-nowrap max-w-[200px] truncate">
                      {String(row[col.name] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the bigquery API client has the functions we need**

Check `client/src/api/bigquery.ts` for `fetchBigQueryDatasets`, `fetchBigQueryTables`, and `previewBigQueryData`. The existing file exports these functions. If any names differ, adjust the import in the component to match. The preview function may be named `previewBigQuery` -- adjust accordingly.

- [ ] **Step 3: Verify typecheck passes**

Run: `cd client && npx tsc --noEmit`
Expected: No errors (fix any import name mismatches from step 2)

- [ ] **Step 4: Commit**

```bash
git add client/src/components/reference-tables/BigQuerySourceStep.tsx
git commit -m "feat: add BigQuerySourceStep component for reference table creation"
```

### Task 7: Create CreateReferenceTableModal component

**Files:**
- Create: `client/src/components/reference-tables/CreateReferenceTableModal.tsx`

- [ ] **Step 1: Create the 2-step wizard modal**

```typescript
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
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/reference-tables/CreateReferenceTableModal.tsx
git commit -m "feat: add CreateReferenceTableModal with manual, CSV, and BigQuery flows"
```

---

## Chunk 3: Inline Row Editing Grid

### Task 8: Create ReferenceTableGrid component

**Files:**
- Create: `client/src/components/reference-tables/ReferenceTableGrid.tsx`

- [ ] **Step 1: Create the inline grid component**

This component fetches the full table detail on mount, displays rows in AG Grid, and provides admin toolbar actions. It uses `useAuth()` to check admin role.

```typescript
import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz, colorSchemeDarkBlue } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, GridApi } from 'ag-grid-community';
import { Plus, Trash2, Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchReferenceTable,
  addReferenceTableRows,
  updateReferenceTableRow,
  deleteReferenceTableRow,
  importCsv,
  refreshFromBigQuery,
} from '@/api/reference-tables';
import type { ReferenceTableListItem } from '@mapforge/shared';
import toast from 'react-hot-toast';

interface ReferenceTableGridProps {
  table: ReferenceTableListItem;
}

export function ReferenceTableGrid({ table }: ReferenceTableGridProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const gridRef = useRef<GridApi | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['reference-tables', table.id],
    queryFn: () => fetchReferenceTable(table.id),
  });

  const { resolvedTheme } = useTheme();
  const agTheme = resolvedTheme === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz;

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!detail) return [];
    return detail.columns.map((col) => ({
        headerName: col.label,
        field: col.key,
        editable: isAdmin,
        flex: 1,
        minWidth: 100,
        valueGetter: (params: { data?: { data: Record<string, unknown> } }) =>
          params.data?.data?.[col.key] ?? '',
        valueSetter: (params: { data: { data: Record<string, unknown> }; newValue: unknown }) => {
          params.data.data = { ...params.data.data, [col.key]: params.newValue };
          return true;
        },
      }));
  }, [detail, isAdmin]);

  const rowData = useMemo(() => detail?.rows ?? [], [detail]);

  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const row = event.data;
    try {
      await updateReferenceTableRow(table.id, row.id, row.data);
    } catch {
      toast.error('Failed to save change');
      queryClient.invalidateQueries({ queryKey: ['reference-tables', table.id] });
    }
  }, [table.id, queryClient]);

  const handleAddRow = async () => {
    if (!detail) return;
    setActionLoading('add');
    try {
      const emptyData: Record<string, unknown> = {};
      detail.columns.forEach((col) => { emptyData[col.key] = ''; });
      await addReferenceTableRows(table.id, [{ data: emptyData }]);
      queryClient.invalidateQueries({ queryKey: ['reference-tables', table.id] });
      queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
      toast.success('Row added');
    } catch {
      toast.error('Failed to add row');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (!gridRef.current) return;
    const selected = gridRef.current.getSelectedRows();
    if (selected.length === 0) { toast.error('No rows selected'); return; }
    if (!confirm(`Delete ${selected.length} row(s)?`)) return;
    setActionLoading('delete');
    try {
      for (const row of selected) {
        await deleteReferenceTableRow(table.id, row.id);
      }
      queryClient.invalidateQueries({ queryKey: ['reference-tables', table.id] });
      queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
      toast.success(`${selected.length} row(s) deleted`);
    } catch {
      toast.error('Failed to delete rows');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importing will replace all existing rows. Continue?')) {
      e.target.value = '';
      return;
    }
    setActionLoading('import');
    try {
      await importCsv(table.id, file);
      queryClient.invalidateQueries({ queryKey: ['reference-tables', table.id] });
      queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
      toast.success('CSV imported');
    } catch {
      toast.error('Failed to import CSV');
    } finally {
      setActionLoading(null);
      e.target.value = '';
    }
  };

  const handleRefreshBigQuery = async () => {
    if (!confirm('Refresh will replace all rows from BigQuery. Continue?')) return;
    setActionLoading('refresh');
    try {
      await refreshFromBigQuery(table.id);
      queryClient.invalidateQueries({ queryKey: ['reference-tables', table.id] });
      queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
      toast.success('Refreshed from BigQuery');
    } catch {
      toast.error('Failed to refresh from BigQuery');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-6"><Spinner size="md" /></div>;
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={handleAddRow} isLoading={actionLoading === 'add'}>
            Add Row
          </Button>
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={handleDeleteSelected} isLoading={actionLoading === 'delete'}>
            Delete Selected
          </Button>
          <Button variant="ghost" size="sm" icon={<Upload size={14} />} onClick={() => fileInputRef.current?.click()} isLoading={actionLoading === 'import'}>
            Import CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
          {table.refreshSource === 'bigquery' && (
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={handleRefreshBigQuery} isLoading={actionLoading === 'refresh'}>
              Refresh from BigQuery
            </Button>
          )}
        </div>
      )}
      <div className="h-[300px] w-full">
        <AgGridReact
          theme={agTheme}
          columnDefs={columnDefs}
          rowData={rowData}
          rowSelection={isAdmin ? { mode: 'multiRow', headerCheckbox: true, checkboxes: true } : undefined}
          onGridReady={(e) => { gridRef.current = e.api; }}
          onCellValueChanged={isAdmin ? onCellValueChanged : undefined}
          suppressClickEdit={!isAdmin}
          domLayout="normal"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd client && npx tsc --noEmit`
Expected: No errors. If AG Grid imports differ (e.g., `GridApi` location), check `client/src/components/grid/EnrichmentGrid.tsx` for the correct import paths used in this project and adjust.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/reference-tables/ReferenceTableGrid.tsx
git commit -m "feat: add ReferenceTableGrid with inline editing and admin toolbar"
```

---

## Chunk 4: Refactor ReferenceTablesPage

### Task 9: Refactor ReferenceTablesPage to React Query and integrate new components

**Files:**
- Modify: `client/src/pages/ReferenceTablesPage.tsx`

- [ ] **Step 1: Rewrite the page**

Replace the entire contents of `client/src/pages/ReferenceTablesPage.tsx` with:

```typescript
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { ReferenceTableGrid } from '@/components/reference-tables/ReferenceTableGrid';
import { CreateReferenceTableModal } from '@/components/reference-tables/CreateReferenceTableModal';
import { useAuth } from '@/contexts/AuthContext';
import { fetchReferenceTables, deleteReferenceTable } from '@/api/reference-tables';
import toast from 'react-hot-toast';

export function ReferenceTablesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: tables = [], isLoading, error, refetch } = useQuery({
    queryKey: ['reference-tables'],
    queryFn: fetchReferenceTables,
    staleTime: 30_000,
  });

  return (
    <AppLayout title="Reference Tables">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-forge-400">
              Managed lookup tables for picklist columns and validation. {tables.length} table{tables.length !== 1 ? 's' : ''}.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
              Create Reference Table
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-sm text-red-400 mb-3">Failed to load reference tables.</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {!isLoading && !error && tables.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-lg bg-forge-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-forge-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
              </svg>
            </div>
            <p className="text-forge-400 text-sm">No reference tables yet.</p>
            {isAdmin && (
              <Button size="sm" variant="secondary" onClick={() => setShowCreate(true)}>
                Create your first reference table
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && tables.length > 0 && (
          <div className="space-y-2">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-forge-800/50 border border-forge-700 rounded-lg hover:border-forge-600 transition-all"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === table.id ? null : table.id)}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-forge-100">{table.name}</h3>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-forge-500">
                      <span>{table.columns.length} column{table.columns.length !== 1 ? 's' : ''}</span>
                      <span>{table.rowCount} row{table.rowCount !== 1 ? 's' : ''}</span>
                      <span>Source: {table.refreshSource}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {isAdmin && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`Delete reference table "${table.name}"?`)) return;
                          try {
                            await deleteReferenceTable(table.id);
                            queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
                            toast.success(`Deleted "${table.name}"`);
                          } catch {
                            toast.error('Failed to delete reference table');
                          }
                        }}
                        className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                      >
                        Delete
                      </button>
                    )}
                    <svg
                      className={`w-4 h-4 text-forge-500 transition-transform ${expanded === table.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
                {expanded === table.id && (
                  <div className="px-4 pb-4 border-t border-forge-700/50">
                    <div className="mt-3">
                      <div className="text-xs text-forge-400 mb-3">
                        <p>Created: {new Date(table.createdAt).toLocaleDateString()}</p>
                        {table.description && <p className="mt-1">{table.description}</p>}
                      </div>
                      <ReferenceTableGrid table={table} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateReferenceTableModal open={showCreate} onClose={() => setShowCreate(false)} />
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify the page renders**

Run: `npm run dev:client`
Navigate to the Reference Tables page. Verify:
- Page loads with React Query (no flash of stale data)
- "Create Reference Table" button appears for admin users
- Delete button only shows for admin users
- Clicking a table row expands it to show the AG Grid
- Modal opens when clicking "Create Reference Table"

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ReferenceTablesPage.tsx
git commit -m "feat: refactor ReferenceTablesPage with React Query, create modal, and inline grid"
```

---

## Chunk 5: Integration Testing & Polish

### Task 10: Manual integration testing

- [ ] **Step 1: Test Manual creation flow**

1. Log in as admin (use email containing "admin")
2. Go to Reference Tables page
3. Click "Create Reference Table"
4. Enter name "Test Manual Table", select "Manual"
5. Click Next
6. Add columns: key=`code`, label=`Code`, type=text; key=`name`, label=`Name`, type=text
7. Click Create
8. Verify table appears in list
9. Expand it and verify the grid shows the columns (empty)
10. Click "Add Row", fill in values, verify they save

- [ ] **Step 2: Test CSV creation flow**

1. Create a test CSV file with content:
```
code,name,region
US,United States,North America
CA,Canada,North America
MX,Mexico,North America
```
2. Click "Create Reference Table"
3. Enter name "Country Codes", select "CSV Upload"
4. Click Next
5. Drop or select the CSV file
6. Verify preview shows with row 0 highlighted as header
7. Click Create
8. Verify table appears with 3 rows
9. Expand and verify grid shows the data

- [ ] **Step 3: Test inline editing**

1. Expand a table
2. Click a cell, change its value, press Enter or click away
3. Verify the change persists (refresh page to confirm)
4. Select rows with checkboxes, click "Delete Selected"
5. Verify rows are removed

- [ ] **Step 4: Test CSV re-import**

1. Expand a table
2. Click "Import CSV" in the toolbar
3. Select a CSV file
4. Confirm the replacement warning
5. Verify rows are replaced with new data

- [ ] **Step 5: Test non-admin view**

1. Log in as non-admin user
2. Go to Reference Tables page
3. Verify "Create Reference Table" button is not visible
4. Verify "Delete" button is not visible
5. Expand a table -- grid should be read-only (no checkboxes, no toolbar, cells not editable)

- [ ] **Step 6: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: address integration testing feedback for reference tables"
```

### Task 11: Final typecheck and test run

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors across all workspaces

- [ ] **Step 2: Run existing tests**

Run: `npm run test`
Expected: All existing tests pass (no regressions)

- [ ] **Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve typecheck and test issues"
```
