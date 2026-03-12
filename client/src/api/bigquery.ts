import { apiClient } from './client';
import type { BigQueryConnectionConfig, BigQueryTestResult, BigQueryPreviewResult, BigQueryColumnInfo, BigQueryWriteResult } from '@mapforge/shared';

export async function testBigQueryConnection(config: BigQueryConnectionConfig): Promise<BigQueryTestResult> {
  const response = await apiClient.post<BigQueryTestResult>('/bigquery/test-connection', config);
  return response.data;
}

export async function previewBigQueryData(config: BigQueryConnectionConfig & { limit?: number }): Promise<BigQueryPreviewResult> {
  const response = await apiClient.post<BigQueryPreviewResult>('/bigquery/preview', config);
  return response.data;
}

export async function fetchBigQuerySchema(config: { gcpProject: string; dataset: string; table: string; credentialId: string }): Promise<BigQueryColumnInfo[]> {
  const response = await apiClient.post<{ columns: BigQueryColumnInfo[] }>('/bigquery/schema', config);
  return response.data.columns;
}

export async function exportToBigQuery(exerciseId: string): Promise<BigQueryWriteResult> {
  const response = await apiClient.post<BigQueryWriteResult>(`/bigquery/export/${exerciseId}`);
  return response.data;
}

export async function fetchBigQueryDatasets(credentialId: string): Promise<{ gcpProject: string; datasets: string[] }> {
  const response = await apiClient.get<{ gcpProject: string; datasets: string[] }>('/bigquery/datasets', {
    params: { credentialId },
  });
  return response.data;
}

export async function fetchBigQueryTables(credentialId: string, dataset: string): Promise<string[]> {
  const response = await apiClient.get<{ tables: string[] }>('/bigquery/tables', {
    params: { credentialId, dataset },
  });
  return response.data.tables;
}
