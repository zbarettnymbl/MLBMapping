export interface ReferenceTableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean';
  parentColumnKey?: string;
}

export interface ReferenceTableListItem {
  id: string;
  name: string;
  description: string | null;
  rowCount: number;
  columns: ReferenceTableColumn[];
  refreshSource: 'manual' | 'url' | 'sftp' | 'bigquery';
  lastRefreshedAt: string | null;
  createdAt: string;
}

export interface ReferenceTableDetail {
  id: string;
  name: string;
  description: string | null;
  columns: ReferenceTableColumn[];
  rows: ReferenceTableRow[];
  primaryKeyColumn: string | null;
  displayColumn: string | null;
  refreshSource: 'manual' | 'url' | 'sftp' | 'bigquery';
  refreshConfig: Record<string, unknown> | null;
  lastRefreshedAt: string | null;
}

export interface ReferenceTableRow {
  id: string;
  data: Record<string, unknown>;
  ordinal: number;
}

export interface CreateReferenceTablePayload {
  name: string;
  description?: string;
  columns: ReferenceTableColumn[];
  primaryKeyColumn?: string;
  displayColumn?: string;
}

export interface UpdateReferenceTablePayload {
  name?: string;
  description?: string;
  columns?: ReferenceTableColumn[];
  primaryKeyColumn?: string;
  displayColumn?: string;
}

export interface ReferenceTableVersion {
  id: string;
  referenceTableId: string;
  version: number;
  snapshot: { columns: ReferenceTableColumn[]; rows: ReferenceTableRow[] };
  createdAt: string;
  createdBy: string;
}
