import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useExerciseAssignments,
  useBatchPermissions,
  useExerciseRecords,
  useUpdatePermissions,
} from '@/hooks/useExerciseEdit';
import { SchemaColumnHeader } from './SchemaColumnHeader';
import { AssignmentColorBar } from './AssignmentColorBar';
import { AssignmentContextMenu } from './AssignmentContextMenu';
import { AssignmentSummaryDropdown } from './AssignmentSummaryDropdown';
import { ColumnConfigPanel } from './ColumnConfigPanel';
import { buildSchemaColumnDefs, buildAssignmentColorMap, buildUserColorPalette } from './schema-editor-utils';
import type { ExerciseDetail, ExerciseColumn } from '@mapforge/shared';
import type { CellContextMenuEvent, SelectionChangedEvent } from 'ag-grid-community';

// Import existing cell editors for classification columns
import { DependentPicklistEditor } from '@/components/grid/DependentPicklistEditor';
import { MultiSelectEditor } from '@/components/grid/MultiSelectEditor';
import { DateCellEditor } from '@/components/grid/DateCellEditor';
import { BooleanCellRenderer } from '@/components/grid/BooleanCellRenderer';
import { BooleanCellEditor } from '@/components/grid/BooleanCellEditor';

interface SchemaEditorGridProps {
  exerciseId: string;
  exercise: ExerciseDetail;
}

