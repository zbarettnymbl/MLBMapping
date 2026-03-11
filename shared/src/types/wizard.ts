import type { BigQueryConnectionConfig } from './bigquery';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface WizardExerciseInfo {
  name: string;
  description: string;
  viewMode: 'flat' | 'matrix';
}

export interface WizardDataSource {
  connectionConfig: BigQueryConnectionConfig | null;
  refreshSchedule: string | null;
  isConnected: boolean;
  previewRows: Record<string, unknown>[];
}

export interface WizardSourceColumn {
  key: string;
  label: string;
  originalType: string;
  visible: boolean;
  ordinal: number;
}

export interface WizardClassificationColumn {
  key: string;
  label: string;
  description: string;
  dataType: string;
  required: boolean;
  defaultValue: string | null;
  config: Record<string, unknown>;
  referenceLink: Record<string, unknown> | null;
  dependentConfig: Record<string, unknown> | null;
  ordinal: number;
}

export interface WizardUserAssignment {
  userId: string;
  email: string;
  name: string;
  role: 'editor' | 'viewer';
}

export interface WizardValidationRule {
  id: string;
  type: 'required' | 'cross_column' | 'custom';
  config: Record<string, unknown>;
  severity: 'error' | 'warning';
  message: string;
  targetColumnKey: string;
}
