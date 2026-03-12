export type RecordState = 'new' | 'existing' | 'changed' | 'removed' | 'archived';

export interface SyncResult {
  exerciseId: string;
  startedAt: string;
  completedAt: string;
  newRecords: number;
  existingRecords: number;
  changedRecords: number;
  removedRecords: number;
  totalSourceRows: number;
  errors: string[];
}

export interface SchemaDriftReport {
  exerciseId: string;
  addedColumns: string[];
  removedColumns: string[];
  typeChanges: Array<{ column: string; oldType: string; newType: string }>;
  hasDrift: boolean;
}

export interface SyncStatus {
  exerciseId: string;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  schedule: string | null;
  isRunning: boolean;
}
