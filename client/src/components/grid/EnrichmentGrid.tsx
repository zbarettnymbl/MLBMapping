// client/src/components/grid/EnrichmentGrid.tsx
import { useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz, colorSchemeDarkBlue } from 'ag-grid-community';
import type { CellValueChangedEvent, GridReadyEvent, GridApi, TabToNextCellParams, CellPosition } from 'ag-grid-community';
import { buildColumnDefs } from './buildColumnDefs';
import { RowStatusRenderer } from './RowStatusRenderer';
import { SourceColumnHeader } from './SourceColumnHeader';
import { ClassificationColumnHeader } from './ClassificationColumnHeader';
import { ValidationCellRenderer } from './ValidationCellRenderer';
import { DependentPicklistEditor } from './DependentPicklistEditor';
import { MultiSelectEditor } from './MultiSelectEditor';
import { DateCellEditor } from './DateCellEditor';
import { BooleanCellRenderer } from './BooleanCellRenderer';
import { BooleanCellEditor } from './BooleanCellEditor';
import { validateCell } from '../../services/validation';
import type {
  ExerciseDetail,
  EnrichmentRecord,
  ExerciseStats,
  ClassificationPayload,
} from '@mapforge/shared/types';
import './grid.css';

interface EnrichmentGridProps {
  exercise: ExerciseDetail;
  records: EnrichmentRecord[];
  stats: ExerciseStats;
  onClassify: (recordId: string, values: ClassificationPayload) => void;
  onSelectionChanged: (selectedIds: string[]) => void;
  selectedIds: Set<string>;
}

export function EnrichmentGrid({
  exercise,
  records,
  onClassify,
  onSelectionChanged,
}: EnrichmentGridProps) {
  const { resolvedTheme } = useTheme();
  const agTheme = resolvedTheme === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz;

  const gridRef = useRef<GridApi | null>(null);

  const columnDefs = useMemo(() => buildColumnDefs(exercise), [exercise]);

  const components = useMemo(
    () => ({
      rowStatusRenderer: RowStatusRenderer,
      sourceColumnHeader: SourceColumnHeader,
      classificationColumnHeader: ClassificationColumnHeader,
      validationCellRenderer: ValidationCellRenderer,
      dependentPicklistEditor: DependentPicklistEditor,
      multiSelectEditor: MultiSelectEditor,
      dateCellEditor: DateCellEditor,
      booleanCellRenderer: BooleanCellRenderer,
      booleanCellEditor: BooleanCellEditor,
    }),
    []
  );

  const onGridReady = useCallback((event: GridReadyEvent) => {
    gridRef.current = event.api;
  }, []);

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      const record = event.data as EnrichmentRecord;
      const field = event.colDef.field as string;
      if (!field.startsWith('classifications.')) return;

      const columnKey = field.replace('classifications.', '');
      const column = exercise.classificationColumns.find((c: { key: string }) => c.key === columnKey);
      if (!column) return;

      // Client-side validation for instant feedback
      const errors = validateCell(event.newValue, column, record);
      // Merge client errors into record (AG Grid will re-render via refreshCells)
      const otherErrors = record.validationErrors.filter((e: { columnKey: string }) => e.columnKey !== columnKey);
      record.validationErrors = [...otherErrors, ...errors];

      if (gridRef.current) {
        gridRef.current.refreshCells({
          rowNodes: [event.node],
          force: true,
        });
      }

      // Trigger auto-save
      onClassify(record.id, { values: [{ columnKey, value: event.newValue }] });
    },
    [exercise.classificationColumns, onClassify]
  );

  const handleSelectionChanged = useCallback(() => {
    if (!gridRef.current) return;
    const selected = gridRef.current.getSelectedRows() as EnrichmentRecord[];
    onSelectionChanged(selected.map((r) => r.id));
  }, [onSelectionChanged]);

  const tabToNextCell = useCallback(
    (params: TabToNextCellParams): CellPosition | boolean => {
      const { nextCellPosition } = params;
      if (!nextCellPosition) return false;

      return nextCellPosition;
    },
    []
  );

  return (
    <div className={`flex-1 ${resolvedTheme === 'dark' ? 'ag-theme-quartz-dark-blue' : 'ag-theme-quartz'}`}>
      <AgGridReact
        theme={agTheme}
        columnDefs={columnDefs}
        rowData={records}
        components={components}
        getRowId={(params) => params.data.id}
        rowHeight={32}
        headerHeight={36}
        rowSelection={{
          mode: 'multiRow',
          headerCheckbox: true,
          checkboxes: true,
          enableClickSelection: false,
        }}
        animateRows={true}
        pagination={false}
        domLayout="normal"
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        rowClassRules={{
          'row-new': (params) => params.data?.recordState === 'new',
          'row-changed': (params) => params.data?.recordState === 'changed',
          'row-error': (params) => (params.data?.validationErrors?.length ?? 0) > 0,
          'row-classified': (params) => params.data?.isFullyClassified === true,
        }}
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        onSelectionChanged={handleSelectionChanged}
        tabToNextCell={tabToNextCell}
      />
    </div>
  );
}
