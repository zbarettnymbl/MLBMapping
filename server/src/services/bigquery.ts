import { BigQuery } from '@google-cloud/bigquery';
import type { BigQueryColumnInfo, BigQueryTestResult, BigQueryPreviewResult, BigQueryWriteResult } from '@mapforge/shared';

export class BigQueryService {
  private client: BigQuery;

  constructor(credentialJson: string) {
    const credentials = JSON.parse(credentialJson);
    this.client = new BigQuery({
      projectId: credentials.project_id,
      credentials,
    });
  }

  async testConnection(
    project: string, dataset: string, tableOrQuery: string, queryType: 'table' | 'query'
  ): Promise<BigQueryTestResult> {
    try {
      const query = queryType === 'table'
        ? `SELECT * FROM \`${project}.${dataset}.${tableOrQuery}\` LIMIT 1`
        : `${tableOrQuery} LIMIT 1`;
      const [rows] = await this.client.query({ query, location: 'US' });
      const columns = rows.length > 0
        ? Object.keys(rows[0]).map(name => ({ name, type: 'STRING', mode: 'NULLABLE' }))
        : [];
      return { success: true, rowCount: rows.length, sampleColumns: columns };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async getSchema(project: string, dataset: string, table: string): Promise<BigQueryColumnInfo[]> {
    const [metadata] = await this.client.dataset(dataset).table(table).getMetadata();
    const fields = metadata.schema?.fields ?? [];
    return fields.map((f: { name: string; type: string; mode: string }) => ({
      name: f.name, type: f.type, mode: f.mode || 'NULLABLE',
    }));
  }

  async previewData(
    project: string, dataset: string, tableOrQuery: string, queryType: 'table' | 'query', limit: number = 50
  ): Promise<BigQueryPreviewResult> {
    const query = queryType === 'table'
      ? `SELECT * FROM \`${project}.${dataset}.${tableOrQuery}\` LIMIT ${limit}`
      : tableOrQuery.replace(/;\s*$/, '') + ` LIMIT ${limit}`;
    const [rows] = await this.client.query({ query, location: 'US' });
    const columns: BigQueryColumnInfo[] = rows.length > 0
      ? Object.keys(rows[0]).map(name => ({ name, type: 'STRING', mode: 'NULLABLE' }))
      : [];
    return { columns, rows, totalRows: rows.length };
  }

  async executeQuery(query: string): Promise<Record<string, unknown>[]> {
    const [rows] = await this.client.query({ query, location: 'US' });
    return rows;
  }

  async writeRows(
    project: string, dataset: string, tableName: string,
    rows: Record<string, unknown>[], writeMode: 'merge' | 'append' | 'overwrite'
  ): Promise<BigQueryWriteResult> {
    try {
      await this.client.dataset(dataset).table(tableName).insert(rows);
      return { success: true, rowsWritten: rows.length };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, rowsWritten: 0, error: message };
    }
  }
}
