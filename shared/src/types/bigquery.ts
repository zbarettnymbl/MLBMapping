export interface BigQueryConnectionConfig {
  gcpProject: string;
  dataset: string;
  tableOrQuery: string;
  queryType: 'table' | 'query';
  credentialId: string;
}

export interface BigQueryTestResult {
  success: boolean;
  error?: string;
  rowCount?: number;
  sampleColumns?: BigQueryColumnInfo[];
}

export interface BigQueryColumnInfo {
  name: string;
  type: string;
  mode: string;
}

export interface BigQueryPreviewResult {
  columns: BigQueryColumnInfo[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export interface BigQueryWriteConfig {
  gcpProject: string;
  dataset: string;
  tableName: string;
  writeMode: 'merge' | 'append' | 'overwrite';
  mergeKeyColumns?: string[];
  credentialId: string;
}

export interface BigQueryWriteResult {
  success: boolean;
  rowsWritten: number;
  error?: string;
}
