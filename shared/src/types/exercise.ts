export interface ExerciseListItem {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  totalRecords: number;
  classifiedRecords: number;
  errorCount: number;
  lastUpdatedAt: string;
  deadline: string | null;
  hasNewRecords: boolean;
  newRecordCount: number;
  columnStats: ColumnStat[];
}

export interface ColumnStat {
  columnKey: string;
  label: string;
  filledCount: number;
  totalCount: number;
  percentage: number;
}

export interface ExerciseDetail {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  viewMode: 'flat' | 'matrix';
  sourceColumns: ExerciseColumn[];
  classificationColumns: ExerciseColumn[];
  deadline: string | null;
  lastRefreshedAt: string;
}

export interface ExerciseColumn {
  id: string;
  key: string;
  label: string;
  description: string | null;
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'picklist' | 'multi_select';
  columnRole: 'source' | 'classification' | 'computed';
  required: boolean;
  defaultValue: string | null;
  config: ColumnConfig;
  validationRules: ValidationRule[];
  referenceLink: ReferenceLink | null;
  dependentConfig: DependentPicklistConfig | null;
  visible: boolean;
  ordinal: number;
}

export interface ColumnConfig {
  picklistValues?: string[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  regexPattern?: string;
  dateFormat?: string;
  minDate?: string;
  maxDate?: string;
}

export interface DependentPicklistConfig {
  parentColumnKey: string;
  referenceTableId: string;
  parentReferenceColumn: string;
  childReferenceColumn: string;
}

export interface ReferenceLink {
  referenceTableId: string;
  referenceColumnKey: string;
  displayColumnKey: string;
}

export interface ValidationRule {
  type: 'required' | 'enum' | 'range' | 'date_range' | 'regex' | 'dependent' | 'relational';
  config: Record<string, unknown>;
  severity: 'error' | 'warning';
  message: string;
}

export interface ExerciseStats {
  totalRecords: number;
  classifiedRecords: number;
  unclassifiedRecords: number;
  errorCount: number;
  warningCount: number;
  newRecordCount: number;
  completionPercentage: number;
  columnStats: ColumnStat[];
}
