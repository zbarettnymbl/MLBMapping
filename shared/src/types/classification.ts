export interface CellError {
  columnKey: string;
  severity: 'error' | 'warning';
  message: string;
  ruleType: string;
}

export interface ClassificationPayload {
  values: Array<{ columnKey: string; value: string | null }>;
}

export interface ClassificationResult {
  validationErrors: CellError[];
  isFullyClassified: boolean;
  updatedStats: import('./exercise').ExerciseStats;
}

export interface BulkClassificationPayload {
  recordIds: string[];
  values: Array<{ columnKey: string; value: string | null }>;
}

export interface BulkClassificationResult {
  updatedCount: number;
  errors: Array<{ recordId: string; errors: CellError[] }>;
  updatedStats: import('./exercise').ExerciseStats;
}