export function SchemaEditorGrid({ exerciseId, exercise }: SchemaEditorGridProps) {
  const gridRef = useRef<AgGridReact>(null);

  // Data fetching
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const { data: recordsData, isLoading: loadingRecords } = useExerciseRecords(exerciseId, page, pageSize);
  const { data: assignments } = useExerciseAssignments(exerciseId);
  const { data: batchPerms } = useBatchPermissions(exerciseId);
  const updatePermissions = useUpdatePermissions(exerciseId);

  // Local state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [configPanel, setConfigPanel] = useState<{ open: boolean; column: ExerciseColumn | null }>({ open: false, column: null });
  const [assignmentColorMap, setAssignmentColorMap] = useState<Map<string, string[]>>(new Map());

  // Build color palette from assignments
  const userColorPalette = useMemo(() => {
    const userIds = (assignments || []).map(a => a.userId);
    return buildUserColorPalette(userIds);
  }, [assignments]);

  const userNames = useMemo(() => {
    const map = new Map<string, string>();
    (assignments || []).forEach(a => map.set(a.userId, a.userName));
    return map;
  }, [assignments]);

  // Build assignment color map from permissions + current records
  useEffect(() => {
    if (!batchPerms || !recordsData) return;
    const recordIds = (recordsData.records || []).map((r: any) => r.id);
    const map = buildAssignmentColorMap(batchPerms.permissions, recordIds);
    setAssignmentColorMap(map);
  }, [batchPerms, recordsData]);

  // Permission row counts for summary dropdown
  const permissionRowCounts = useMemo(() => {
    const counts = new Map<string, number | null>();
    if (!batchPerms) return counts;
    for (const perm of batchPerms.permissions) {
      if (perm.manualRowOverrides?.include?.length) {
        counts.set(perm.userId, perm.manualRowOverrides.include.length);
      } else {
        counts.set(perm.userId, null); // null = all rows
      }
    }
    return counts;
  }, [batchPerms]);

  // Column defs
  const columnDefs = useMemo(() => {
    return buildSchemaColumnDefs(exercise, {
      onHeaderClick: (col) => setConfigPanel({ open: true, column: col }),
    });
  }, [exercise]);

  // AG Grid components
  const components = useMemo(() => ({
    schemaColumnHeader: SchemaColumnHeader,
    assignmentColorBar: (params: any) => (
      <AssignmentColorBar {...params} assignmentColorMap={assignmentColorMap} userColorPalette={userColorPalette} userNames={userNames} />
    ),
    dependentPicklistEditor: DependentPicklistEditor,
    multiSelectEditor: MultiSelectEditor,
    dateCellEditor: DateCellEditor,
    booleanCellRenderer: BooleanCellRenderer,
    booleanCellEditor: BooleanCellEditor,
  }), [assignmentColorMap, userColorPalette, userNames]);

  // Event handlers
  const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    const selected = event.api.getSelectedRows();
    setSelectedRowIds(new Set(selected.map((r: any) => r.id)));
  }, []);

  const onCellContextMenu = useCallback((event: CellContextMenuEvent) => {
    event.event?.preventDefault();
    const mouseEvent = event.event as MouseEvent;
    setContextMenu({ x: mouseEvent.clientX, y: mouseEvent.clientY, visible: true });
  }, []);

  // Assignment handlers
  const handleAssign = useCallback((assignmentId: string, userId: string) => {
    const newMap = new Map(assignmentColorMap);
    for (const recordId of selectedRowIds) {
      const existing = newMap.get(recordId) || [];
      if (!existing.includes(userId)) {
        newMap.set(recordId, [...existing, userId]);
      }
    }
    setAssignmentColorMap(newMap);

    // Find existing manual overrides and merge
    const perm = batchPerms?.permissions.find(p => p.assignmentId === assignmentId);
    const existingIncludes = perm?.manualRowOverrides?.include || [];
    const mergedIncludes = Array.from(new Set([...existingIncludes, ...selectedRowIds]));

    updatePermissions.mutate({
      assignmentId,
      permissions: {
        manualRowOverrides: { include: mergedIncludes, exclude: perm?.manualRowOverrides?.exclude || [] },
      },
    });
    gridRef.current?.api?.refreshCells({ force: true });
  }, [assignmentColorMap, selectedRowIds, batchPerms, updatePermissions]);

  const handleUnassign = useCallback((assignmentId: string, userId: string) => {
    const newMap = new Map(assignmentColorMap);
    for (const recordId of selectedRowIds) {
      const existing = newMap.get(recordId) || [];
      newMap.set(recordId, existing.filter(id => id !== userId));
    }
    setAssignmentColorMap(newMap);

    const perm = batchPerms?.permissions.find(p => p.assignmentId === assignmentId);
    const existingIncludes = perm?.manualRowOverrides?.include || [];
    const filtered = existingIncludes.filter((id: string) => !selectedRowIds.has(id));

    updatePermissions.mutate({
      assignmentId,
      permissions: {
        manualRowOverrides: { include: filtered, exclude: perm?.manualRowOverrides?.exclude || [] },
      },
    });
    gridRef.current?.api?.refreshCells({ force: true });
  }, [assignmentColorMap, selectedRowIds, batchPerms, updatePermissions]);

  const records = recordsData?.records || [];
  const total = recordsData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const sourceCount = exercise.sourceColumns.length;
  const classCount = exercise.classificationColumns.length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setConfigPanel({ open: true, column: null })}>
            <Plus className="h-4 w-4 mr-1" /> Add Column
          </Button>
          <span className="text-xs text-muted-foreground">
            {sourceCount} source, {classCount} classification
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AssignmentSummaryDropdown
            exerciseId={exerciseId}
            userColorPalette={userColorPalette}
            permissionRowCounts={permissionRowCounts}
            onAdvancedClick={() => {}}
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Rows {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button variant="ghost" size="sm" className="h-6 px-1" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 ag-theme-quartz">
        <AgGridReact
          ref={gridRef}
          rowData={records}
          columnDefs={columnDefs}
          components={components}
          rowSelection={{
            mode: 'multiRow',
            checkboxes: true,
            enableClickSelection: false,
          }}
          rowHeight={32}
          headerHeight={36}
          onSelectionChanged={onSelectionChanged}
          onCellContextMenu={onCellContextMenu}
          getRowId={(params) => params.data.id}
          loading={loadingRecords}
          suppressContextMenu
        />
      </div>

      {/* Context menu */}
      <AssignmentContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        assignments={assignments || []}
        selectedRowIds={selectedRowIds}
        assignmentColorMap={assignmentColorMap}
        userColorPalette={userColorPalette}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
      />

      {/* Column config panel */}
      {configPanel.open && (
        <ColumnConfigPanel
          exerciseId={exerciseId}
          exercise={exercise}
          column={configPanel.column}
          onClose={() => setConfigPanel({ open: false, column: null })}
        />
      )}
    </div>
  );
}
