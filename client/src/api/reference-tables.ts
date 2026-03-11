import { apiClient } from './client';
import type { ReferenceTableListItem, ReferenceTableDetail, CreateReferenceTablePayload, UpdateReferenceTablePayload, ReferenceTableVersion } from '@mapforge/shared';

export async function fetchReferenceTables(): Promise<ReferenceTableListItem[]> {
  const response = await apiClient.get<{ tables: ReferenceTableListItem[] }>('/reference-tables');
  return response.data.tables;
}

export async function fetchReferenceTable(id: string): Promise<ReferenceTableDetail> {
  const response = await apiClient.get<ReferenceTableDetail>(`/reference-tables/${id}`);
  return response.data;
}

export async function createReferenceTable(payload: CreateReferenceTablePayload): Promise<ReferenceTableListItem> {
  const response = await apiClient.post<ReferenceTableListItem>('/reference-tables', payload);
  return response.data;
}

export async function updateReferenceTable(id: string, payload: UpdateReferenceTablePayload): Promise<ReferenceTableListItem> {
  const response = await apiClient.put<ReferenceTableListItem>(`/reference-tables/${id}`, payload);
  return response.data;
}

export async function deleteReferenceTable(id: string): Promise<void> {
  await apiClient.delete(`/reference-tables/${id}`);
}

export async function addReferenceTableRows(id: string, rows: Array<{ data: Record<string, unknown> }>): Promise<void> {
  await apiClient.post(`/reference-tables/${id}/rows`, { rows });
}

export async function updateReferenceTableRow(tableId: string, rowId: string, data: Record<string, unknown>): Promise<void> {
  await apiClient.put(`/reference-tables/${tableId}/rows/${rowId}`, { data });
}

export async function deleteReferenceTableRow(tableId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/reference-tables/${tableId}/rows/${rowId}`);
}

export async function importCsv(id: string, file: File): Promise<{ imported: number }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<{ imported: number }>(`/reference-tables/${id}/import-csv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function refreshFromBigQuery(id: string): Promise<{ rowCount: number }> {
  const response = await apiClient.post<{ rowCount: number }>(`/reference-tables/${id}/refresh-bigquery`);
  return response.data;
}

export async function fetchReferenceTableVersions(id: string): Promise<ReferenceTableVersion[]> {
  const response = await apiClient.get<{ versions: ReferenceTableVersion[] }>(`/reference-tables/${id}/versions`);
  return response.data.versions;
}

export async function fetchFilteredValues(id: string, filterColumn: string, filterValue: string, valueColumn: string): Promise<string[]> {
  const response = await apiClient.get<{ values: string[] }>(`/reference-tables/${id}/values`, {
    params: { filterColumn, filterValue, valueColumn },
  });
  return response.data.values;
}

export async function fetchReferenceTableValues(tableId: string, params: { filterColumn: string; filterValue: string; valueColumn: string }): Promise<{ values: string[] }> {
  const response = await apiClient.get<{ values: string[] }>(`/reference-tables/${tableId}/values`, { params });
  return response.data;
}
