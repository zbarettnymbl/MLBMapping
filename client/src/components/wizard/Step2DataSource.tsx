import { useState, useEffect } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { fetchCredentials } from '@/api/credentials';
import {
  testBigQueryConnection,
  previewBigQueryData,
  fetchBigQueryDatasets,
  fetchBigQueryTables,
} from '@/api/bigquery';
import { apiClient } from '@/api/client';
import type { CredentialMetadata, BigQueryPreviewResult } from '@mapforge/shared';

export function Step2DataSource() {
  const {
    dataSource,
    setDataSource,
    setSourceColumns,
    setUniqueKeyColumns,
    uniqueKeyColumns,
    exerciseId,
    nextStep,
  } = useExerciseWizardStore();
  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);
  const [credentialId, setCredentialId] = useState(
    dataSource.connectionConfig?.credentialId || ''
  );
  const [gcpProject, setGcpProject] = useState(
    dataSource.connectionConfig?.gcpProject || ''
  );
  const [dataset, setDataset] = useState(
    dataSource.connectionConfig?.dataset || ''
  );
  const [tableOrQuery, setTableOrQuery] = useState(
    dataSource.connectionConfig?.tableOrQuery || ''
  );
  const [queryType, setQueryType] = useState<'table' | 'query'>(
    dataSource.connectionConfig?.queryType || 'table'
  );
  const [schedule, setSchedule] = useState(dataSource.refreshSchedule || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [preview, setPreview] = useState<BigQueryPreviewResult | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(uniqueKeyColumns);

  // Cascading dropdown state
  const [datasets, setDatasets] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  useEffect(() => {
    fetchCredentials()
      .then(setCredentials)
      .catch(() => {});
  }, []);

  // When credential changes, fetch datasets and auto-fill project
  useEffect(() => {
    if (!credentialId) {
      setDatasets([]);
      setTables([]);
      setGcpProject('');
      setDataset('');
      setTableOrQuery('');
      return;
    }
    setLoadingDatasets(true);
    setDatasets([]);
    setTables([]);
    setDataset('');
    setTableOrQuery('');
    fetchBigQueryDatasets(credentialId)
      .then((result) => {
        setGcpProject(result.gcpProject);
        setDatasets(result.datasets);
      })
      .catch(() => {
        setDatasets([]);
      })
      .finally(() => setLoadingDatasets(false));
  }, [credentialId]);

  // When dataset changes, fetch tables
  useEffect(() => {
    if (!credentialId || !dataset) {
      setTables([]);
      setTableOrQuery('');
      return;
    }
    setLoadingTables(true);
    setTables([]);
    if (queryType === 'table') {
      setTableOrQuery('');
    }
    fetchBigQueryTables(credentialId, dataset)
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
  }, [credentialId, dataset, queryType]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testBigQueryConnection({
        gcpProject,
        dataset,
        tableOrQuery,
        queryType,
        credentialId,
      });
      if (result.success) {
        setTestResult('Connection successful');
        setDataSource({
          isConnected: true,
          connectionConfig: {
            gcpProject,
            dataset,
            tableOrQuery,
            queryType,
            credentialId,
          },
        });
        const previewResult = await previewBigQueryData({
          gcpProject,
          dataset,
          tableOrQuery,
          queryType,
          credentialId,
          limit: 10,
        });
        setPreview(previewResult);
        setSourceColumns(
          previewResult.columns.map((c, i) => ({
            key: c.name,
            label: c.name,
            originalType: c.type,
            visible: true,
            ordinal: i,
          }))
        );
      } else {
        setTestResult(`Failed: ${result.error}`);
      }
    } catch {
      setTestResult('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (exerciseId) {
      await apiClient.post(`/exercises/${exerciseId}/source-config`, {
        gcpProject,
        dataset,
        tableOrQuery,
        queryType,
        credentialId,
        refreshSchedule: schedule || null,
      });
      setUniqueKeyColumns(selectedKeys);
      await apiClient.put(`/exercises/${exerciseId}`, {
        uniqueKeyColumns: selectedKeys,
      });
    }
    setDataSource({
      connectionConfig: {
        gcpProject,
        dataset,
        tableOrQuery,
        queryType,
        credentialId,
      },
      refreshSchedule: schedule || null,
    });
    nextStep();
  };

  const toggleKey = (col: string) => {
    setSelectedKeys((prev) =>
      prev.includes(col) ? prev.filter((k) => k !== col) : [...prev, col]
    );
  };

  const selectClass =
    'w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-forge-100">
        Data Source Configuration
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Credential */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-forge-300 mb-1">
            Credential
          </label>
          <select
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
            className={selectClass}
          >
            <option value="">Select credential...</option>
            {credentials.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* GCP Project (read-only, auto-filled from credential) */}
        <div>
          <label className="block text-sm font-medium text-forge-300 mb-1">
            GCP Project
          </label>
          <input
            type="text"
            value={gcpProject}
            readOnly
            className={`${selectClass} opacity-70 cursor-not-allowed`}
            placeholder={credentialId ? 'Loading...' : 'Select a credential first'}
          />
        </div>

        {/* Dataset dropdown */}
        <div>
          <label className="block text-sm font-medium text-forge-300 mb-1">
            Dataset
          </label>
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value)}
            disabled={!credentialId || loadingDatasets}
            className={`${selectClass} disabled:opacity-50`}
          >
            <option value="">
              {loadingDatasets
                ? 'Loading datasets...'
                : !credentialId
                  ? 'Select a credential first'
                  : 'Select dataset...'}
            </option>
            {datasets.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Source Type */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-forge-300 mb-1">
            Source Type
          </label>
          <div className="flex gap-4 mb-2">
            {(['table', 'query'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="queryType"
                  value={t}
                  checked={queryType === t}
                  onChange={() => setQueryType(t)}
                  className="text-amber-500"
                />
                <span className="text-forge-200 capitalize">{t}</span>
              </label>
            ))}
          </div>

          {/* Table dropdown or SQL textarea */}
          {queryType === 'table' ? (
            <select
              value={tableOrQuery}
              onChange={(e) => setTableOrQuery(e.target.value)}
              disabled={!dataset || loadingTables}
              className={`${selectClass} disabled:opacity-50`}
            >
              <option value="">
                {loadingTables
                  ? 'Loading tables...'
                  : !dataset
                    ? 'Select a dataset first'
                    : 'Select table...'}
              </option>
              {tables.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              value={tableOrQuery}
              onChange={(e) => setTableOrQuery(e.target.value)}
              placeholder="SELECT * FROM ..."
              className={`${selectClass} h-24 resize-none font-mono text-sm`}
            />
          )}
        </div>

        {/* Refresh Schedule */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-forge-300 mb-1">
            Refresh Schedule
          </label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className={selectClass}
          >
            <option value="">Manual only</option>
            <option value="0 * * * *">Hourly</option>
            <option value="0 0 * * *">Daily</option>
            <option value="0 0 * * 1">Weekly</option>
          </select>
        </div>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleTest}
          disabled={
            testing || !credentialId || !gcpProject || !dataset || !tableOrQuery
          }
          className="px-4 py-2 bg-forge-700 text-forge-100 rounded-md hover:bg-forge-600 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        {testResult && (
          <span
            className={
              testResult.includes('successful')
                ? 'text-emerald-400'
                : 'text-red-400'
            }
          >
            {testResult}
          </span>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-forge-200">
            Preview ({preview.totalRows} rows)
          </h3>
          <div className="space-y-2">
            <p className="text-sm text-forge-400">
              Select unique key columns:
            </p>
            <div className="flex flex-wrap gap-2">
              {preview.columns.map((col) => (
                <label
                  key={col.name}
                  className="flex items-center gap-1.5 px-2 py-1 bg-forge-800 rounded border border-forge-600 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(col.name)}
                    onChange={() => toggleKey(col.name)}
                    className="text-amber-500"
                  />
                  <span className="text-sm text-forge-200">{col.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto border border-forge-700 rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-forge-800">
                  {preview.columns.map((c) => (
                    <th
                      key={c.name}
                      className="px-3 py-2 text-left text-forge-300 font-medium"
                    >
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-forge-700">
                    {preview.columns.map((c) => (
                      <td key={c.name} className="px-3 py-2 text-forge-200">
                        {String(row[c.name] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!dataSource.isConnected && !preview}
        className="px-4 py-2 bg-amber-500 text-forge-900 rounded-md font-medium hover:bg-amber-400 disabled:opacity-50"
      >
        Save & Continue
      </button>
    </div>
  );
}
