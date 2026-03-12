import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { BigQueryColumnInfo, BigQueryTestResult, BigQueryPreviewResult, BigQueryWriteResult } from '@mapforge/shared';

interface BigQueryRow {
  f: Array<{ v: string | null }>;
}

interface BigQueryResponse {
  schema: { fields: BigQueryColumnInfo[] };
  totalRows: string;
  rows: BigQueryRow[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MOCK_DATA_DIR = join(__dirname, '../db/seeds/mock-bigquery');

const TABLE_FILE_MAP: Record<string, Record<string, string>> = {
  broadcast_data: {
    broadcast_programs: 'bigquery-response-programs.json',
    broadcast_schedule: 'bigquery-response-schedule.json',
  },
  development_data: {
    team_rosters: 'bigquery-response-rosters.json',
    player_development_stats: 'bigquery-response-dev-stats.json',
    venues: 'bigquery-response-venues.json',
    youth_programs: 'bigquery-response-youth.json',
    participation_metrics: 'bigquery-response-participation.json',
    international_events: 'bigquery-response-international.json',
  },
};

export class MockBigQueryService {
  private cache: Map<string, BigQueryResponse> = new Map();

  private loadTable(dataset: string, table: string): BigQueryResponse {
    const cacheKey = `${dataset}.${table}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const fileName = TABLE_FILE_MAP[dataset]?.[table];
    if (!fileName) throw new Error(`Table not found: ${dataset}.${table}`);

    const filePath = join(MOCK_DATA_DIR, fileName);
    const data: BigQueryResponse = JSON.parse(readFileSync(filePath, 'utf8'));
    this.cache.set(cacheKey, data);
    return data;
  }

  private flattenRows(response: BigQueryResponse): Record<string, unknown>[] {
    const fieldNames = response.schema.fields.map(f => f.name);
    return response.rows.map(row =>
      Object.fromEntries(row.f.map((cell, i) => [fieldNames[i], cell.v]))
    );
  }

  private extractTableFromQuery(query: string): { dataset: string; table: string } | null {
    const match = query.match(/FROM\s+`?(?:[\w-]+\.)?([\w-]+)\.([\w-]+)`?/i);
    if (match) return { dataset: match[1], table: match[2] };
    return null;
  }

  private extractLimitFromQuery(query: string): number | null {
    const match = query.match(/LIMIT\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  listDatasets(): string[] {
    return Object.keys(TABLE_FILE_MAP);
  }

  listTables(dataset: string): string[] {
    return Object.keys(TABLE_FILE_MAP[dataset] ?? {});
  }

  async testConnection(
    _project: string, dataset: string, tableOrQuery: string, queryType: 'table' | 'query'
  ): Promise<BigQueryTestResult> {
    try {
      let targetDataset = dataset;
      let targetTable = tableOrQuery;

      if (queryType === 'query') {
        const extracted = this.extractTableFromQuery(tableOrQuery);
        if (!extracted) return { success: false, error: 'Could not parse table from query' };
        targetDataset = extracted.dataset;
        targetTable = extracted.table;
      }

      const response = this.loadTable(targetDataset, targetTable);
      const sampleColumns = response.schema.fields.map(f => ({
        name: f.name, type: f.type, mode: f.mode,
      }));
      return { success: true, rowCount: parseInt(response.totalRows, 10), sampleColumns };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async getSchema(_project: string, dataset: string, table: string): Promise<BigQueryColumnInfo[]> {
    const response = this.loadTable(dataset, table);
    return response.schema.fields.map(f => ({
      name: f.name, type: f.type, mode: f.mode || 'NULLABLE',
    }));
  }

  async previewData(
    _project: string, dataset: string, tableOrQuery: string, queryType: 'table' | 'query', limit: number = 50
  ): Promise<BigQueryPreviewResult> {
    let targetDataset = dataset;
    let targetTable = tableOrQuery;

    if (queryType === 'query') {
      const extracted = this.extractTableFromQuery(tableOrQuery);
      if (!extracted) throw new Error('Could not parse table from query');
      targetDataset = extracted.dataset;
      targetTable = extracted.table;
      limit = this.extractLimitFromQuery(tableOrQuery) ?? limit;
    }

    const response = this.loadTable(targetDataset, targetTable);
    const allRows = this.flattenRows(response);
    const rows = allRows.slice(0, limit);
    const columns = response.schema.fields.map(f => ({
      name: f.name, type: f.type, mode: f.mode || 'NULLABLE',
    }));
    return { columns, rows, totalRows: parseInt(response.totalRows, 10) };
  }

  async executeQuery(query: string): Promise<Record<string, unknown>[]> {
    const extracted = this.extractTableFromQuery(query);
    if (!extracted) throw new Error('Could not parse table from query');

    const response = this.loadTable(extracted.dataset, extracted.table);
    const allRows = this.flattenRows(response);
    const limit = this.extractLimitFromQuery(query);
    return limit ? allRows.slice(0, limit) : allRows;
  }

  async writeRows(
    _project: string, _dataset: string, _tableName: string,
    rows: Record<string, unknown>[], _writeMode: 'merge' | 'append' | 'overwrite'
  ): Promise<BigQueryWriteResult> {
    return { success: true, rowsWritten: rows.length };
  }
}
