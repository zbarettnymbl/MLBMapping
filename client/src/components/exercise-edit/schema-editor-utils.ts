import type { ColDef } from 'ag-grid-community';
import type { ExerciseDetail, ExerciseColumn } from '@mapforge/shared';
import type { BatchPermissionsResponse } from '@mapforge/shared';

// Fixed color palette for assignment dots
const ASSIGNMENT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function buildUserColorPalette(userIds: string[]): Map<string, string> {
  const palette = new Map<string, string>();
  userIds.forEach((id, index) => {
    palette.set(id, ASSIGNMENT_COLORS[index % ASSIGNMENT_COLORS.length]);
  });
  return palette;
}

export function buildAssignmentColorMap(
  permissions: BatchPermissionsResponse['permissions'],
  recordIds: string[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  // Initialize all records with empty arrays
  for (const id of recordIds) {
    map.set(id, []);
  }

  for (const perm of permissions) {
    if (!perm.manualRowOverrides?.include?.length) continue;

    const includeSet = new Set(perm.manualRowOverrides.include);
    for (const recordId of recordIds) {
      if (includeSet.has(recordId)) {
        const existing = map.get(recordId) || [];
        existing.push(perm.userId);
        map.set(recordId, existing);
      }
    }
  }

  return map;
}

export interface SchemaColumnDefOptions {
  onHeaderClick: (column: ExerciseColumn) => void;
}

export function buildSchemaColumnDefs(exercise: ExerciseDetail, options: SchemaColumnDefOptions): ColDef[] {
  const defs: ColDef[] = [];

  // Row number column
  defs.push({
    headerName: '#',
    valueGetter: (params) => params.node ? params.node.rowIndex! + 1 : '',
    width: 40,
    pinned: 'left',
    sortable: false,
    filter: false,
    suppressMovable: true,
    cellClass: 'text-xs text-muted-foreground text-center',
  });

  // Checkbox column
  defs.push({
    headerCheckboxSelection: true,
    checkboxSelection: true,
    width: 44,
    pinned: 'left',
    sortable: false,
    filter: false,
    suppressMovable: true,
    headerClass: 'ag-checkbox-header',
  });

  // Source columns (read-only, grey headers)
  for (const col of exercise.sourceColumns) {
    defs.push({
      headerName: col.label,
      field: `sourceData.${col.key}`,
      editable: false,
      sortable: true,
      filter: true,
      headerComponent: 'schemaColumnHeader',
      headerComponentParams: { exerciseColumn: col, onHeaderClick: options.onHeaderClick },
      headerClass: 'schema-source-header',
      cellClass: 'schema-source-cell',
    });
  }

  // Classification columns (editable, blue headers)
  const classificationCols = exercise.classificationColumns || [];
  classificationCols.forEach((col, index) => {
    const def: ColDef = {
      headerName: col.label,
      field: `classifications.${col.key}`,
      editable: true,
      sortable: true,
      filter: true,
      headerComponent: 'schemaColumnHeader',
      headerComponentParams: { exerciseColumn: col, onHeaderClick: options.onHeaderClick },
      headerClass: index === 0 ? 'schema-classification-header schema-separator-left' : 'schema-classification-header',
      cellClass: index === 0 ? 'schema-classification-cell schema-separator-left' : 'schema-classification-cell',
    };

    // Add cell editor based on data type
    switch (col.dataType) {
      case 'picklist':
        def.cellEditor = 'dependentPicklistEditor';
        def.cellEditorParams = { column: col };
        def.cellEditorPopup = true;
        break;
      case 'multi_select':
        def.cellEditor = 'multiSelectEditor';
        def.cellEditorParams = { column: col };
        def.cellEditorPopup = true;
        break;
      case 'number':
        def.cellEditor = 'agNumberCellEditor';
        break;
      case 'date':
        def.cellEditor = 'dateCellEditor';
        def.cellEditorParams = { column: col };
        def.cellEditorPopup = true;
        break;
      case 'boolean':
        def.cellEditor = 'booleanCellEditor';
        def.cellRenderer = 'booleanCellRenderer';
        break;
      default:
        def.cellEditor = 'agTextCellEditor';
        break;
    }

    defs.push(def);
  });

  // Assignment indicator column (pinned right)
  defs.push({
    headerName: 'Assigned',
    field: '_assignments',
    width: 60,
    pinned: 'right',
    sortable: false,
    filter: false,
    suppressMovable: true,
    cellRenderer: 'assignmentColorBar',
    headerClass: 'text-xs text-center',
  });

  return defs;
}
