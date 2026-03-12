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
  } | null) => void;
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
          onChange={(e) => { setCredentialId(e.target.value); setDataset(''); setTableOrQuery(''); setPreviewData(null); onConfigured(null); }}
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
            onChange={(e) => { setDataset(e.target.value); setTableOrQuery(''); setPreviewData(null); onConfigured(null); }}
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
            onClick={() => { setQueryType('table'); setTableOrQuery(''); setPreviewData(null); onConfigured(null); }}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              queryType === 'table' ? 'bg-amber-600 text-forge-950 font-semibold' : 'bg-forge-800 text-forge-300 hover:bg-forge-750'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => { setQueryType('query'); setTableOrQuery(''); setPreviewData(null); onConfigured(null); }}
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
            onChange={(e) => { setTableOrQuery(e.target.value); setPreviewData(null); onConfigured(null); }}
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
            onChange={(e) => { setTableOrQuery(e.target.value); setPreviewData(null); onConfigured(null); }}
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
