// client/src/components/grid/buildColumnDefs.ts
import type { ColDef } from 'ag-grid-community';
import type { ExerciseDetail } from '@mapforge/shared/types';

export function buildColumnDefs(exercise: ExerciseDetail): ColDef[] {
  const cols: ColDef[] = [];

  // 1. Row status column (pinned left)
  cols.push({
    headerName: '',
    field: '__status',
    width: 44,
    pinned: 'left',
    cellRenderer: 'rowStatusRenderer',
    suppressMovable: true,
    lockPosition: true,
    sortable: false,
    filter: false,
    resizable: false,
  });

  // 2. Source columns (read-only)
  for (const col of exercise.sourceColumns.filter((c) => c.visible)) {
    cols.push({
      headerName: col.label,
      field: `sourceData.${col.key}`,
      editable: false,
      sortable: true,
      filter: true,
      resizable: true,
      cellClass: 'source-cell',
      headerClass: 'source-header',
      headerComponent: 'sourceColumnHeader',
      headerComponentParams: { exerciseColumn: col },
    });
  }

  // 3. Visual separator column
  cols.push({
    headerName: '',
    width: 4,
    suppressMovable: true,
    lockPosition: true,
    cellClass: 'separator-cell',
    headerClass: 'separator-header',
    resizable: false,
    sortable: false,
    filter: false,
  });

  // 4. Classification columns (editable, unless computed)
  for (const col of exercise.classificationColumns.filter((c) => c.visible)) {
    const isEditable = col.columnRole === 'classification';
    const colDef: ColDef = {
      headerName: col.label,
      field: `classifications.${col.key}`,
      editable: isEditable,
      sortable: true,
      filter: true,
      resizable: true,
      cellClass: isEditable ? 'classification-cell' : 'source-cell',
      headerClass: 'classification-header',
      headerComponent: 'classificationColumnHeader',
      headerComponentParams: { exerciseColumn: col },
    };

    if (isEditable) {
      // Cell editor based on data type
      switch (col.dataType) {
        case 'picklist':
          colDef.cellEditor = 'dependentPicklistEditor';
          colDef.cellEditorParams = { exerciseColumn: col };
          colDef.cellEditorPopup = true;
          break;
        case 'multi_select':
          colDef.cellEditor = 'multiSelectEditor';
          colDef.cellEditorParams = { exerciseColumn: col };
          colDef.cellEditorPopup = true;
          break;
        case 'number':
          colDef.cellEditor = 'agNumberCellEditor';
          colDef.cellEditorParams = {
            min: col.config.minValue,
            max: col.config.maxValue,
          };
          break;
        case 'date':
          colDef.cellEditor = 'dateCellEditor';
          colDef.cellEditorParams = { exerciseColumn: col };
          colDef.cellEditorPopup = true;
          break;
        case 'boolean':
          colDef.cellEditor = 'booleanCellEditor';
          colDef.cellRenderer = 'booleanCellRenderer';
          break;
        case 'text':
        default:
          colDef.cellEditor = 'agTextCellEditor';
          break;
      }

      // Validation renderer (except for boolean which has its own renderer)
      if (col.dataType !== 'boolean') {
        colDef.cellRenderer = 'validationCellRenderer';
        colDef.cellRendererParams = { exerciseColumn: col };
      }
    }

    cols.push(colDef);
  }

  return cols;
}
