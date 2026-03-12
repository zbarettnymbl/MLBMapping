import { parse } from 'csv-parse/sync';
import type { ReferenceTableColumn } from '@mapforge/shared';

interface CsvImportResult {
  columns: ReferenceTableColumn[];
  rows: Array<{ data: Record<string, unknown>; ordinal: number }>;
}

export function parseCsvBuffer(buffer: Buffer): CsvImportResult {
  const content = buffer.toString('utf-8').trim();
  if (!content) return { columns: [], rows: [] };
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  if (records.length === 0) return { columns: [], rows: [] };
  const headers = Object.keys(records[0]);
  const columns: ReferenceTableColumn[] = headers.map(h => ({ key: h, label: h, type: 'text' as const }));
  const rows = records.map((record: Record<string, unknown>, i: number) => ({ data: record, ordinal: i + 1 }));
  return { columns, rows };
}
