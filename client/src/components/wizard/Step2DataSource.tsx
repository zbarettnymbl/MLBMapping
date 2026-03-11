import { useState, useEffect } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { fetchCredentials } from '@/api/credentials';
import { testBigQueryConnection, previewBigQueryData } from '@/api/bigquery';
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

  useEffect(() => {
    fetchCredentials()
      .then(setCredentials)
      .catch(() => {});
  }, []);

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-forge-100">
        Data Source Configuration
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-forge-300 mb-1">
            Credential
          </label>
          <select
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
            className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100"
          >
            <option value="">Select credential...</option>
            {credentials.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-forge-300 mb-1">
            GCP Project
          </label>
          <input
            type="text"
            value={gcpProject}
            onChange={(e) => setGcpProject(e.target.value)}
            className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-forge-300 mb-1">
            Dataset
          </label>
          <input
            type="text"
            value={dataset}
            onChange={(e) => setDataset(e.target.value)}
            className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100"
          />
        </div>
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
          {queryType === 'table' ? (
            <input
              type="text"
              value={tableOrQuery}
              onChange={(e) => setTableOrQuery(e.target.value)}
              placeholder="Table name"
              className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100"
            />
          ) : (
            <textarea
              value={tableOrQuery}
              onChange={(e) => setTableOrQuery(e.target.value)}
              placeholder="SELECT * FROM ..."
              className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100 h-24 resize-none font-mono text-sm"
            />
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-forge-300 mb-1">
            Refresh Schedule
          </label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100"
          >
            <option value="">Manual only</option>
            <option value="0 * * * *">Hourly</option>
            <option value="0 0 * * *">Daily</option>
            <option value="0 0 * * 1">Weekly</option>
          </select>
        </div>
      </div>
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
