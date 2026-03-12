import type { CellError } from './classification';

export interface EnrichmentRecord {
  id: string;
  uniqueKey: Record<string, string>;
  sourceData: Record<string, unknown>;
  classifications: Record<string, string | null>;
  recordState: 'new' | 'existing' | 'changed' | 'removed';
  validationErrors: CellError[];
  isFullyClassified: boolean;
}

export interface RecordQueryParams {
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  filter?: 'all' | 'unclassified' | 'classified' | 'errors' | 'new';
  search?: string;
}

export interface PaginatedRecords {
  records: EnrichmentRecord[];
  total: number;
  page: number;
  pageSize: number;
  stats: import('./exercise').ExerciseStats;
}
