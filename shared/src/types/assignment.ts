// Assignment types

export interface ExerciseAssignment {
  id: string;
  userId: string;
  exerciseId: string;
  role: 'editor' | 'viewer';
  assignedBy: string | null;
  assignedAt: string;
  userName: string;
  userEmail: string;
}

export interface AssignmentPermissions {
  id: string;
  assignmentId: string;
  allowedColumnIds: string[] | null;
  rowFilter: RowFilter | null;
  manualRowOverrides: ManualRowOverrides | null;
}

export interface RowFilter {
  conditions: RowFilterCondition[];
  logic: 'and' | 'or';
}

export interface RowFilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'is_null' | 'is_not_null';
  value?: string;
  values?: string[];
}

export interface ManualRowOverrides {
  include: string[];
  exclude: string[];
}

export interface BulkAssignRequest {
  users: Array<{ userId: string; role: 'editor' | 'viewer' }>;
}

export interface BulkAssignResponse {
  created: ExerciseAssignment[];
  skipped: Array<{ userId: string; reason: string }>;
}

export interface NotifyRequest {
  type: 'assignment' | 'reminder' | 'custom';
  message?: string;
}

export interface StatusTransitionRequest {
  status: string;
}

export interface SourceConfig {
  gcpProject: string;
  dataset: string;
  tableOrQuery: string;
  queryType: 'table' | 'query';
  credentialId: string | null;
  refreshSchedule: string | null;
}

export type ExerciseStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface BatchPermissionsResponse {
  permissions: Array<{
    assignmentId: string;
    userId: string;
    allowedColumnIds: string[] | null;
    rowFilter: RowFilter | null;
    manualRowOverrides: ManualRowOverrides | null;
  }>;
}

export interface AddColumnRequest {
  key: string;
  label: string;
  description?: string;
  dataType: string;
  columnRole: 'classification';
  required?: boolean;
  defaultValue?: string | null;
  config?: Record<string, unknown>;
  referenceLink?: Record<string, unknown> | null;
  dependentConfig?: Record<string, unknown> | null;
  ordinal?: number;
}
